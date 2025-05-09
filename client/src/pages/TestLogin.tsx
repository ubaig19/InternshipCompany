import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function TestLogin() {
  const { login, register, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [registering, setRegistering] = useState(false);

  // Hard-coded test login values
  const candidateEmail = "candidate@example.com";
  const employerEmail = "employer@example.com";
  const testPassword = "password123";
  
  const createTestAccountAndLogin = async (role: "candidate" | "employer") => {
    try {
      setRegistering(true);
      
      // Select the appropriate email based on role
      const email = role === "candidate" ? candidateEmail : employerEmail;
      
      // First try to register (will fail if user already exists)
      try {
        await register(email, testPassword, role);
        toast({
          title: "Test account created",
          description: `Created new ${role} account with email: ${email}`,
        });
      } catch (error) {
        // User likely already exists, which is fine
        console.log("Account may already exist, attempting login");
      }
      
      // Now try to login
      const success = await login(email, testPassword);
      if (success) {
        toast({
          title: "Login successful",
          description: `Logged in as ${role} with email: ${email}`,
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: "Could not log in with test account",
        variant: "destructive"
      });
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full mx-auto bg-white p-8 rounded-xl shadow-md border border-gray-100">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center">
            <Briefcase className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-2xl font-medium mt-4">Welcome to InternInvitePortal</h1>
          <p className="text-slate-700 mt-2">Sign in to your account</p>
        </div>

        <div className="space-y-4">
          <Button 
            onClick={() => createTestAccountAndLogin("candidate")}
            className="w-full bg-blue-500 hover:bg-blue-600" 
            disabled={isLoading || registering}
          >
            TEST ENTER AS CANDIDATE
          </Button>
          
          <Button 
            onClick={() => createTestAccountAndLogin("employer")}
            className="w-full bg-emerald-500 hover:bg-emerald-600" 
            disabled={isLoading || registering}
          >
            TEST ENTER AS EMPLOYER
          </Button>
          
          <div className="text-sm text-center text-gray-500 mt-4">
            (For development purposes only)
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-slate-700">
            Don't have an account?{" "}
            <Link to="/auth/register" className="text-primary font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}