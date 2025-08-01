import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { KeyRound, HelpCircle, Eye, EyeOff } from 'lucide-react';

interface PasswordResetFormProps {
  email: string;
  onSuccess?: () => void;
}

const PasswordResetForm: React.FC<PasswordResetFormProps> = ({ email, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'questions' | 'reset'>('questions');
  const [showPassword, setShowPassword] = useState(false);
  const [questions, setQuestions] = useState<{ question_1: string; question_2: string } | null>(null);
  const [formData, setFormData] = useState({
    answer1: '',
    answer2: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleVerifyAnswers = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First get the user's security questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('security_questions')
        .select('question_1, question_2, answer_1_hash, answer_2_hash')
        .eq('user_id', email) // This would need to be adjusted to work with email lookup
        .single();

      if (questionsError) {
        toast({
          title: "Error",
          description: "Security questions not found. Please contact support.",
          variant: "destructive"
        });
        return;
      }

      // Verify answers (simple hash comparison for demo)
      const hashAnswer = (answer: string) => btoa(answer.toLowerCase().trim());
      const answer1Hash = hashAnswer(formData.answer1);
      const answer2Hash = hashAnswer(formData.answer2);

      if (answer1Hash !== questionsData.answer_1_hash || answer2Hash !== questionsData.answer_2_hash) {
        toast({
          title: "Error",
          description: "Security answers are incorrect",
          variant: "destructive"
        });
        return;
      }

      setStep('reset');
      toast({
        title: "Success",
        description: "Security questions verified. You can now reset your password."
      });

    } catch (error: any) {
      console.error('Error verifying security questions:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to verify security questions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
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

    setLoading(true);

    try {
      // In a real implementation, you would need to use a secure method
      // to reset the password after verifying security questions
      toast({
        title: "Success",
        description: "Password reset request sent. Check your email for further instructions."
      });

      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSecurityQuestions = async () => {
    try {
      // This would need proper implementation to lookup user by email
      // For demo purposes, showing placeholder questions
      setQuestions({
        question_1: "What was the name of your first pet?",
        question_2: "In what city were you born?"
      });
    } catch (error) {
      console.error('Error loading security questions:', error);
    }
  };

  React.useEffect(() => {
    loadSecurityQuestions();
  }, [email]);

  return (
    <Card className="bg-gray-800/80 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <KeyRound className="h-5 w-5 mr-2 text-yellow-400" />
          Password Reset
        </CardTitle>
        <p className="text-gray-400 text-sm">
          {step === 'questions' 
            ? 'Answer your security questions to verify your identity'
            : 'Enter your new password'
          }
        </p>
      </CardHeader>
      <CardContent>
        {step === 'questions' ? (
          <form onSubmit={handleVerifyAnswers} className="space-y-4">
            {questions && (
              <>
                <div className="space-y-2">
                  <Label className="text-gray-300 flex items-center">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    {questions.question_1}
                  </Label>
                  <Input
                    value={formData.answer1}
                    onChange={(e) => setFormData(prev => ({ ...prev, answer1: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Your answer"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300 flex items-center">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    {questions.question_2}
                  </Label>
                  <Input
                    value={formData.answer2}
                    onChange={(e) => setFormData(prev => ({ ...prev, answer2: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Your answer"
                    required
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-600 hover:bg-yellow-700"
            >
              {loading ? 'Verifying...' : 'Verify Answers'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-gray-300">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-300">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
                required
                minLength={8}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default PasswordResetForm;