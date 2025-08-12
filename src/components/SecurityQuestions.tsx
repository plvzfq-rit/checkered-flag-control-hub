import React, { useState } from 'react';
import bcrypt from 'bcrypt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, HelpCircle } from 'lucide-react';

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "In what city were you born?",
  "What was your childhood nickname?",
  "What is the name of your favorite childhood friend?",
  "What street did you live on in third grade?",
  "What was the make of your first car?",
  "What was the name of the company where you had your first job?",
  "What was your favorite food as a child?",
  "What is your father's middle name?",
  "What high school did you attend?",
  "What was the name of your elementary school?",
  "In what town was your first job?",
  "What is the middle name of your youngest child?",
  "What school did you attend for sixth grade?",
  "What was your childhood phone number including area code?"
];

interface SecurityQuestionsProps {
  onComplete?: () => void;
  isRequired?: boolean;
}

const SecurityQuestions: React.FC<SecurityQuestionsProps> = ({ onComplete, isRequired = false }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    question1: '',
    answer1: '',
    question2: '',
    answer2: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    setLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        throw new Error('No authenticated user found');
      }

      // Hash the answers (simple hash for demo - in production use bcrypt)
      const saltRounds = 10;

      const { error } = await supabase
        .from('security_questions')
        .upsert({
          user_id: session.session.user.id,
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

      if (onComplete) onComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save security questions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gray-800/80 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Shield className="h-5 w-5 mr-2 text-blue-400" />
          Security Questions {isRequired && <span className="text-red-400 ml-1">*</span>}
        </CardTitle>
        <p className="text-gray-400 text-sm">
          These will be used to verify your identity for password recovery
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
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
          </div>

          <div className="space-y-4">
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
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Saving...' : 'Save Security Questions'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SecurityQuestions;
