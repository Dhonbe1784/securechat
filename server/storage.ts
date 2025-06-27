import {
  users,
  contacts,
  conversations,
  messages,
  callLogs,
  type User,
  type UpsertUser,
  type Contact,
  type InsertContact,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type CallLog,
  type InsertCallLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, ilike, isNotNull, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  searchUsersByEmail(email: string): Promise<User[]>;
  
  // Contact operations
  getContacts(userId: string): Promise<Contact[]>;
  addContact(contact: InsertContact): Promise<Contact>;
  updateContactStatus(contactId: number, status: string): Promise<Contact | undefined>;
  
  // Conversation operations
  getConversations(userId: string): Promise<(Conversation & { otherUser: User; lastMessage?: Message })[]>;
  getOrCreateConversation(participant1Id: string, participant2Id: string): Promise<Conversation>;
  updateConversationClearSettings(conversationId: number, autoClearAfter: string): Promise<Conversation | undefined>;
  clearConversationMessages(conversationId: number): Promise<void>;
  getConversationsToClean(): Promise<Conversation[]>;
  
  // Message operations
  getMessages(conversationId: number, limit?: number): Promise<(Message & { sender: User })[]>;
  addMessage(message: InsertMessage): Promise<Message>;
  
  // Call log operations
  getCallLogs(userId: string): Promise<(CallLog & { caller: User; receiver: User })[]>;
  addCallLog(callLog: InsertCallLog): Promise<CallLog>;
  updateCallLog(id: number, updates: Partial<CallLog>): Promise<CallLog | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async searchUsersByEmail(email: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(ilike(users.email, `%${email}%`))
      .limit(10);
  }

  async getContacts(userId: string): Promise<Contact[]> {
    return await db
      .select()
      .from(contacts)
      .where(eq(contacts.userId, userId));
  }

  async addContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db
      .insert(contacts)
      .values(contact)
      .returning();
    return newContact;
  }

  async updateContactStatus(contactId: number, status: string): Promise<Contact | undefined> {
    const [updatedContact] = await db
      .update(contacts)
      .set({ status })
      .where(eq(contacts.id, contactId))
      .returning();
    return updatedContact;
  }

  async getConversations(userId: string): Promise<(Conversation & { otherUser: User; lastMessage?: Message })[]> {
    const userConversations = await db
      .select({
        conversation: conversations,
        otherUser: users,
        lastMessage: messages,
      })
      .from(conversations)
      .leftJoin(
        users,
        or(
          and(eq(conversations.participant1Id, userId), eq(users.id, conversations.participant2Id)),
          and(eq(conversations.participant2Id, userId), eq(users.id, conversations.participant1Id))
        )
      )
      .leftJoin(messages, eq(messages.conversationId, conversations.id))
      .where(
        or(
          eq(conversations.participant1Id, userId),
          eq(conversations.participant2Id, userId)
        )
      )
      .orderBy(desc(conversations.lastMessageAt));

    // Group by conversation and get the latest message
    const conversationMap = new Map();
    userConversations.forEach(row => {
      const convId = row.conversation.id;
      if (!conversationMap.has(convId) || 
          (row.lastMessage && row.lastMessage.createdAt > conversationMap.get(convId).lastMessage?.createdAt)) {
        conversationMap.set(convId, {
          ...row.conversation,
          otherUser: row.otherUser,
          lastMessage: row.lastMessage
        });
      }
    });

    return Array.from(conversationMap.values());
  }

  async getOrCreateConversation(participant1Id: string, participant2Id: string): Promise<Conversation> {
    // Check if conversation already exists
    const [existingConversation] = await db
      .select()
      .from(conversations)
      .where(
        or(
          and(eq(conversations.participant1Id, participant1Id), eq(conversations.participant2Id, participant2Id)),
          and(eq(conversations.participant1Id, participant2Id), eq(conversations.participant2Id, participant1Id))
        )
      );

    if (existingConversation) {
      return existingConversation;
    }

    // Create new conversation
    const [newConversation] = await db
      .insert(conversations)
      .values({
        participant1Id,
        participant2Id,
      })
      .returning();

    return newConversation;
  }

  async getMessages(conversationId: number, limit = 50): Promise<(Message & { sender: User })[]> {
    return await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))
      .limit(limit)
      .then((rows) => 
        rows.map(row => ({
          ...row.message,
          sender: row.sender
        }))
      );
  }

  async addMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();

    // Update conversation's last message timestamp
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, message.conversationId));

    return newMessage;
  }

  async getCallLogs(userId: string): Promise<(CallLog & { caller: User; receiver: User })[]> {
    return await db
      .select({
        callLog: callLogs,
        caller: users,
        receiver: users,
      })
      .from(callLogs)
      .innerJoin(users, eq(callLogs.callerId, users.id))
      .innerJoin(users, eq(callLogs.receiverId, users.id))
      .where(
        or(
          eq(callLogs.callerId, userId),
          eq(callLogs.receiverId, userId)
        )
      )
      .orderBy(desc(callLogs.startedAt))
      .then((rows) => 
        rows.map(row => ({
          ...row.callLog,
          caller: row.caller,
          receiver: row.receiver
        }))
      );
  }

  async addCallLog(callLog: InsertCallLog): Promise<CallLog> {
    const [newCallLog] = await db
      .insert(callLogs)
      .values(callLog)
      .returning();
    return newCallLog;
  }

  async updateCallLog(id: number, updates: Partial<CallLog>): Promise<CallLog | undefined> {
    const [updatedCallLog] = await db
      .update(callLogs)
      .set(updates)
      .where(eq(callLogs.id, id))
      .returning();
    return updatedCallLog;
  }

  // Conversation clearing operations
  async updateConversationClearSettings(conversationId: number, autoClearAfter: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .update(conversations)
      .set({ autoClearAfter })
      .where(eq(conversations.id, conversationId))
      .returning();
    return conversation;
  }

  async clearConversationMessages(conversationId: number): Promise<void> {
    await db
      .delete(messages)
      .where(eq(messages.conversationId, conversationId));
    
    // Update last cleared timestamp
    await db
      .update(conversations)
      .set({ lastClearedAt: new Date() })
      .where(eq(conversations.id, conversationId));
  }

  async getConversationsToClean(): Promise<Conversation[]> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return await db
      .select()
      .from(conversations)
      .where(
        or(
          and(
            eq(conversations.autoClearAfter, "24h"),
            sql`${conversations.lastMessageAt} < ${oneDayAgo.toISOString()}`
          ),
          and(
            eq(conversations.autoClearAfter, "1week"),
            sql`${conversations.lastMessageAt} < ${oneWeekAgo.toISOString()}`
          ),
          and(
            eq(conversations.autoClearAfter, "30days"),
            sql`${conversations.lastMessageAt} < ${thirtyDaysAgo.toISOString()}`
          )
        )
      );
  }
}

export const storage = new DatabaseStorage();
