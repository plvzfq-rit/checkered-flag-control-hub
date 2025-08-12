
import React, { useState } from 'react';
import validator from 'validator';
import bcrypt from 'bcryptjs';
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

    // Helper function to log input failures for sign-in
    const logSignInInputFailure = async (failureType: string, errorMessage: string) => {
      try {
        await supabase
          .from('input_failures')
          .insert({
            email: email,
            failure_type: failureType,
            error_message: errorMessage,
            ip_address: await getClientIP(),
            user_agent: navigator.userAgent
          });
      } catch (error) {

      }
    };

    try {
      // Validate email format for sign-in
      if (!validator.isEmail(email)) {
        await logSignInInputFailure('email_error', 'Invalid email format during sign-in');
        toast({
          title: "Error",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      // Check if account is locked before attempting login
      const { data: lockoutData, error: lockoutError } = await supabase.functions.invoke('enhanced-auth', {
        body: {
          email,
          action: 'check_lockout',
          ip: await getClientIP(),
          userAgent: navigator.userAgent
        }
      });

      // If account is locked or can't verify if locked out, block login
        if (lockoutError || lockoutData?.isLocked) {
          toast({
            title: "Unable to Login",
            description: "We're unable to complete your login right now. Please try again later.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

      // Attempt to sign in
      const { error } = await signIn(email, password);

      // Log the login attempt AFTER authentication
      try {
        const logResult = await supabase.functions.invoke('enhanced-auth', {
          body: {
            email,
            action: 'handle_login_attempt',
            success: !error,
            reason: error?.message,
            ip: await getClientIP(),
            userAgent: navigator.userAgent
          }
        });
      } catch (logError) {
        // Don't block login if logging fails
      }

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

    // Test if input_failures table exists
    try {
      const { data, error } = await supabase
        .from('input_failures')
        .select('*')
        .limit(1);
    } catch (error) {

    }

    // Helper function to log input failures
    const logInputFailure = async (failureType: string, errorMessage: string) => {
      try {
        const { data, error } = await supabase
          .from('input_failures')
          .insert({
            email: email,
            failure_type: failureType,
            error_message: errorMessage,
            ip_address: await getClientIP(),
            user_agent: navigator.userAgent
          });
      } catch (error) {

      }
    };

    try {
      // Validate email format
      const isValidEmail = validator.isEmail(email);
      
      if (!isValidEmail) {
        await logInputFailure('email_error', 'Invalid email format');
        toast({
          title: "Error",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
        
      // Validate email length
      if (email.length < 5 || email.length > 254) {
        toast({
          title: "Invalid Email",
          description: "Email must be between 5 and 254 characters.",
          variant: "destructive",
        });
      }

      // Validate password strength
      if (password.length < 8) {
        await logInputFailure('password_error', 'Password too short (minimum 8 characters)');
        toast({
          title: "Error",
          description: "Password must be at least 8 characters long",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check for password complexity
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
        await logInputFailure('password_error', 'Password does not meet complexity requirements (uppercase, lowercase, number, special character)');
        toast({
          title: "Error",
          description: "Password must contain uppercase, lowercase, number, and special character",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Validate full name
      if (!fullName.trim() || fullName.trim().length < 2) {
        await logInputFailure('validation_error', 'Full name is required and must be at least 2 characters');
        toast({
          title: "Error",
          description: "Please enter your full name (at least 2 characters)",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Validate security questions
      if (!securityQuestions.question1 || !securityQuestions.question2) {
        await logInputFailure('validation_error', 'Both security questions must be selected');
        toast({
          title: "Error",
          description: "Please select both security questions",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (securityQuestions.question1 === securityQuestions.question2) {
        await logInputFailure('validation_error', 'Security questions must be different');
        toast({
          title: "Error",
          description: "Please select different security questions",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (securityQuestions.answer1.length < 3 || securityQuestions.answer2.length < 3) {
        await logInputFailure('validation_error', 'Security question answers must be at least 3 characters long');
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
        
        // Log the sign-up error
        let failureType = 'validation_error';
        let errorMessage = error.message;
        
        // Categorize the error type
        if (error.message.includes('email') || error.message.includes('Email')) {
          failureType = 'email_error';
        } else if (error.message.includes('password') || error.message.includes('Password')) {
          failureType = 'password_error';
        }
        
        await logInputFailure(failureType, errorMessage);
        
        toast({
          title: "Registration Error",
          description: error.message,
          variant: "destructive",
        });
      } else if (data.user) {
        // Store initial password in password history
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        await supabase
          .from('password_history')
          .insert({
            user_id: data.user.id,
            password_hash: passwordHash
          });

        // Save security questions
        await supabase
          .from('security_questions')
          .insert({
            user_id: data.user.id,
            question_1: securityQuestions.question1,
            answer_1_hash: await bcrypt.hash(securityQuestions.answer1, saltRounds),
            question_2: securityQuestions.question2,
            answer_2_hash: await bcrypt.hash(securityQuestions.answer2, saltRounds)
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
      
      // Log unexpected errors
      try {
        await supabase
          .from('input_failures')
          .insert({
            email: email,
            failure_type: 'validation_error',
            error_message: error instanceof Error ? error.message : 'Unknown error during sign up',
            ip_address: await getClientIP(),
            user_agent: navigator.userAgent
          });
      } catch (logError) {

      }
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
                {/**/}
                {/* <Button */}
                {/*   type="button" */}
                {/*   onClick={testResetUser} */}
                {/*   className="w-full bg-orange-600 hover:bg-orange-700 text-white" */}
                {/*   disabled={!email} */}
                {/* > */}
                {/*   Test Reset User */}
                {/* </Button> */}


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
                    type="text"
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
