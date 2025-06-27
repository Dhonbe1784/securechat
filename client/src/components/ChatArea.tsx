import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Phone, Video, Info, Paperclip, Smile, Send, Lock, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChatAreaProps {
  userId: string;
  conversationId: number | null;
  onVoiceCall: () => void;
  onVideoCall: () => void;
  onConversationSettings: () => void;
  sendWebSocketMessage: (message: any) => void;
}

export default function ChatArea({
  userId,
  conversationId,
  onVoiceCall,
  onVideoCall,
  onConversationSettings,
  sendWebSocketMessage
}: ChatAreaProps) {
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get conversation details
  const { data: conversations = [] } = useQuery({
    queryKey: ["/api/conversations"],
  });

  const currentConversation = conversations.find((conv: any) => conv.id === conversationId);

  // Get messages for current conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: [`/api/conversations/${conversationId}/messages`],
    enabled: !!conversationId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!conversationId) throw new Error("No conversation selected");
      return await apiRequest("POST", `/api/conversations/${conversationId}/messages`, {
        content,
        messageType: "text",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}/messages`] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setMessageText("");
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // The WebSocket message handling is done in the parent component
  // We just need to refresh queries when messages change
  useEffect(() => {
    // Refresh messages when conversation changes
    if (conversationId) {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}/messages`] });
    }
  }, [conversationId, queryClient]);

  const handleSendMessage = () => {
    const trimmedMessage = messageText.trim();
    if (!trimmedMessage || !conversationId) return;
    
    sendMessageMutation.mutate(trimmedMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    if (firstName) {
      return firstName.charAt(0).toUpperCase();
    }
    return "U";
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center text-gray-500">
            <Lock className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Your messages are secure</h3>
            <p className="text-sm">End-to-end encrypted. Only you and the recipient can read them.</p>
            <p className="text-sm mt-2">Select a conversation to start chatting.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={currentConversation?.otherUser?.profileImageUrl} />
              <AvatarFallback className="bg-gray-300 text-gray-600">
                {getInitials(currentConversation?.otherUser?.firstName, currentConversation?.otherUser?.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">
              {currentConversation?.otherUser?.firstName} {currentConversation?.otherUser?.lastName}
            </h2>
            <p className="text-sm text-gray-500 flex items-center">
              <Lock className="h-3 w-3 mr-1" />
              End-to-end encrypted • online
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onVoiceCall}
            className="text-gray-500 hover:text-secondary"
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onVideoCall}
            className="text-gray-500 hover:text-accent"
          >
            <Video className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              toast({
                title: "Conversation Info",
                description: `Encrypted conversation with ${currentConversation?.otherUser?.firstName} ${currentConversation?.otherUser?.lastName}. All messages are end-to-end encrypted.`,
              });
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <Info className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onConversationSettings}
            className="text-gray-500 hover:text-gray-700"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 scrollbar-thin">
        {messagesLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-start">
                <div className="max-w-xs bg-gray-200 rounded-lg p-3 animate-pulse">
                  <div className="h-4 bg-gray-300 rounded mb-2" />
                  <div className="h-3 bg-gray-300 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Start the conversation</h3>
              <p className="text-sm">
                Send your first message to {currentConversation?.otherUser?.firstName}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message: any) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.senderId === userId ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm",
                    message.senderId === userId
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-white text-gray-900 rounded-bl-none"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs opacity-70">
                      {formatTime(message.createdAt)}
                    </span>
                    {message.encrypted && (
                      <Lock className="h-3 w-3 opacity-70" />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="text-gray-500">
            <Paperclip className="h-4 w-4" />
          </Button>
          <div className="flex-1 relative">
            <Input
              placeholder="Type a message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sendMessageMutation.isPending}
              className="pr-12"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sendMessageMutation.isPending}
            className="shrink-0"
          >
            {sendMessageMutation.isPending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
