import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Settings, Search, Plus, User, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatSidebarProps {
  userId: string;
  selectedConversationId: number | null;
  onConversationSelect: (id: number) => void;
  onNewChatClick: () => void;
  websocketConnected: boolean;
}

export default function ChatSidebar({
  userId,
  selectedConversationId,
  onConversationSelect,
  onNewChatClick,
  websocketConnected
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/conversations"],
    refetchInterval: 5000, // Refresh every 5 seconds for better real-time updates
  });

  // Force refresh conversations when websocket connects
  useEffect(() => {
    if (websocketConnected) {
      refetch();
    }
  }, [websocketConnected, refetch]);

  const filteredConversations = conversations.filter((conv: any) =>
    conv.otherUser?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.otherUser?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
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

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">SecureChat</h1>
          <div className="flex items-center space-x-2">
            <div className={cn(
              "w-3 h-3 rounded-full",
              websocketConnected ? "bg-green-500" : "bg-red-500"
            )} title={websocketConnected ? "Connected" : "Disconnected"} />
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-2">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-3 rounded-lg bg-gray-100 animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 rounded mb-2" />
                      <div className="h-3 bg-gray-300 rounded w-3/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs">Start a new chat to begin</p>
            </div>
          ) : (
            filteredConversations.map((conversation: any) => (
              <div
                key={conversation.id}
                onClick={() => onConversationSelect(conversation.id)}
                className={cn(
                  "p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors",
                  selectedConversationId === conversation.id && "bg-blue-50 border-l-4 border-primary"
                )}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conversation.otherUser?.profileImageUrl} />
                      <AvatarFallback className="bg-gray-300 text-gray-600">
                        {getInitials(conversation.otherUser?.firstName, conversation.otherUser?.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 truncate">
                        {conversation.otherUser?.firstName} {conversation.otherUser?.lastName}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {conversation.lastMessage?.createdAt && formatTime(conversation.lastMessage.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {conversation.lastMessage?.content || "No messages yet"}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-4 border-t border-gray-200">
        <Button onClick={onNewChatClick} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>
    </div>
  );
}
