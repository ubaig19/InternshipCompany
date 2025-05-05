import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail, Briefcase, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileCompletionCard from "@/components/ProfileCompletionCard";
import StatsCard from "@/components/StatsCard";
import InvitationsList from "@/components/InvitationsList";
import JobsList from "@/components/JobsList";

interface CandidateProfile {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  headline: string;
  bio: string;
  location: string;
  resumeUrl: string;
  profileComplete: boolean;
  education: any[];
  experience: any[];
  skills: any[];
}

export default function CandidateDashboard() {
  const { data: profile, isLoading: profileLoading } = useQuery<CandidateProfile>({
    queryKey: ['/api/candidate/profile'],
  });

  const { data: invitations, isLoading: invitationsLoading } = useQuery<any[]>({
    queryKey: ['/api/candidate/invitations/recent', { limit: 5 }],
  });

  const { data: applications, isLoading: applicationsLoading } = useQuery<any[]>({
    queryKey: ['/api/candidate/applications'],
  });

  // Profile completion sections
  const profileSections = [
    { name: "Basic Info", isComplete: !!(profile?.firstName && profile?.lastName) },
    { name: "Education", isComplete: !!(profile?.education && profile.education.length > 0) },
    { name: "Experience", isComplete: !!(profile?.experience && profile.experience.length > 0) },
    { name: "Skills & Projects", isComplete: !!(profile?.skills && profile.skills.length > 0) }
  ];

  return (
    <div>
      <h1 className="text-2xl font-medium mb-6">Dashboard</h1>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatsCard 
          title="New Invitations" 
          count={invitations?.filter(inv => inv.status === "pending")?.length || 0} 
          icon={Mail} 
          color="primary" 
        />
        <StatsCard 
          title="Active Applications" 
          count={applications?.filter(app => ["pending", "reviewed", "interview"].includes(app.status))?.length || 0} 
          icon={Briefcase} 
          color="secondary" 
        />
        <StatsCard 
          title="Upcoming Interviews" 
          count={applications?.filter(app => app.status === "interview")?.length || 0} 
          icon={Calendar} 
          color="success" 
        />
      </div>

      {/* Profile Completion */}
      <ProfileCompletionCard sections={profileSections} />

      {/* Recent Invitations and Messages tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
        <Tabs defaultValue="invitations">
          <TabsList className="border-b w-full justify-start rounded-none">
            <TabsTrigger value="invitations" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              Recent Invitations
            </TabsTrigger>
            <TabsTrigger value="messages" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              Recent Messages
            </TabsTrigger>
          </TabsList>
          <TabsContent value="invitations">
            <InvitationsList limit={5} />
          </TabsContent>
          <TabsContent value="messages">
            <div className="p-4 text-center text-neutral-medium">
              No recent messages. Start a conversation with an employer!
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Recommended Jobs */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Recommended Jobs</h2>
          <a href="/candidate/jobs" className="text-primary">View All</a>
        </div>
        <JobsList recommended={true} limit={4} />
      </div>
    </div>
  );
}
