import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Briefcase, MessageSquare, LayoutDashboard, Calendar, User, Settings, LogOut, Search, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: number;
}

function SidebarLink({ href, icon, children, badge }: SidebarLinkProps) {
  const [location] = useLocation();
  const isActive = location === href;

  return (
    <li>
      <Link href={href}>
        <a
          className={cn(
            "flex items-center px-6 py-3 text-neutral-dark hover:bg-neutral-lightest", 
            isActive && "border-l-4 border-primary bg-primary/5"
          )}
        >
          <span className="mr-3">{icon}</span>
          <span>{children}</span>
          {badge && badge > 0 && (
            <span className="ml-auto bg-secondary text-white text-xs px-2 py-1 rounded-full">
              {badge}
            </span>
          )}
        </a>
      </Link>
    </li>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  
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

  if (!user) return null;

  return (
    <div id="sidebar" className="w-64 bg-white shadow-sm overflow-y-auto hidden-mobile lg:block">
      <nav className="py-4">
        <div className="px-4 py-2 text-neutral-medium text-sm font-medium uppercase">
          {user.role === "candidate" ? "Candidate Dashboard" : "Employer Dashboard"}
        </div>
        
        {user.role === "candidate" ? (
          <ul>
            <SidebarLink 
              href="/candidate/dashboard" 
              icon={<LayoutDashboard className="h-5 w-5" />}
            >
              Dashboard
            </SidebarLink>
            <SidebarLink 
              href="/candidate/messages" 
              icon={<MessageSquare className="h-5 w-5" />}
              badge={unreadCount}
            >
              Messages
            </SidebarLink>
            <SidebarLink 
              href="/candidate/jobs" 
              icon={<Briefcase className="h-5 w-5" />}
            >
              Jobs
            </SidebarLink>
            <SidebarLink 
              href="/candidate/calendar" 
              icon={<Calendar className="h-5 w-5" />}
            >
              Calendar
            </SidebarLink>
            <SidebarLink 
              href="/candidate/profile" 
              icon={<User className="h-5 w-5" />}
            >
              Profile
            </SidebarLink>
          </ul>
        ) : (
          <ul>
            <SidebarLink 
              href="/employer/dashboard" 
              icon={<LayoutDashboard className="h-5 w-5" />}
            >
              Dashboard
            </SidebarLink>
            <SidebarLink 
              href="/employer/messages" 
              icon={<MessageSquare className="h-5 w-5" />}
              badge={unreadCount}
            >
              Messages
            </SidebarLink>
            <SidebarLink 
              href="/employer/jobs" 
              icon={<Briefcase className="h-5 w-5" />}
            >
              Job Listings
            </SidebarLink>
            <SidebarLink 
              href="/employer/candidates" 
              icon={<Search className="h-5 w-5" />}
            >
              Find Candidates
            </SidebarLink>
            <SidebarLink 
              href="/employer/company" 
              icon={<Building className="h-5 w-5" />}
            >
              Company Profile
            </SidebarLink>
          </ul>
        )}
        
        <div className="border-t border-neutral-light mt-4 pt-4">
          <ul>
            <li>
              <a 
                href="#" 
                className="flex items-center px-6 py-3 text-neutral-dark hover:bg-neutral-lightest"
              >
                <Settings className="h-5 w-5 mr-3" />
                <span>Settings</span>
              </a>
            </li>
            <li>
              <Button 
                variant="ghost" 
                className="w-full justify-start px-6 py-3 text-neutral-dark hover:bg-neutral-lightest"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 mr-3" />
                <span>Logout</span>
              </Button>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  );
}
