import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useQueryClient } from "@tanstack/react-query";
import ChatSidebar from "@/components/ChatSidebar";
import ChatArea from "@/components/ChatArea";
import CallModal from "@/components/CallModal";
import VideoCallModal from "@/components/VideoCallModal";
import ContactModal from "@/components/ContactModal";
import IncomingCallModal from "@/components/IncomingCallModal";
import ConversationSettingsModal from "@/components/ConversationSettingsModal";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Home() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isVideoCallModalOpen, setIsVideoCallModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isConversationSettingsOpen, setIsConversationSettingsOpen] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{type: 'voice' | 'video', fromUserId: string, conversationId: number} | null>(null);

  const { isConnected, sendMessage, lastMessage } = useWebSocket();
  const queryClient = useQueryClient();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Redirecting to login...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Handle WebSocket messages for real-time updates
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'new-message' || lastMessage.type === 'broadcast') {
        // Refresh conversations list to show new messages
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        
        // If the message is for the currently selected conversation, refresh messages
        if (lastMessage.conversationId === selectedConversationId) {
          queryClient.invalidateQueries({ 
            queryKey: [`/api/conversations/${selectedConversationId}/messages`] 
          });
        }
      }
      
      // Handle incoming call
      if (lastMessage.type === 'call-start') {
        const callType = lastMessage.data?.callType === 'video' ? 'video' : 'voice';
        setIncomingCall({
          type: callType,
          fromUserId: lastMessage.from,
          conversationId: lastMessage.conversationId
        });
      }
      
      // Handle call end
      if (lastMessage.type === 'call-end') {
        setIncomingCall(null);
        setIsCallModalOpen(false);
        setIsVideoCallModalOpen(false);
      }
    }
  }, [lastMessage, queryClient, selectedConversationId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your secure chat...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-50">
      <div className="flex h-full">
        <ChatSidebar
          userId={user.id}
          selectedConversationId={selectedConversationId}
          onConversationSelect={setSelectedConversationId}
          onNewChatClick={() => setIsContactModalOpen(true)}
          websocketConnected={isConnected}
        />
        
        <ChatArea
          userId={user.id}
          conversationId={selectedConversationId}
          onVoiceCall={() => {
            setIsIncomingCall(false);
            setIsCallModalOpen(true);
          }}
          onVideoCall={() => {
            setIsIncomingCall(false);
            setIsVideoCallModalOpen(true);
          }}
          onConversationSettings={() => setIsConversationSettingsOpen(true)}
          sendWebSocketMessage={sendMessage}
        />
      </div>

      {/* Modals */}
      <CallModal
        isOpen={isCallModalOpen}
        onClose={() => {
          setIsCallModalOpen(false);
          setIsIncomingCall(false);
        }}
        conversationId={selectedConversationId}
        userId={user.id}
        sendWebSocketMessage={sendMessage}
        isIncomingCall={isIncomingCall}
      />

      <VideoCallModal
        isOpen={isVideoCallModalOpen}
        onClose={() => {
          setIsVideoCallModalOpen(false);
          setIsIncomingCall(false);
        }}
        conversationId={selectedConversationId}
        userId={user.id}
        sendWebSocketMessage={sendMessage}
        isIncomingCall={isIncomingCall}
      />

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        userId={user.id}
      />

      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          isOpen={!!incomingCall}
          callType={incomingCall.type}
          fromUserId={incomingCall.fromUserId}
          conversationId={incomingCall.conversationId}
          onAccept={() => {
            setSelectedConversationId(incomingCall.conversationId);
            setIsIncomingCall(true);
            if (incomingCall.type === 'video') {
              setIsVideoCallModalOpen(true);
            } else {
              setIsCallModalOpen(true);
            }
            setIncomingCall(null);
          }}
          onReject={() => setIncomingCall(null)}
          sendWebSocketMessage={sendMessage}
        />
      )}

      {/* Conversation Settings Modal */}
      <ConversationSettingsModal
        isOpen={isConversationSettingsOpen}
        onClose={() => setIsConversationSettingsOpen(false)}
        conversationId={selectedConversationId}
      />
    </div>
  );
}
