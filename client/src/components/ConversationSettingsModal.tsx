import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Trash2, Clock, Settings } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ConversationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number | null;
  currentClearSetting?: string;
}

export default function ConversationSettingsModal({
  isOpen,
  onClose,
  conversationId,
  currentClearSetting = 'never'
}: ConversationSettingsModalProps) {
  const [autoClearAfter, setAutoClearAfter] = useState(currentClearSetting);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setAutoClearAfter(currentClearSetting);
  }, [currentClearSetting]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { autoClearAfter: string }) => {
      return await apiRequest(`/api/conversations/${conversationId}/clear-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Settings updated',
        description: 'Auto-clear preference has been saved.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update conversation settings.',
        variant: 'destructive',
      });
      console.error('Failed to update settings:', error);
    },
  });

  const clearMessagesMutation = useMutation({
    mutationFn: async () => {
      console.log('Clearing messages for conversation:', conversationId);
      if (!conversationId) {
        throw new Error('No conversation ID provided');
      }
      return await apiRequest(`/api/conversations/${conversationId}/messages`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Messages cleared',
        description: 'All messages in this conversation have been deleted.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}/messages`] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      onClose();
    },
    onError: (error) => {
      console.error('Failed to clear messages - Full error:', error);
      toast({
        title: 'Error',
        description: `Failed to clear messages: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleSaveSettings = () => {
    if (conversationId) {
      updateSettingsMutation.mutate({ autoClearAfter });
    }
  };

  const handleClearMessages = () => {
    if (conversationId && confirm('Are you sure you want to delete all messages in this conversation? This action cannot be undone.')) {
      clearMessagesMutation.mutate();
    }
  };

  const getClearLabel = (value: string) => {
    switch (value) {
      case '24h': return 'After 24 hours';
      case '1week': return 'After 1 week';
      case '30days': return 'After 30 days';
      default: return 'Never';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Conversation Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Auto-clear settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-medium">Auto-clear messages</Label>
            </div>
            <p className="text-xs text-gray-600">
              Automatically delete messages after a specified time period to keep your conversation history clean.
            </p>
            
            <Select value={autoClearAfter} onValueChange={setAutoClearAfter}>
              <SelectTrigger>
                <SelectValue placeholder="Choose auto-clear option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never clear</SelectItem>
                <SelectItem value="24h">Clear after 24 hours</SelectItem>
                <SelectItem value="1week">Clear after 1 week</SelectItem>
                <SelectItem value="30days">Clear after 30 days</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
              Current setting: {getClearLabel(currentClearSetting)}
            </div>
          </div>

          <Separator />

          {/* Manual clear */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-500" />
              <Label className="text-sm font-medium">Clear all messages</Label>
            </div>
            <p className="text-xs text-gray-600">
              Immediately delete all messages in this conversation. This action cannot be undone.
            </p>
            
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleClearMessages}
              disabled={clearMessagesMutation.isPending}
              className="w-full"
            >
              {clearMessagesMutation.isPending ? 'Clearing...' : 'Clear All Messages'}
            </Button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveSettings}
            disabled={updateSettingsMutation.isPending || autoClearAfter === currentClearSetting}
          >
            {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}