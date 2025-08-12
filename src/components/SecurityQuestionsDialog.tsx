import React, { useState } from 'react';
import bcrypt from 'bcryptjs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, HelpCircle } from 'lucide-react';

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What was your childhood nickname?",
  "What is the name of your favorite childhood friend?",
  "What was the name of the company where you had your first job?",
  "What was your favorite food as a child?",
  "What is your father's middle name?",
  "What high school did you attend?",
  "What was the name of your elementary school?",
  "In what town was your first job?",
  "What is the middle name of your youngest child?",
  "What school did you attend for sixth grade?",
];

interface SecurityQuestionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
  mode?: 'verify' | 'setup';
  userId?: string;
}

const SecurityQuestionsDialog: React.FC<SecurityQuestionsDialogProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  title = "Security Questions",
  description = "Please answer your security questions",
  mode = 'verify',
  userId
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<{question_1: string, question_2: string} | null>(null);
  const [formData, setFormData] = useState({
    question1: '',
    answer1: '',
    question2: '',
    answer2: ''
  });

  React.useEffect(() => {
    if (isOpen && mode === 'verify') {
      loadSecurityQuestions();
    }
  }, [isOpen, mode]);

  const loadSecurityQuestions = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;

      const { data: securityData } = await supabase
        .from('security_questions')
        .select('question_1, question_2')
        .eq('user_id', session.session.user.id)
        .single();

      if (securityData) {
        setQuestions(securityData);
      }
    } catch (error) {

    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const currentUserId = userId || (await supabase.auth.getSession()).data.session?.user?.id;
      if (!currentUserId) {
        throw new Error('No authenticated user found');
      }

      if (mode === 'setup') {
        // Setup mode - save new security questions
        if (formData.question1 === formData.question2) {
          toast({
            title: "Error",
            description: "Please select different questions",
            variant: "destructive"
          });
          return;
        }

        if (formData.answer1.length < 3 || formData.answer2.length < 3) {
          toast({
            title: "Error", 
            description: "Answers must be at least 3 characters long",
            variant: "destructive"
          });
          return;
        }

        const saltRounds = 10;

        const { error } = await supabase
          .from('security_questions')
          .upsert({
            user_id: currentUserId,
            question_1: formData.question1,
            answer_1_hash: await bcrypt.hash(formData.answer1.trim(), saltRounds),
            question_2: formData.question2,
            answer_2_hash: await bcrypt.hash(formData.answer2.trim(), saltRounds)
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Security questions saved successfully"
        });
      } else {
        // Verify mode - check answers
        if (!questions) {
          throw new Error('Security questions not loaded');
        }

        const { data: securityData } = await supabase
          .from('security_questions')
          .select('answer_1_hash, answer_2_hash')
          .eq('user_id', currentUserId)
          .single();

        if (!securityData) {
          throw new Error('Security questions not found');
        }

        const saltRounds = 10;
        const answer1Hash = await bcrypt.hash(formData.answer1.trim(), saltRounds);
        const answer2Hash = await bcrypt.hash(formData.answer2.trim(), saltRounds);

        if (answer1Hash !== securityData.answer_1_hash || answer2Hash !== securityData.answer_2_hash) {
          throw new Error('Security question answers are incorrect');
        }

        toast({
          title: "Success",
          description: "Identity verified successfully"
        });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process security questions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      question1: '',
      answer1: '',
      question2: '',
      answer2: ''
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-400" />
              {title}
            </DialogTitle>
            <p className="text-gray-400 text-sm">{description}</p>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'setup' ? (
              <>
                <div className="space-y-2">
                  <Label className="text-gray-300 flex items-center">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Security Question 1
                  </Label>
                  <Select 
                    value={formData.question1} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, question1: value }))}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select a question" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      {SECURITY_QUESTIONS.map((question, index) => (
                        <SelectItem key={index} value={question} disabled={question === formData.question2}>
                          {question}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="answer1" className="text-gray-300">Answer 1</Label>
                  <Input
                    id="answer1"
                    value={formData.answer1}
                    onChange={(e) => setFormData(prev => ({ ...prev, answer1: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Your answer (case insensitive)"
                    required
                    minLength={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300 flex items-center">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Security Question 2
                  </Label>
                  <Select 
                    value={formData.question2} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, question2: value }))}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select a different question" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      {SECURITY_QUESTIONS.map((question, index) => (
                        <SelectItem key={index} value={question} disabled={question === formData.question1}>
                          {question}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="answer2" className="text-gray-300">Answer 2</Label>
                  <Input
                    id="answer2"
                    value={formData.answer2}
                    onChange={(e) => setFormData(prev => ({ ...prev, answer2: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Your answer (case insensitive)"
                    required
                    minLength={3}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="verify-answer1" className="text-gray-300">
                    {questions?.question_1}
                  </Label>
                  <Input
                    id="verify-answer1"
                    value={formData.answer1}
                    onChange={(e) => setFormData(prev => ({ ...prev, answer1: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Your answer"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="verify-answer2" className="text-gray-300">
                    {questions?.question_2}
                  </Label>
                  <Input
                    id="verify-answer2"
                    value={formData.answer2}
                    onChange={(e) => setFormData(prev => ({ ...prev, answer2: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Your answer"
                    required
                  />
                </div>
              </>
            )}

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
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Processing...' : mode === 'setup' ? 'Save Questions' : 'Verify'}
              </Button>
            </div>
                  </form>
      </DialogContent>
    </Dialog>
  );
};

export default SecurityQuestionsDialog;