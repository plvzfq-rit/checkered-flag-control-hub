
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, AlertCircle, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [securityQuestions, setSecurityQuestions] = useState({
    question1: '',
    answer1: '',
    question2: '',
    answer2: ''
  });
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if account is locked before attempting login
      const { data: lockoutData } = await supabase.functions.invoke('enhanced-auth', {
        body: { 
          email, 
          action: 'check_lockout',
          ip: await getClientIP(),
          userAgent: navigator.userAgent 
        }
      });

      if (lockoutData?.isLocked) {
        toast({
          title: "Account Locked",
          description: "Your account is temporarily locked due to multiple failed login attempts. Please try again later.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await signIn(email, password);
      
      // Log the login attempt
      await supabase.functions.invoke('enhanced-auth', {
        body: { 
          email, 
          action: 'handle_login_attempt',
          success: !error,
          reason: error?.message,
          ip: await getClientIP(),
          userAgent: navigator.userAgent 
        }
      });

      if (error) {
        toast({
          title: "Authentication Error",
          description: "Invalid username and/or password",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "Successfully signed in to the pit lane.",
        });
        navigate('/');
      }
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getClientIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return '0.0.0.0';
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate lengths
      if (email.length < 5 || email.length > 254) {
        toast({
          title: "Invalid Email",
          description: "Email must be between 5 and 254 characters.",
          variant: "destructive",
        });
        return;
      }

      // Validate security questions
      if (!securityQuestions.question1 || !securityQuestions.question2) {
        toast({
          title: "Error",
          description: "Please select both security questions",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (securityQuestions.question1 === securityQuestions.question2) {
        toast({
          title: "Error",
          description: "Please select different security questions",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (securityQuestions.answer1.length < 3 || securityQuestions.answer2.length < 3) {
        toast({
          title: "Error",
          description: "Security question answers must be at least 3 characters long",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data, error } = await signUp(email, password, fullName);
      if (error) {
        console.log(error);
        toast({
          title: "Registration Error",
          description: error.message,
          variant: "destructive",
        });
      } else if (data.user) {
        // Store initial password in password history
        const passwordHash = btoa(password);
        await supabase
          .from('password_history')
          .insert({
            user_id: data.user.id,
            password_hash: passwordHash
          });

        // Save security questions
        const hashAnswer = (answer: string) => btoa(answer.toLowerCase().trim());
        await supabase
          .from('security_questions')
          .insert({
            user_id: data.user.id,
            question_1: securityQuestions.question1,
            answer_1_hash: hashAnswer(securityQuestions.answer1),
            question_2: securityQuestions.question2,
            answer_2_hash: hashAnswer(securityQuestions.answer2)
          });

        toast({
          title: "Registration Complete!",
          description: "Welcome to the team! Check your email to confirm your account.",
        });
        
        // Reset form
        setEmail('');
        setPassword('');
        setFullName('');
        setSecurityQuestions({
          question1: '',
          answer1: '',
          question2: '',
          answer2: ''
        });
      }
    } catch (error) {
      console.error('Sign up error:', error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-red-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800/90 border-gray-700 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Trophy className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Checkered Flag Control Hub
          </CardTitle>
          <CardDescription className="text-gray-400">
            Enter the pit lane - Authentication required
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-700">
              <TabsTrigger value="signin" className="text-gray-300">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="text-gray-300">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-gray-300">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="driver@f1team.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-gray-300">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  disabled={loading}
                >
                  {loading ? 'Starting Engine...' : 'Enter Pit Lane'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-gray-300">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Lewis Hamilton"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-gray-300">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="driver@f1team.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-gray-300">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-gray-300 flex items-center">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Security Question 1
                  </Label>
                  <Select 
                    value={securityQuestions.question1} 
                    onValueChange={(value) => setSecurityQuestions(prev => ({ ...prev, question1: value }))}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select a question" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 z-50">
                      {SECURITY_QUESTIONS.map((question, index) => (
                        <SelectItem key={index} value={question} disabled={question === securityQuestions.question2}>
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
                    value={securityQuestions.answer1}
                    onChange={(e) => setSecurityQuestions(prev => ({ ...prev, answer1: e.target.value }))}
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
                    value={securityQuestions.question2} 
                    onValueChange={(value) => setSecurityQuestions(prev => ({ ...prev, question2: value }))}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select a different question" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 z-50">
                      {SECURITY_QUESTIONS.map((question, index) => (
                        <SelectItem key={index} value={question} disabled={question === securityQuestions.question1}>
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
                    value={securityQuestions.answer2}
                    onChange={(e) => setSecurityQuestions(prev => ({ ...prev, answer2: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Your answer (case insensitive)"
                    required
                    minLength={3}
                  />
                </div>
                
                <div className="flex items-start space-x-2 text-sm text-yellow-400">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>New drivers start with Driver role. Contact your Team Principal for role upgrades.</p>
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  disabled={loading}
                >
                  {loading ? 'Joining Team...' : 'Join the Team'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
