import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/useWebSocket";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send } from "lucide-react";

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  read: boolean;
  createdAt: string;
}

interface User {
  id: number;
  email: string;
}

interface MessagesListProps {
  selectedUserId?: number;
}

export default function MessagesList({ selectedUserId }: MessagesListProps) {
  const { user } = useAuth();
  const { messages: wsMessages, send, isConnected } = useWebSocket();
  const [newMessage, setNewMessage] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);

  // Get the conversation messages
  const { data: conversationMessages, isLoading } = useQuery<Message[]>({
    queryKey: [`/api/messages/${selectedUserId}`, { userId: selectedUserId }],
    enabled: !!selectedUserId && !!user,
  });

  // Get user details for the other person
  const { data: userData } = useQuery<User>({
    queryKey: [`/api/users/${selectedUserId}`],
    enabled: !!selectedUserId,
  });

  useEffect(() => {
    if (conversationMessages) {
      setLocalMessages(conversationMessages);
    }
  }, [conversationMessages]);

  // Listen for new WebSocket messages
  useEffect(() => {
    if (wsMessages.length > 0) {
      const lastMessage = wsMessages[wsMessages.length - 1];
      if (lastMessage.type === 'message' && 
         (lastMessage.message.senderId === selectedUserId || 
          lastMessage.message.receiverId === selectedUserId)) {
        // Add the new message to our local state
        setLocalMessages(prev => [lastMessage.message, ...prev]);
      }
    }
  }, [wsMessages, selectedUserId]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedUserId) return;
      
      // Try to send via WebSocket first
      const wsSuccess = send({
        type: 'message',
        receiverId: selectedUserId,
        content
      });
      
      // If WebSocket fails, use the REST API
      if (!wsSuccess) {
        await apiRequest('POST', '/api/messages', {
          receiverId: selectedUserId,
          content
        });
      }
      
      // Optimistically add the message to the local state
      const optimisticMessage = {
        id: Date.now(), // Temporary ID
        senderId: user!.id,
        receiverId: selectedUserId,
        content,
        read: false,
        createdAt: new Date().toISOString()
      };
      
      setLocalMessages(prev => [optimisticMessage, ...prev]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${selectedUserId}`] });
      setNewMessage("");
    }
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(newMessage);
    }
  };

  if (!selectedUserId) {
    return (
      <Card className="h-[500px] flex items-center justify-center">
        <div className="text-center text-neutral-medium">
          <p>Select a conversation to start messaging</p>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="h-[500px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  const getInitials = (email: string) => {
    return email?.charAt(0).toUpperCase() || "U";
  };

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="border-b px-4 py-3">
        <div className="flex items-center">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{userData ? getInitials(userData.email) : "U"}</AvatarFallback>
          </Avatar>
          <div className="ml-3">
            <p className="font-medium">{userData?.email || "User"}</p>
            <p className="text-xs text-neutral-medium">
              {isConnected ? "Online" : "Offline"}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow p-0 relative">
        <ScrollArea className="h-[350px] px-4 py-2">
          <div className="flex flex-col-reverse">
            {localMessages.map((message) => (
              <div
                key={message.id}
                className={`mb-3 max-w-[80%] ${
                  message.senderId === user?.id
                    ? "ml-auto"
                    : "mr-auto"
                }`}
              >
                <div
                  className={`px-3 py-2 rounded-lg ${
                    message.senderId === user?.id
                      ? "bg-primary text-white"
                      : "bg-neutral-light"
                  }`}
                >
                  <p>{message.content}</p>
                </div>
                <p className="text-xs text-neutral-medium mt-1">
                  {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex w-full">
          <Input
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-grow mr-2"
          />
          <Button
            type="submit"
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
