import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Eye, EyeOff } from 'lucide-react';

interface ReAuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

const ReAuthDialog: React.FC<ReAuthDialogProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  title = "Verify Your Identity",
  description = "Please enter your current password to continue"
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.email) {
        throw new Error('No authenticated user found');
      }

      // Verify current password by attempting to sign in
      const { error } = await supabase.auth.signInWithPassword({
        email: session.session.user.email,
        password: password
      });

      if (error) {
        throw new Error('Current password is incorrect');
      }

      toast({
        title: "Success",
        description: "Identity verified successfully"
      });

      setPassword('');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error verifying identity:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to verify identity",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2 text-yellow-400" />
            {title}
          </DialogTitle>
          <p className="text-gray-400 text-sm">{description}</p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-gray-300">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white pr-10"
                placeholder="Enter your current password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReAuthDialog;