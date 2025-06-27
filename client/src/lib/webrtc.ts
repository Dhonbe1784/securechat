// WebRTC utility functions and configuration

export const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ]
};

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-start' | 'call-end' | 'call-accept' | 'call-reject';
  target: string;
  from?: string;
  data: any;
  conversationId?: number;
}

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private isVideoCall: boolean = false;
  private onRemoteStreamCallback?: (stream: MediaStream) => void;
  private onConnectionStateChangeCallback?: (state: RTCPeerConnectionState) => void;

  constructor(isVideoCall: boolean) {
    this.isVideoCall = isVideoCall;
  }

  async initialize() {
    try {
      // Get user media
      const constraints = {
        audio: true,
        video: this.isVideoCall ? { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Create peer connection
      this.peerConnection = new RTCPeerConnection(rtcConfig);
      
      // Add local stream to peer connection
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        console.log('Received remote stream');
        this.remoteStream = event.streams[0];
        this.onRemoteStreamCallback?.(this.remoteStream);
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        if (this.peerConnection) {
          const state = this.peerConnection.connectionState;
          console.log('WebRTC connection state:', state);
          this.onConnectionStateChangeCallback?.(state);
        }
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          // Send ICE candidate to remote peer via signaling server
          this.sendSignalingMessage({
            type: 'ice-candidate',
            target: '', // Will be set by the caller
            data: event.candidate
          });
        }
      };

      return this.localStream;
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      throw error;
    }
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  async handleOffer(offer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.setRemoteDescription(offer);
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.setRemoteDescription(answer);
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.addIceCandidate(candidate);
  }

  toggleMute(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled; // Return true if muted
      }
    }
    return false;
  }

  toggleVideo(): boolean {
    if (this.localStream && this.isVideoCall) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return !videoTrack.enabled; // Return true if video disabled
      }
    }
    return false;
  }

  async startScreenShare(): Promise<MediaStream> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true
    });

    const videoTrack = screenStream.getVideoTracks()[0];
    if (videoTrack) {
      // Replace video track in peer connection
      const sender = this.peerConnection.getSenders().find(s => 
        s.track && s.track.kind === 'video'
      );
      
      if (sender) {
        await sender.replaceTrack(videoTrack);
      }

      // Handle screen share end
      videoTrack.onended = () => {
        this.stopScreenShare();
      };
    }

    return screenStream;
  }

  async stopScreenShare() {
    if (!this.localStream || !this.peerConnection) return;

    try {
      // Get new camera stream
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: this.isVideoCall ? { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } : false
      });

      const cameraVideoTrack = cameraStream.getVideoTracks()[0];
      if (cameraVideoTrack) {
        // Replace track in peer connection
        const sender = this.peerConnection.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        
        if (sender) {
          await sender.replaceTrack(cameraVideoTrack);
        }
      }
    } catch (error) {
      console.error('Failed to restore camera after screen share:', error);
    }
  }

  setOnRemoteStream(callback: (stream: MediaStream) => void) {
    this.onRemoteStreamCallback = callback;
  }

  setOnConnectionStateChange(callback: (state: RTCPeerConnectionState) => void) {
    this.onConnectionStateChangeCallback = callback;
  }

  private sendSignalingMessage(message: SignalingMessage) {
    // This should be implemented by the component using this class
    // to send messages via WebSocket
    console.log('Signaling message to send:', message);
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  close() {
    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }
}

// Utility functions
export function checkWebRTCSupport(): boolean {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    window.RTCPeerConnection &&
    window.RTCSessionDescription &&
    window.RTCIceCandidate
  );
}

export async function checkMediaPermissions(): Promise<{ audio: boolean; video: boolean }> {
  try {
    const permissions = await Promise.all([
      navigator.permissions.query({ name: 'microphone' as PermissionName }),
      navigator.permissions.query({ name: 'camera' as PermissionName })
    ]);

    return {
      audio: permissions[0].state === 'granted',
      video: permissions[1].state === 'granted'
    };
  } catch (error) {
    console.error('Failed to check media permissions:', error);
    return { audio: false, video: false };
  }
}

export async function requestMediaPermissions(video: boolean = true): Promise<MediaStream> {
  const constraints = {
    audio: true,
    video: video ? { 
      width: { ideal: 1280 },
      height: { ideal: 720 }
    } : false
  };

  return await navigator.mediaDevices.getUserMedia(constraints);
}
