import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Bell, Menu, MoreVertical, LogOut, Settings, User, Briefcase } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";

export default function AppHeader() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Get unread message count
  const { data: unreadData } = useQuery({
    queryKey: ['/api/messages/unread/count'],
    enabled: !!user,
  });

  const unreadCount = unreadData?.count || 0;

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login");
  };

  const toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      if (sidebar.classList.contains('hidden-mobile')) {
        sidebar.classList.remove('hidden-mobile');
        setSidebarOpen(true);
      } else {
        sidebar.classList.add('hidden-mobile');
        setSidebarOpen(false);
      }
    }
  };

  const getInitials = () => {
    if (!user) return "";
    return user.email.charAt(0).toUpperCase();
  };

  const dashboardLink = user?.role === "candidate" 
    ? "/candidate/dashboard" 
    : "/employer/dashboard";

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex justify-between items-center px-4 py-2 max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden" 
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link href={dashboardLink} className="flex items-center space-x-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <span className="font-medium text-lg text-primary">InternInvitePortal</span>
          </Link>
        </div>

        {user ? (
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-secondary rounded-full"></span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {unreadCount > 0 ? (
                  <DropdownMenuItem>
                    You have {unreadCount} unread message{unreadCount > 1 ? 's' : ''}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem>No new notifications</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="hidden md:flex items-center space-x-2">
              <Avatar>
                <AvatarFallback className="bg-primary text-white">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{user.email}</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(user.role === "candidate" ? "/candidate/profile" : "/employer/company")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </div>
    </header>
  );
}
