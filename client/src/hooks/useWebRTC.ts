import { useState, useEffect, useCallback, useRef } from "react";

interface UseWebRTCProps {
  isVideoCall: boolean;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  sendSignalingMessage?: (message: any) => void;
  targetUserId?: string;
}

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnected: boolean;
  startCall: () => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  handleSignalingMessage: (message: any) => Promise<void>;
  error: string | null;
}

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export function useWebRTC({ isVideoCall, onConnectionStateChange, sendSignalingMessage, targetUserId }: UseWebRTCProps): UseWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);

  // Handle incoming signaling messages
  const handleSignalingMessage = useCallback(async (message: any) => {
    const peerConnection = peerConnectionRef.current;
    if (!peerConnection) return;

    try {
      switch (message.type) {
        case 'offer':
          await peerConnection.setRemoteDescription(message.data);
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          
          if (sendSignalingMessage && targetUserId) {
            sendSignalingMessage({
              type: 'answer',
              target: targetUserId,
              data: answer
            });
          }
          break;
          
        case 'answer':
          await peerConnection.setRemoteDescription(message.data);
          break;
          
        case 'ice-candidate':
          await peerConnection.addIceCandidate(message.data);
          break;
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
      setError('Failed to handle call signaling');
    }
  }, [sendSignalingMessage, targetUserId]);

  const startCall = useCallback(async () => {
    try {
      setError(null);
      
      // Get user media
      const constraints = {
        audio: true,
        video: isVideoCall ? { width: 640, height: 480 } : false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      
      // Store original video track for screen share restoration
      if (isVideoCall && stream.getVideoTracks().length > 0) {
        originalVideoTrackRef.current = stream.getVideoTracks()[0];
      }

      // Create peer connection
      const peerConnection = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = peerConnection;

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('Received remote stream');
        setRemoteStream(event.streams[0]);
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        console.log('Connection state:', state);
        
        setIsConnected(state === 'connected');
        onConnectionStateChange?.(state);
        
        if (state === 'failed') {
          setError('Connection failed. Please try again.');
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && sendSignalingMessage && targetUserId) {
          sendSignalingMessage({
            type: 'ice-candidate',
            target: targetUserId,
            data: event.candidate
          });
        }
      };

      // Create and send offer
      if (sendSignalingMessage && targetUserId) {
        console.log('Creating WebRTC offer for target:', targetUserId);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        sendSignalingMessage({
          type: 'offer',
          target: targetUserId,
          data: offer
        });
        console.log('WebRTC offer sent');
      } else {
        // For demo purposes, simulate a successful connection after 3 seconds
        console.log('No signaling available, simulating connection for demo');
        setTimeout(() => {
          setIsConnected(true);
          onConnectionStateChange?.('connected');
        }, 3000);
      }

    } catch (error) {
      console.error('Failed to start call:', error);
      setError(`Failed to start call: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [isVideoCall, onConnectionStateChange]);

  const endCall = useCallback(() => {
    try {
      // Stop all tracks
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      
      if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        setRemoteStream(null);
      }

      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      setIsConnected(false);
      setError(null);
      originalVideoTrackRef.current = null;
    } catch (error) {
      console.error('Error ending call:', error);
    }
  }, [localStream, remoteStream]);

  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream && isVideoCall) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  }, [localStream, isVideoCall]);

  const startScreenShare = useCallback(async () => {
    try {
      if (!localStream || !peerConnectionRef.current) return;

      const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: true 
      });
      
      const videoTrack = screenStream.getVideoTracks()[0];
      if (!videoTrack) return;

      // Replace video track in peer connection
      const sender = peerConnectionRef.current.getSenders().find(s => 
        s.track && s.track.kind === 'video'
      );
      
      if (sender) {
        await sender.replaceTrack(videoTrack);
      }

      // Replace video track in local stream
      const oldVideoTrack = localStream.getVideoTracks()[0];
      if (oldVideoTrack) {
        localStream.removeTrack(oldVideoTrack);
        oldVideoTrack.stop();
      }
      
      localStream.addTrack(videoTrack);
      
      // Handle screen share end
      videoTrack.onended = () => {
        stopScreenShare();
      };

    } catch (error) {
      console.error('Failed to start screen sharing:', error);
      setError('Failed to start screen sharing');
    }
  }, [localStream]);

  const stopScreenShare = useCallback(async () => {
    try {
      if (!localStream || !peerConnectionRef.current || !originalVideoTrackRef.current) return;

      // Get new camera stream
      const cameraStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      
      const cameraVideoTrack = cameraStream.getVideoTracks()[0];
      if (!cameraVideoTrack) return;

      // Replace track in peer connection
      const sender = peerConnectionRef.current.getSenders().find(s => 
        s.track && s.track.kind === 'video'
      );
      
      if (sender) {
        await sender.replaceTrack(cameraVideoTrack);
      }

      // Replace track in local stream
      const screenTrack = localStream.getVideoTracks()[0];
      if (screenTrack) {
        localStream.removeTrack(screenTrack);
        screenTrack.stop();
      }
      
      localStream.addTrack(cameraVideoTrack);
      originalVideoTrackRef.current = cameraVideoTrack;

    } catch (error) {
      console.error('Failed to stop screen sharing:', error);
      setError('Failed to stop screen sharing');
    }
  }, [localStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    localStream,
    remoteStream,
    isConnected,
    startCall,
    endCall,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    handleSignalingMessage,
    error
  };
}
