import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Phone, Video, MessageCircle } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-primary mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">SecureChat</h1>
          </div>
          <p className="text-xl text-gray-600 mb-8">
            End-to-End Encrypted Communication Platform
          </p>
          <p className="text-gray-500 mb-8 max-w-2xl mx-auto">
            Experience secure, private communication with real-time messaging, voice calls, and video calls. 
            Your conversations are protected with military-grade encryption and peer-to-peer technology.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center">
            <CardHeader>
              <MessageCircle className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Secure Messaging</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Send encrypted messages with perfect forward secrecy. Your conversations remain private.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Phone className="h-8 w-8 text-secondary mx-auto mb-2" />
              <CardTitle className="text-lg">Voice Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Crystal-clear voice calls using WebRTC technology. Direct peer-to-peer connections.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Video className="h-8 w-8 text-accent mx-auto mb-2" />
              <CardTitle className="text-lg">Video Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                High-quality video calls with screen sharing. Connect face-to-face securely.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <Lock className="h-8 w-8 text-primary mx-auto mb-2" />
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Sign in to access your secure communication platform
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => window.location.href = '/api/login'} 
              className="w-full"
              size="lg"
            >
              Sign In to SecureChat
            </Button>
            <p className="text-xs text-gray-500 mt-4">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
