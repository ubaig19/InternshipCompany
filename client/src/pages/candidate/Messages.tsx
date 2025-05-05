import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MessagesList from "@/components/MessagesList";
import { Search, Loader2 } from "lucide-react";

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  read: boolean;
  createdAt: string;
  sender?: User;
  receiver?: User;
}

interface User {
  id: number;
  email: string;
  role: string;
}

export default function CandidateMessages() {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<User[]>([]);

  // Get all recent messages
  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ['/api/messages'],
    enabled: !!user,
  });

  // Extract unique contacts from messages
  useEffect(() => {
    if (messages) {
      const uniqueContacts = new Map<number, User>();
      
      messages.forEach(message => {
        // Add the other user (not the current user) to contacts
        const otherUser = message.senderId === user?.id ? message.receiver : message.sender;
        
        if (otherUser && !uniqueContacts.has(otherUser.id)) {
          uniqueContacts.set(otherUser.id, otherUser);
        }
      });
      
      setContacts(Array.from(uniqueContacts.values()));
    }
  }, [messages, user]);

  // Filter contacts based on search query
  const filteredContacts = contacts.filter(contact => 
    contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get the last message between the current user and another user
  const getLastMessage = (contactId: number) => {
    if (!messages) return null;
    
    // Find messages between the current user and this contact
    const relevantMessages = messages.filter(message => 
      (message.senderId === user?.id && message.receiverId === contactId) ||
      (message.receiverId === user?.id && message.senderId === contactId)
    );
    
    if (relevantMessages.length === 0) return null;
    
    // Sort by date (newest first) and get the first one
    return relevantMessages.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  };

  // Count unread messages from a specific user
  const getUnreadCount = (contactId: number) => {
    if (!messages) return 0;
    
    return messages.filter(message => 
      message.senderId === contactId && 
      message.receiverId === user?.id && 
      !message.read
    ).length;
  };

  const getInitials = (email: string) => {
    return email?.charAt(0).toUpperCase() || "U";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-medium mb-6">Messages</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-medium h-4 w-4" />
                <Input
                  placeholder="Search conversations" 
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {filteredContacts.length > 0 ? (
                    filteredContacts.map(contact => {
                      const lastMessage = getLastMessage(contact.id);
                      const unreadCount = getUnreadCount(contact.id);
                      
                      return (
                        <div 
                          key={contact.id}
                          className={`p-3 rounded-lg cursor-pointer flex items-center ${
                            selectedUserId === contact.id 
                              ? 'bg-primary/10' 
                              : 'hover:bg-neutral-lightest'
                          }`}
                          onClick={() => setSelectedUserId(contact.id)}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>{getInitials(contact.email)}</AvatarFallback>
                          </Avatar>
                          <div className="ml-3 flex-grow overflow-hidden">
                            <div className="flex justify-between items-center">
                              <p className="font-medium truncate">{contact.email}</p>
                              {lastMessage && (
                                <p className="text-xs text-neutral-medium">
                                  {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })}
                                </p>
                              )}
                            </div>
                            <div className="flex justify-between items-center">
                              {lastMessage && (
                                <p className="text-sm text-neutral-medium truncate">
                                  {lastMessage.content}
                                </p>
                              )}
                              {unreadCount > 0 && (
                                <span className="ml-2 bg-secondary text-white text-xs px-2 py-1 rounded-full">
                                  {unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-neutral-medium p-4">
                      {searchQuery ? "No matching conversations found." : "No conversations yet."}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2">
          <MessagesList selectedUserId={selectedUserId} />
        </div>
      </div>
    </div>
  );
}
