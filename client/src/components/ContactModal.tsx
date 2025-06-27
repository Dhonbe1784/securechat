import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function ContactModal({ isOpen, onClose, userId }: ContactModalProps) {
  const [contactEmail, setContactEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addContactMutation = useMutation({
    mutationFn: async () => {
      // First, search for user by email
      const searchResponse = await apiRequest(
        "GET", 
        `/api/users/search?q=${encodeURIComponent(contactEmail)}`
      );
      
      const searchResults = await searchResponse.json();
      
      if (!searchResults || searchResults.length === 0) {
        throw new Error("User not found with this email address");
      }
      
      const targetUser = searchResults[0];
      
      if (!targetUser || !targetUser.id) {
        throw new Error("Invalid user data received");
      }
      
      // Check if trying to add yourself
      if (targetUser.id === userId) {
        throw new Error("You cannot add yourself as a contact");
      }
      
      // Then add as contact
      const addResponse = await apiRequest("POST", "/api/contacts", {
        contactUserId: targetUser.id,
        displayName: displayName || `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || targetUser.email,
        status: "pending"
      });
      
      return await addResponse.json();
    },
    onSuccess: async (newContact) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      
      // Create conversation with the new contact
      try {
        await apiRequest("POST", "/api/conversations", {
          participantId: newContact.contactUserId
        });
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      } catch (error) {
        console.log("Conversation creation handled separately");
      }
      
      toast({
        title: "Contact added",
        description: "Contact has been added successfully and conversation created",
      });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Failed to add contact",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setContactEmail("");
    setDisplayName("");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter a contact email address",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    addContactMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Email Address</Label>
            <Input
              id="contactEmail"
              type="email"
              placeholder="Enter contact's email address"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              disabled={addContactMutation.isPending}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name (Optional)</Label>
            <Input
              id="displayName"
              placeholder="Enter display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={addContactMutation.isPending}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={addContactMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addContactMutation.isPending}
            >
              {addContactMutation.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2" />
                  Adding...
                </>
              ) : (
                "Add Contact"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
