import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IncomingCallModalProps {
  isOpen: boolean;
  callType: 'voice' | 'video';
  fromUserId: string;
  conversationId: number;
  onAccept: () => void;
  onReject: () => void;
  sendWebSocketMessage: (message: any) => void;
}

export default function IncomingCallModal({
  isOpen,
  callType,
  fromUserId,
  conversationId,
  onAccept,
  onReject,
  sendWebSocketMessage
}: IncomingCallModalProps) {
  const [isRinging, setIsRinging] = useState(true);

  // Play ringing sound effect (placeholder)
  useEffect(() => {
    if (isOpen) {
      setIsRinging(true);
      // In a real app, you'd play a ringing sound here
      console.log('🔔 Incoming call ringing...');
    }
  }, [isOpen]);

  const handleAccept = () => {
    console.log('Call accepted, sending acceptance signal');
    sendWebSocketMessage({
      type: 'call-accept',
      target: fromUserId,
      conversationId,
      data: { callType }
    });
    setIsRinging(false);
    onAccept();
  };

  const handleReject = () => {
    console.log('Call rejected, sending rejection signal');
    sendWebSocketMessage({
      type: 'call-reject',
      target: fromUserId,
      conversationId,
      data: { callType }
    });
    setIsRinging(false);
    onReject();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onReject}>
      <DialogContent className="sm:max-w-md bg-gray-900 text-white border-gray-700">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto">
            <Avatar className="h-20 w-20 mx-auto">
              <AvatarFallback className="bg-gray-600 text-white text-2xl">
                {fromUserId.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Incoming {callType} call</h3>
            <p className="text-sm text-gray-300">
              User {fromUserId}
            </p>
          </div>
        </DialogHeader>

        {/* Ringing indicator */}
        <div className="flex justify-center mb-6">
          <div className={cn(
            "w-4 h-4 rounded-full bg-blue-500",
            isRinging && "animate-pulse"
          )} />
        </div>

        {/* Call action buttons */}
        <div className="flex justify-center space-x-8">
          {/* Reject button */}
          <Button
            onClick={handleReject}
            className="bg-red-600 hover:bg-red-700 rounded-full w-16 h-16 p-0"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>

          {/* Accept button */}
          <Button
            onClick={handleAccept}
            className="bg-green-600 hover:bg-green-700 rounded-full w-16 h-16 p-0"
          >
            {callType === 'video' ? (
              <Video className="h-6 w-6" />
            ) : (
              <Phone className="h-6 w-6" />
            )}
          </Button>
        </div>

        <div className="text-center text-xs text-gray-400 mt-4">
          {callType === 'video' ? 'Video call' : 'Voice call'}
        </div>
      </DialogContent>
    </Dialog>
  );
}