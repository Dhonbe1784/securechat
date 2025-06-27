import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { cn } from "@/lib/utils";

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number | null;
  userId: string;
  sendWebSocketMessage: (message: any) => void;
  isIncomingCall?: boolean;
}

export default function CallModal({
  isOpen,
  onClose,
  conversationId,
  userId,
  sendWebSocketMessage,
  isIncomingCall = false
}: CallModalProps) {
  console.log('🔄 CallModal render:', { isOpen, conversationId, userId, isIncomingCall });
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [callDuration, setCallDuration] = useState(0);
  const callInitiatedRef = useRef(false);

  // Get conversation details to find the target user
  const { data: conversations = [] } = useQuery({
    queryKey: ["/api/conversations"],
  });

  const currentConversation = conversations.find((conv: any) => conv.id === conversationId);
  const targetUserId = currentConversation?.otherUser?.id;

  const {
    localStream,
    remoteStream,
    isConnected,
    startCall,
    endCall,
    toggleMute,
    handleSignalingMessage,
    error
  } = useWebRTC({
    isVideoCall: false,
    sendSignalingMessage: sendWebSocketMessage,
    targetUserId,
    onConnectionStateChange: (state) => {
      if (state === 'connected') {
        setCallStatus('connected');
      } else if (state === 'disconnected') {
        setCallStatus('ended');
        setTimeout(onClose, 1000);
      }
    }
  });

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  // Manual call initiation function
  const initiateCall = () => {
    if (!callInitiatedRef.current && conversationId && targetUserId) {
      callInitiatedRef.current = true;
      console.log('Manually starting call');
      
      setCallStatus('connecting');
      setCallDuration(0);
      
      // Start WebRTC
      startCall();
      
      // For outgoing calls, send WebSocket signal
      if (!isIncomingCall) {
        console.log('Sending call signal to:', targetUserId);
        sendWebSocketMessage({
          type: 'call-start',
          target: targetUserId,
          conversationId,
          data: { callType: 'voice' }
        });
      }
    }
  };

  // Reset call state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCallStatus('connecting');
      setCallDuration(0);
    } else {
      callInitiatedRef.current = false;
    }
  }, [isOpen]);

  // Listen for WebSocket signaling messages
  useEffect(() => {
    const handleWebSocketMessage = (event: Event) => {
      try {
        const customEvent = event as CustomEvent;
        const data = JSON.parse(customEvent.detail);
        console.log('Received WebSocket message in call:', data);
        
        if (data.type && ['offer', 'answer', 'ice-candidate'].includes(data.type)) {
          console.log('Handling WebRTC signaling message:', data.type);
          handleSignalingMessage(data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message for call:', error);
      }
    };

    window.addEventListener('websocket-message', handleWebSocketMessage as EventListener);
    return () => window.removeEventListener('websocket-message', handleWebSocketMessage as EventListener);
  }, [handleSignalingMessage]);

  const handleEndCall = () => {
    endCall();
    setCallStatus('ended');
    
    // Send call end signal via WebSocket
    if (conversationId && targetUserId) {
      sendWebSocketMessage({
        type: 'call-end',
        target: targetUserId,
        conversationId,
        data: { callType: 'voice' }
      });
    }
    
    onClose();
  };

  const handleToggleMute = () => {
    toggleMute();
    setIsMuted(!isMuted);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return formatDuration(callDuration);
      case 'ended':
        return 'Call ended';
      default:
        return 'Calling...';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto">
            <Avatar className="h-20 w-20 mx-auto">
              <AvatarFallback className="bg-gray-300 text-gray-600 text-2xl">
                U
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {currentConversation?.otherUser?.firstName} {currentConversation?.otherUser?.lastName}
            </h3>
            <p className={cn(
              "text-sm",
              callStatus === 'connected' ? "text-green-600" : "text-gray-500"
            )}>
              {getStatusText()}
            </p>
          </div>
        </DialogHeader>

        {/* Call Status Indicator */}
        <div className="flex justify-center mb-6">
          <div className={cn(
            "w-4 h-4 rounded-full",
            callStatus === 'connected' ? "bg-green-500 animate-pulse" : "bg-gray-400"
          )} />
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-center text-sm text-red-600 mb-4">
            {error}
          </div>
        )}

        {/* Call Controls */}
        <div className="flex justify-center space-x-4">
          {/* Show Start Call button for outgoing calls that haven't started */}
          {!isIncomingCall && !callInitiatedRef.current && (
            <Button
              variant="default"
              size="lg"
              onClick={initiateCall}
              className="rounded-full p-3 bg-green-600 hover:bg-green-700"
            >
              <Phone className="h-5 w-5" />
            </Button>
          )}

          {/* Show call controls once call is initiated */}
          {callInitiatedRef.current && (
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={handleToggleMute}
                className={cn(
                  "rounded-full p-3",
                  isMuted && "bg-red-100 text-red-600 border-red-200"
                )}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={cn(
                  "rounded-full p-3",
                  isSpeakerOn && "bg-blue-100 text-blue-600 border-blue-200"
                )}
              >
                {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </Button>
            </>
          )}

          <Button
            variant="destructive"
            size="lg"
            onClick={handleEndCall}
            className="rounded-full p-3"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>

        {/* Connection Quality Indicator */}
        {callStatus === 'connected' && (
          <div className="text-center text-xs text-gray-500 mt-4">
            <div className="flex items-center justify-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>High quality connection</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
