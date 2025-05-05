import { createContext, useEffect, useState, ReactNode } from 'react';
import { getMe, login, logout, register } from '@/lib/auth';
import { queryClient } from '@/lib/queryClient';
import { connectWebSocket, closeWebSocket } from '@/lib/websocket';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: number;
  email: string;
  role: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, role: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => false,
  register: async () => false,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check if the user is already authenticated
    const checkAuth = async () => {
      try {
        const userData = await getMe();
        setUser(userData);
        
        // If user is authenticated, connect to WebSocket
        if (userData) {
          try {
            await connectWebSocket(); // Connect with the new async function
          } catch (wsError) {
            console.error('WebSocket connection error:', wsError);
            // Non-blocking - we'll still set the user even if WebSocket fails
          }
        }
      } catch (error) {
        // Handle error (user not authenticated)
        console.log('User not authenticated');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Cleanup WebSocket on unmount
    return () => {
      closeWebSocket();
    };
  }, []);

  // Connect/disconnect WebSocket when auth state changes
  useEffect(() => {
    const handleWebSocketConnection = async () => {
      if (user) {
        try {
          await connectWebSocket();
        } catch (error) {
          console.error('WebSocket connection error:', error);
        }
      } else {
        closeWebSocket();
      }
    };
    
    handleWebSocketConnection();
  }, [user]);

  const handleLogin = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const userData = await login({ email, password });
      setUser(userData);
      queryClient.invalidateQueries();
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login failed",
        description: "Invalid email or password.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (email: string, password: string, role: string) => {
    try {
      setIsLoading(true);
      const userData = await register({ email, password, role: role as 'candidate' | 'employer' });
      setUser(userData);
      toast({
        title: "Registration successful",
        description: "Your account has been created.",
      });
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration failed",
        description: "This email might already be in use.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      // Clear all queries from cache
      queryClient.clear();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout failed",
        description: "There was an error logging out.",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
