import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building, Users, BriefcaseBusiness, Clock, MapPin, BarChart2, UserPlus, Loader2 } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";

interface Company {
  id: number;
  name: string;
  logoUrl?: string;
  description?: string;
}

interface Job {
  id: number;
  title: string;
  location: string;
  type: string;
  isRemote: boolean;
  createdAt: string;
}

interface JobApplication {
  id: number;
  jobId: number;
  candidateId: number;
  status: string;
  createdAt: string;
  candidate?: {
    id: number;
    firstName: string;
    lastName: string;
    headline?: string;
    skills?: string[];
    resumeUrl?: string;
  };
  job?: Job;
}

export default function EmployerDashboard() {
  const [, navigate] = useLocation();

  // Get company profile
  const { data: company, isLoading: companyLoading } = useQuery<Company>({
    queryKey: ['/api/company'],
  });

  // Get job listings
  const { data: jobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ['/api/company/jobs'],
    enabled: !!company?.id,
  });

  // Get recent applications
  const { data: applications, isLoading: applicationsLoading } = useQuery<JobApplication[]>({
    queryKey: ['/api/company/applications/recent'],
    enabled: !!company?.id,
  });

  // Mock data for chart (in a real app, this would come from an API)
  const applicationsData = [
    { name: "Applied", value: applications?.filter(a => a.status === "pending")?.length || 0 },
    { name: "Reviewed", value: applications?.filter(a => a.status === "reviewed")?.length || 0 },
    { name: "Interview", value: applications?.filter(a => a.status === "interview")?.length || 0 },
    { name: "Accepted", value: applications?.filter(a => a.status === "accepted")?.length || 0 },
    { name: "Rejected", value: applications?.filter(a => a.status === "rejected")?.length || 0 }
  ];

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-neutral-lightest text-neutral-dark';
      case 'reviewed': return 'bg-blue-100 text-blue-800';
      case 'interview': return 'bg-amber-100 text-amber-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-neutral-lightest text-neutral-dark';
    }
  };

  // Check if company profile is complete
  const isCompanyProfileComplete = !!(
    company?.name &&
    company?.description
  );

  const loading = companyLoading || jobsLoading || applicationsLoading;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show company setup prompt if company doesn't exist
  if (!company) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <div className="text-center py-8">
          <Building className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-medium mb-2">Welcome to InternInvitePortal</h2>
          <p className="text-neutral-medium mb-6">Let's set up your company profile to get started</p>
          <Button onClick={() => navigate("/employer/company")}>
            Set Up Company Profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-medium mb-6">Dashboard</h1>

      {!isCompanyProfileComplete && (
        <Card className="mb-6 bg-amber-50 border-amber-200">
          <CardContent className="py-4">
            <div className="flex items-center">
              <div className="mr-4 p-2 bg-amber-100 rounded-full">
                <Building className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-grow">
                <h3 className="font-medium text-amber-800">Complete your company profile</h3>
                <p className="text-amber-700 text-sm">Add more details to your company profile to attract the best candidates.</p>
              </div>
              <Button 
                variant="outline" 
                className="border-amber-500 text-amber-700 hover:bg-amber-100"
                onClick={() => navigate("/employer/company")}
              >
                Complete Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatsCard 
          title="Job Listings" 
          count={jobs?.length || 0} 
          icon={BriefcaseBusiness} 
          color="primary" 
        />
        <StatsCard 
          title="Applicants" 
          count={applications?.length || 0} 
          icon={Users} 
          color="secondary" 
        />
        <StatsCard 
          title="Active Interviews" 
          count={applications?.filter(app => app.status === "interview")?.length || 0} 
          icon={Clock} 
          color="success" 
        />
      </div>

      {/* Applications Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Applications Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:justify-between gap-6">
            <div className="md:w-1/2">
              <div className="space-y-4">
                {applicationsData.map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-sm text-neutral-medium">{item.value}</span>
                    </div>
                    <Progress 
                      value={item.value * 100 / (applications?.length || 1)} 
                      className="h-2" 
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="w-full h-64 flex items-center justify-center bg-neutral-lightest rounded-lg">
                <BarChart2 className="h-16 w-16 text-neutral-medium" />
              </div>
              <p className="text-center text-sm text-neutral-medium mt-2">
                Detailed application statistics
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Applications and Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Recent Applications</CardTitle>
            <Button 
              variant="link" 
              className="text-primary"
              onClick={() => navigate("/employer/applications")}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {applications && applications.length > 0 ? (
              <div className="space-y-4">
                {applications.slice(0, 5).map((application) => (
                  <div key={application.id} className="border rounded-lg p-3">
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {application.candidate ? 
                            `${application.candidate.firstName.charAt(0)}${application.candidate.lastName.charAt(0)}` : 
                            "C"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-grow">
                        <div className="flex justify-between">
                          <h4 className="font-medium">
                            {application.candidate ? 
                              `${application.candidate.firstName} ${application.candidate.lastName}` : 
                              "Candidate"}
                          </h4>
                          <Badge className={getStatusBadgeColor(application.status)}>
                            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-neutral-medium text-sm">
                          Applied for: {application.job?.title || "Job Position"}
                        </p>
                        <p className="text-xs text-neutral-medium">
                          {formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-neutral-medium py-4">
                No applications yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Your Job Listings</CardTitle>
            <Button 
              variant="link" 
              className="text-primary"
              onClick={() => navigate("/employer/jobs")}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {jobs && jobs.length > 0 ? (
              <div className="space-y-4">
                {jobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="border rounded-lg p-3">
                    <h4 className="font-medium">{job.title}</h4>
                    <div className="flex flex-wrap mt-1 text-neutral-medium text-sm">
                      <div className="inline-flex items-center mr-3">
                        <MapPin className="h-3 w-3 mr-1" />
                        {job.isRemote ? 'Remote' : job.location}
                      </div>
                      <div className="inline-flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {job.type}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-neutral-medium">
                        Posted {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                      </p>
                      <div className="flex items-center text-primary text-sm">
                        <UserPlus className="h-3 w-3 mr-1" />
                        <span>
                          {applications?.filter(a => a.jobId === job.id).length || 0} Applicants
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-neutral-medium py-4">
                <p className="mb-3">You haven't posted any jobs yet.</p>
                <Button 
                  onClick={() => navigate("/employer/jobs")}
                  size="sm"
                >
                  Post a Job
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
