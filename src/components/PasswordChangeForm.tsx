import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Key, Eye, EyeOff, Clock } from 'lucide-react';
import SecurityQuestionsDialog from './SecurityQuestionsDialog';

const PasswordChangeForm: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [canChangePassword, setCanChangePassword] = useState(true);
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [passwordLastChanged, setPasswordLastChanged] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  React.useEffect(() => {
    checkPasswordChangeEligibility();
  }, []);

  const checkPasswordChangeEligibility = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;

      // Check if user can change password (24 hour rule)
      const { data: canChange } = await supabase
        .rpc('can_change_password', { user_uuid: session.session.user.id });

      setCanChangePassword(canChange);

      // Get last password change date
      const { data: profile } = await supabase
        .from('profiles')
        .select('password_changed_at')
        .eq('id', session.session.user.id)
        .single();

      if (profile?.password_changed_at) {
        setPasswordLastChanged(profile.password_changed_at);
      }
    } catch (error) {
      console.error('Error checking password eligibility:', error);
    }
  };

  const checkPasswordHistory = async (newPassword: string): Promise<boolean> => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return false;

      // Get last 3 password hashes
      const { data: passwordHistory } = await supabase
        .from('password_history')
        .select('password_hash')
        .eq('user_id', session.session.user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      // Simple hash for comparison (in production, use proper bcrypt)
      const newPasswordHash = btoa(newPassword);
      
      return !passwordHistory?.some(record => record.password_hash === newPasswordHash);
    } catch (error) {
      console.error('Error checking password history:', error);
      return true; // Allow change if check fails
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canChangePassword) {
      toast({
        title: "Error",
        description: "Password can only be changed once every 24 hours",
        variant: "destructive"
      });
      return;
    }

    if (!isVerified) {
      setShowSecurityDialog(true);
      return;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (formData.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive"
      });
      return;
    }

    if (formData.newPassword.length > 64) {
      toast({
        title: "Error",
        description: "Password cannot be longer than 64 characters",
        variant: "destructive"
      });
      return;
    }

    // Check password history
    const isNewPassword = await checkPasswordHistory(formData.newPassword);
    if (!isNewPassword) {
      toast({
        title: "Error",
        description: "Cannot reuse one of your last 3 passwords",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.id) {
        throw new Error('No authenticated user found');
      }

      // Store old password hash in history
      const oldPasswordHash = btoa(formData.currentPassword);
      await supabase
        .from('password_history')
        .insert({
          user_id: session.session.user.id,
          password_hash: oldPasswordHash
        });

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword
      });

      if (updateError) throw updateError;

      // Update password change timestamp
      await supabase
        .from('profiles')
        .update({ password_changed_at: new Date().toISOString() })
        .eq('id', session.session.user.id);

      toast({
        title: "Success",
        description: "Password updated successfully"
      });

      // Reset form and verification state
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setIsVerified(false);
      checkPasswordChangeEligibility();
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPasswordAgeInfo = () => {
    if (!passwordLastChanged) return null;
    
    const lastChanged = new Date(passwordLastChanged);
    const now = new Date();
    const diffMs = now.getTime() - lastChanged.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return `Password was changed ${diffHours} hours ago. Must wait ${24 - diffHours} more hours.`;
    }
    
    return `Password was last changed ${Math.floor(diffHours / 24)} days ago.`;
  };

  return (
    <>
      <SecurityQuestionsDialog 
        isOpen={showSecurityDialog}
        onClose={() => setShowSecurityDialog(false)}
        onSuccess={() => {
          setIsVerified(true);
          setShowSecurityDialog(false);
          // Re-submit form after successful verification
          setTimeout(() => {
            const form = document.querySelector('form');
            if (form) {
              const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
              form.dispatchEvent(submitEvent);
            }
          }, 100);
        }}
        title="Verify Your Identity"
        description="Please answer your security questions to change your password"
        mode="verify"
      />
      
      <Card className="bg-gray-800/80 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Key className="h-5 w-5 mr-2 text-yellow-400" />
            Change Password
          </CardTitle>
          {passwordLastChanged && (
            <div className="flex items-center text-sm text-gray-400 mt-2">
              <Clock className="h-4 w-4 mr-2" />
              {getPasswordAgeInfo()}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-gray-300">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords.current ? "text" : "password"}
                  value={formData.currentPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                  onClick={() => togglePasswordVisibility('current')}
                >
                  {showPasswords.current ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-gray-300">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? "text" : "password"}
                  value={formData.newPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white pr-10"
                  required
                  minLength={8}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                  onClick={() => togglePasswordVisibility('new')}
                >
                  {showPasswords.new ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-300">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white pr-10"
                  required
                  minLength={8}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                  onClick={() => togglePasswordVisibility('confirm')}
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <Button
                type="submit"
                disabled={loading || !canChangePassword}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Updating...' : canChangePassword ? 'Update Password' : 'Password Change Restricted'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
};

export default PasswordChangeForm;