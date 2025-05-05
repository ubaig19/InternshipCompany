import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import JobsList from "@/components/JobsList";
import { Search, Briefcase, Clock, MapPin, Building } from "lucide-react";

interface Job {
  id: number;
  title: string;
  company: {
    name: string;
    logoUrl?: string;
  };
  location: string;
  type: string;
  isRemote: boolean;
  requirements: string[];
  description: string;
  createdAt: string;
}

interface JobApplication {
  id: number;
  jobId: number;
  status: string;
  createdAt: string;
  job?: Job;
}

export default function CandidateJobs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Get all available jobs
  const { data: allJobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ['/api/jobs'],
  });

  // Get recommended jobs
  const { data: recommendedJobs, isLoading: recommendedLoading } = useQuery<Job[]>({
    queryKey: ['/api/candidate/recommended-jobs'],
  });

  // Get my applications
  const { data: applications, isLoading: applicationsLoading } = useQuery<JobApplication[]>({
    queryKey: ['/api/candidate/applications'],
  });

  // Apply filters to jobs
  const filterJobs = (jobs: Job[] | undefined) => {
    if (!jobs) return [];
    
    return jobs.filter(job => 
      (searchQuery === "" || 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.name.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (locationFilter === "" || 
        (locationFilter === "remote" ? job.isRemote : job.location.toLowerCase().includes(locationFilter.toLowerCase()))) &&
      (typeFilter === "" || job.type === typeFilter)
    );
  };

  const filteredJobs = filterJobs(allJobs);
  const filteredRecommendedJobs = filterJobs(recommendedJobs);

  // Group applications by status
  const groupedApplications: Record<string, JobApplication[]> = {
    pending: [],
    reviewed: [],
    interview: [],
    accepted: [],
    rejected: [],
  };

  if (applications) {
    applications.forEach(app => {
      if (groupedApplications[app.status]) {
        groupedApplications[app.status].push(app);
      }
    });
  }

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

  return (
    <div>
      <h1 className="text-2xl font-medium mb-6">Jobs</h1>
      
      <Tabs defaultValue="search">
        <TabsList className="mb-6">
          <TabsTrigger value="search">Find Jobs</TabsTrigger>
          <TabsTrigger value="recommended">Recommended</TabsTrigger>
          <TabsTrigger value="applications">My Applications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="search">
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-medium h-4 w-4" />
                  <Input
                    placeholder="Search by job title or company" 
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Locations</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="new york">New York</SelectItem>
                    <SelectItem value="san francisco">San Francisco</SelectItem>
                    <SelectItem value="boston">Boston</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Job Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Available Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredJobs && filteredJobs.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredJobs.map(job => (
                    <Card key={job.id} className="p-4 hover:shadow-md transition-all">
                      <div className="flex">
                        <div className="w-12 h-12 bg-neutral-light rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                          {job.company.logoUrl ? (
                            <img src={job.company.logoUrl} alt={job.company.name} className="w-full h-full object-cover" />
                          ) : (
                            <Building className="h-6 w-6 text-neutral-medium" />
                          )}
                        </div>
                        <div className="ml-4">
                          <h3 className="font-medium">{job.title}</h3>
                          <p className="text-neutral-medium text-sm">{job.company.name}</p>
                          <div className="flex flex-wrap mt-2">
                            {job.requirements && job.requirements.slice(0, 3).map((req, index) => (
                              <Badge key={index} variant="secondary" className="mr-2 mb-1">
                                {req}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between mt-4">
                        <div className="text-sm text-neutral-medium">
                          <span className="inline-flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {job.isRemote ? 'Remote' : job.location}
                          </span>
                          <span className="inline-flex items-center ml-3">
                            <Clock className="h-4 w-4 mr-1" />
                            {job.type}
                          </span>
                        </div>
                        <Button variant="link" className="text-primary">
                          Apply
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center text-neutral-medium py-8">
                  {searchQuery || locationFilter || typeFilter ? 
                    "No jobs match your search criteria." : 
                    "No available jobs at the moment."}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="recommended">
          <Card>
            <CardHeader>
              <CardTitle>Recommended for You</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredRecommendedJobs && filteredRecommendedJobs.length > 0 ? (
                <JobsList recommended={true} />
              ) : (
                <div className="text-center text-neutral-medium py-8">
                  {searchQuery || locationFilter || typeFilter ? 
                    "No recommended jobs match your search criteria." : 
                    "No recommendations available. Complete your profile to get personalized recommendations."}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle>My Applications</CardTitle>
            </CardHeader>
            <CardContent>
              {applications && applications.length > 0 ? (
                <>
                  {Object.entries(groupedApplications).map(([status, apps]) => 
                    apps.length > 0 && (
                      <div key={status} className="mb-6">
                        <h3 className="font-medium mb-3 capitalize">{status} Applications</h3>
                        <div className="space-y-4">
                          {apps.map(app => (
                            <div key={app.id} className="border rounded-lg p-4">
                              <div className="flex flex-col md:flex-row md:items-center justify-between">
                                <div className="flex items-start mb-2 md:mb-0">
                                  <div className="w-10 h-10 bg-neutral-light rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                                    {app.job?.company?.logoUrl ? (
                                      <img src={app.job.company.logoUrl} alt={app.job.company.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <Briefcase className="h-5 w-5 text-neutral-medium" />
                                    )}
                                  </div>
                                  <div className="ml-3">
                                    <h4 className="font-medium">{app.job?.title || "Unknown Job"}</h4>
                                    <p className="text-neutral-medium text-sm">{app.job?.company?.name || "Unknown Company"}</p>
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <Badge className={getStatusBadgeColor(app.status)}>
                                    {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                                  </Badge>
                                  <span className="text-sm text-neutral-medium ml-4">
                                    Applied {new Date(app.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </>
              ) : (
                <div className="text-center text-neutral-medium py-8">
                  You haven't applied to any jobs yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
