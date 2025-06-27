import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertContactSchema, insertMessageSchema, insertCallLogSchema } from "@shared/schema";
import { z } from "zod";

interface WebSocketWithUser extends WebSocket {
  userId?: string;
}

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-start' | 'call-end' | 'call-accept' | 'call-reject';
  target: string;
  data: any;
  conversationId?: number;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Contact routes
  app.get('/api/contacts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contacts = await storage.getContacts(userId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.post('/api/contacts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contactData = insertContactSchema.parse({
        ...req.body,
        userId,
      });
      
      const contact = await storage.addContact(contactData);
      res.json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid contact data", errors: error.errors });
      } else {
        console.error("Error adding contact:", error);
        res.status(500).json({ message: "Failed to add contact" });
      }
    }
  });

  // Conversation routes
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { participantId } = req.body;
      
      if (!participantId) {
        return res.status(400).json({ message: "Participant ID is required" });
      }
      
      const conversation = await storage.getOrCreateConversation(userId, participantId);
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // Message routes
  app.get('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit) || 50;
      
      const messages = await storage.getMessages(conversationId, limit);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = parseInt(req.params.id);
      
      const messageData = insertMessageSchema.parse({
        ...req.body,
        conversationId,
        senderId: userId,
      });
      
      const message = await storage.addMessage(messageData);
      
      // Broadcast message to WebSocket clients
      broadcastMessage(conversationId, {
        type: 'new-message',
        data: message
      });
      
      res.json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid message data", errors: error.errors });
      } else {
        console.error("Error sending message:", error);
        res.status(500).json({ message: "Failed to send message" });
      }
    }
  });

  // Call log routes
  app.get('/api/call-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const callLogs = await storage.getCallLogs(userId);
      res.json(callLogs);
    } catch (error) {
      console.error("Error fetching call logs:", error);
      res.status(500).json({ message: "Failed to fetch call logs" });
    }
  });

  app.post('/api/call-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const callLogData = insertCallLogSchema.parse({
        ...req.body,
        callerId: userId,
      });
      
      const callLog = await storage.addCallLog(callLogData);
      res.json(callLog);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid call log data", errors: error.errors });
      } else {
        console.error("Error creating call log:", error);
        res.status(500).json({ message: "Failed to create call log" });
      }
    }
  });

  // User search route
  app.get('/api/users/search', isAuthenticated, async (req: any, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      // Search for users by email
      const searchResults = await storage.searchUsersByEmail(q.toString());
      res.json(searchResults);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // Conversation clearing endpoints
  app.put('/api/conversations/:id/clear-settings', isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { autoClearAfter } = req.body;
      
      if (!['24h', '1week', '30days', 'never'].includes(autoClearAfter)) {
        return res.status(400).json({ message: 'Invalid auto clear setting' });
      }
      
      const conversation = await storage.updateConversationClearSettings(conversationId, autoClearAfter);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      res.json(conversation);
    } catch (error) {
      console.error('Error updating conversation clear settings:', error);
      res.status(500).json({ message: 'Failed to update settings' });
    }
  });

  app.delete('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      await storage.clearConversationMessages(conversationId);
      res.json({ message: 'Messages cleared successfully' });
    } catch (error) {
      console.error('Error clearing conversation messages:', error);
      res.status(500).json({ message: 'Failed to clear messages' });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time signaling
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const connectedClients = new Map<string, WebSocketWithUser>();

  wss.on('connection', (ws: WebSocketWithUser, req) => {
    console.log('New WebSocket connection');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString()) as SignalingMessage & { userId?: string };
        
        // Handle authentication
        if (data.userId && !data.type) {
          ws.userId = data.userId;
          connectedClients.set(data.userId, ws);
          console.log(`User ${data.userId} connected via WebSocket`);
          return;
        }
        
        if (data.type === 'auth' && data.userId) {
          ws.userId = data.userId;
          connectedClients.set(data.userId, ws);
          console.log(`User ${data.userId} connected via WebSocket`);
          return;
        }

        // Handle signaling messages
        if (ws.userId && data.target) {
          console.log(`Handling ${data.type} message from ${ws.userId} to ${data.target}`);
          const targetWs = connectedClients.get(data.target);
          
          if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            const messageToSend = {
              ...data,
              from: ws.userId
            };
            targetWs.send(JSON.stringify(messageToSend));
            console.log(`✓ Message forwarded to ${data.target}`);
          } else {
            console.log(`✗ Target user ${data.target} not connected or WebSocket not open`);
            console.log(`Connected clients: ${Array.from(connectedClients.keys()).join(', ')}`);
          }
        } else {
          console.log(`Invalid message: userId=${ws.userId}, target=${data.target}`);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (ws.userId) {
        connectedClients.delete(ws.userId);
        console.log(`User ${ws.userId} disconnected from WebSocket`);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  function broadcastMessage(conversationId: number, message: any) {
    connectedClients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'broadcast',
          conversationId,
          ...message
        }));
      }
    });
  }

  return httpServer;
}
