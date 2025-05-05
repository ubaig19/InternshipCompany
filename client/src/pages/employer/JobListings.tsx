import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MoreVertical, 
  Edit, 
  Trash, 
  PlusCircle, 
  Clock, 
  MapPin, 
  UserPlus, 
  Briefcase, 
  Search, 
  Loader2,
  X,
  Plus
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

// Job form schema
const jobSchema = z.object({
  title: z.string().min(1, "Job title is required"),
  description: z.string().min(1, "Job description is required"),
  location: z.string().optional(),
  type: z.enum(["full-time", "part-time", "contract"], {
    required_error: "Please select a job type",
  }),
  isRemote: z.boolean().default(false),
  requirements: z.array(z.string()).optional(),
  expiresAt: z.string().optional(),
});

// Interface for Job data
interface Job {
  id: number;
  companyId: number;
  title: string;
  description: string;
  location: string;
  type: string;
  requirements: string[];
  isRemote: boolean;
  createdAt: string;
  expiresAt?: string;
}

// Interface for Company data
interface Company {
  id: number;
  name: string;
  logoUrl?: string;
}

// Interface for Application data
interface JobApplication {
  id: number;
  jobId: number;
  candidateId: number;
  status: string;
  coverLetter?: string;
  createdAt: string;
  candidate?: {
    id: number;
    firstName: string;
    lastName: string;
    headline?: string;
    location?: string;
    resumeUrl?: string;
  };
}

export default function JobListings() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newRequirement, setNewRequirement] = useState("");
  const [requirementsList, setRequirementsList] = useState<string[]>([]);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  // Get company info
  const { data: company, isLoading: companyLoading } = useQuery<Company>({
    queryKey: ['/api/company'],
  });

  // Get job listings
  const { data: jobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ['/api/company/jobs'],
    enabled: !!company?.id,
  });

  // Get job applications for the active job
  const { data: applications, isLoading: applicationsLoading } = useQuery<JobApplication[]>({
    queryKey: [`/api/jobs/${activeJobId}/applications`],
    enabled: !!activeJobId,
  });

  // Setup form with zod validation
  const jobForm = useForm<z.infer<typeof jobSchema>>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      type: "full-time",
      isRemote: false,
      requirements: [],
      expiresAt: "",
    },
  });

  // Update form when editing a job
  useEffect(() => {
    if (currentJob) {
      jobForm.reset({
        title: currentJob.title,
        description: currentJob.description,
        location: currentJob.location || "",
        type: currentJob.type as "full-time" | "part-time" | "contract",
        isRemote: currentJob.isRemote,
        requirements: currentJob.requirements || [],
        expiresAt: currentJob.expiresAt || "",
      });
      setRequirementsList(currentJob.requirements || []);
    }
  }, [currentJob, jobForm]);

  // Clear form when creating a new job
  const handleCreateJobClick = () => {
    setCurrentJob(null);
    jobForm.reset({
      title: "",
      description: "",
      location: "",
      type: "full-time",
      isRemote: false,
      requirements: [],
      expiresAt: "",
    });
    setRequirementsList([]);
    setIsCreateDialogOpen(true);
  };

  // Set up editing a job
  const handleEditJobClick = (job: Job) => {
    setCurrentJob(job);
    setIsEditDialogOpen(true);
  };

  // Add a requirement to the list
  const handleAddRequirement = () => {
    if (newRequirement.trim() && !requirementsList.includes(newRequirement.trim())) {
      const updatedRequirements = [...requirementsList, newRequirement.trim()];
      setRequirementsList(updatedRequirements);
      jobForm.setValue("requirements", updatedRequirements);
      setNewRequirement("");
    }
  };

  // Remove a requirement from the list
  const handleRemoveRequirement = (requirement: string) => {
    const updatedRequirements = requirementsList.filter(req => req !== requirement);
    setRequirementsList(updatedRequirements);
    jobForm.setValue("requirements", updatedRequirements);
  };

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: async (data: z.infer<typeof jobSchema>) => {
      return apiRequest('POST', '/api/jobs', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/jobs'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Job created",
        description: "Your job listing has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "There was a problem creating your job listing. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update job mutation
  const updateJobMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof jobSchema> }) => {
      return apiRequest('PATCH', `/api/jobs/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/jobs'] });
      setIsEditDialogOpen(false);
      toast({
        title: "Job updated",
        description: "Your job listing has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "There was a problem updating your job listing. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete job mutation
  const deleteJobMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/jobs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/jobs'] });
      setConfirmDelete(null);
      toast({
        title: "Job deleted",
        description: "Your job listing has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "There was a problem deleting your job listing. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update application status mutation
  const updateApplicationStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest('PATCH', `/api/applications/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${activeJobId}/applications`] });
      toast({
        title: "Status updated",
        description: "The application status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "There was a problem updating the application status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Submit handler for creating a job
  const onCreateSubmit = (data: z.infer<typeof jobSchema>) => {
    createJobMutation.mutate({
      ...data,
      requirements: requirementsList,
    });
  };

  // Submit handler for updating a job
  const onUpdateSubmit = (data: z.infer<typeof jobSchema>) => {
    if (currentJob) {
      updateJobMutation.mutate({
        id: currentJob.id,
        data: {
          ...data,
          requirements: requirementsList,
        },
      });
    }
  };

  // Filter jobs based on search query
  const filteredJobs = jobs?.filter(job => 
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle application status change
  const handleStatusChange = (applicationId: number, status: string) => {
    updateApplicationStatusMutation.mutate({ id: applicationId, status });
  };

  // View applications for a specific job
  const handleViewApplications = (jobId: number) => {
    setActiveJobId(jobId);
  };

  const isLoading = companyLoading || jobsLoading;

  if (isLoading) {
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
          <Briefcase className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-medium mb-2">Set Up Your Company First</h2>
          <p className="text-neutral-medium mb-6">You need to create your company profile before posting jobs.</p>
          <Button onClick={() => window.location.href = "/employer/company"}>
            Set Up Company Profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-medium">Job Listings</h1>
        <Button onClick={handleCreateJobClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Post New Job
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Your Job Listings</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-medium h-4 w-4" />
              <Input
                placeholder="Search jobs" 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredJobs && filteredJobs.length > 0 ? (
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <div key={job.id} className="border rounded-lg p-4 hover:shadow-sm transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-lg">{job.title}</h3>
                      <div className="flex items-center text-neutral-medium text-sm mt-1">
                        <span className="flex items-center mr-4">
                          <MapPin className="h-4 w-4 mr-1" />
                          {job.isRemote ? 'Remote' : job.location}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {job.type.charAt(0).toUpperCase() + job.type.slice(1)}
                        </span>
                      </div>
                      <div className="flex flex-wrap mt-2">
                        {job.requirements && job.requirements.map((req, index) => (
                          <Badge key={index} variant="secondary" className="mr-2 mb-1">
                            {req}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewApplications(job.id)}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Applications
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditJobClick(job)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600" 
                            onClick={() => setConfirmDelete(job.id)}
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-neutral-medium">
                    <p>
                      Posted {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                      {job.expiresAt && ` · Expires ${formatDistanceToNow(new Date(job.expiresAt), { addSuffix: true })}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-medium">
              {searchQuery ? (
                <p>No job listings match your search.</p>
              ) : (
                <div>
                  <p className="mb-4">You haven't posted any jobs yet.</p>
                  <Button onClick={handleCreateJobClick}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Post your first job
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {activeJobId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Applications for {jobs?.find(job => job.id === activeJobId)?.title}
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setActiveJobId(null)}
              >
                Back to Jobs
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {applicationsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : applications && applications.length > 0 ? (
              <Tabs defaultValue="all">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
                  <TabsTrigger value="interview">Interview</TabsTrigger>
                  <TabsTrigger value="accepted">Accepted</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-4">
                  <div className="space-y-4">
                    {applications.map((application) => (
                      <ApplicationItem 
                        key={application.id} 
                        application={application} 
                        onStatusChange={handleStatusChange} 
                      />
                    ))}
                  </div>
                </TabsContent>
                
                {["pending", "reviewed", "interview", "accepted", "rejected"].map((status) => (
                  <TabsContent key={status} value={status} className="mt-4">
                    <div className="space-y-4">
                      {applications
                        .filter(app => app.status === status)
                        .map((application) => (
                          <ApplicationItem 
                            key={application.id} 
                            application={application} 
                            onStatusChange={handleStatusChange} 
                          />
                        ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <div className="text-center py-6 text-neutral-medium">
                No applications received for this job yet.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Job Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Post a New Job</DialogTitle>
            <DialogDescription>
              Create a new job listing to attract the best candidates.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...jobForm}>
            <form onSubmit={jobForm.handleSubmit(onCreateSubmit)} className="space-y-6">
              <FormField
                control={jobForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Frontend Development Intern" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={jobForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the responsibilities, qualifications, and other details about the position." 
                        rows={5}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={jobForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. San Francisco, CA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={jobForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select job type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="full-time">Full-time</SelectItem>
                          <SelectItem value="part-time">Part-time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={jobForm.control}
                name="isRemote"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Remote Position</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              
              <div>
                <FormLabel>Requirements</FormLabel>
                <div className="flex flex-wrap gap-2 mb-2">
                  {requirementsList.map((req, index) => (
                    <div 
                      key={index} 
                      className="bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center"
                    >
                      <span>{req}</span>
                      <Button 
                        type="button"
                        size="icon" 
                        variant="ghost" 
                        className="h-5 w-5 ml-1 p-0"
                        onClick={() => handleRemoveRequirement(req)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center">
                  <Input
                    value={newRequirement}
                    onChange={(e) => setNewRequirement(e.target.value)}
                    placeholder="Add a requirement (e.g. JavaScript, Project Management)"
                    className="flex-grow mr-2"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRequirement();
                      }
                    }}
                  />
                  <Button 
                    type="button"
                    onClick={handleAddRequirement}
                    disabled={!newRequirement.trim()}
                    size="icon"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <FormField
                control={jobForm.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createJobMutation.isPending}
                >
                  {createJobMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                  ) : (
                    <>Post Job</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Job Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
            <DialogDescription>
              Update your job listing details.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...jobForm}>
            <form onSubmit={jobForm.handleSubmit(onUpdateSubmit)} className="space-y-6">
              <FormField
                control={jobForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Frontend Development Intern" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={jobForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the responsibilities, qualifications, and other details about the position." 
                        rows={5}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={jobForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. San Francisco, CA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={jobForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select job type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="full-time">Full-time</SelectItem>
                          <SelectItem value="part-time">Part-time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={jobForm.control}
                name="isRemote"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Remote Position</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              
              <div>
                <FormLabel>Requirements</FormLabel>
                <div className="flex flex-wrap gap-2 mb-2">
                  {requirementsList.map((req, index) => (
                    <div 
                      key={index} 
                      className="bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center"
                    >
                      <span>{req}</span>
                      <Button 
                        type="button"
                        size="icon" 
                        variant="ghost" 
                        className="h-5 w-5 ml-1 p-0"
                        onClick={() => handleRemoveRequirement(req)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center">
                  <Input
                    value={newRequirement}
                    onChange={(e) => setNewRequirement(e.target.value)}
                    placeholder="Add a requirement (e.g. JavaScript, Project Management)"
                    className="flex-grow mr-2"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRequirement();
                      }
                    }}
                  />
                  <Button 
                    type="button"
                    onClick={handleAddRequirement}
                    disabled={!newRequirement.trim()}
                    size="icon"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <FormField
                control={jobForm.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateJobMutation.isPending}
                >
                  {updateJobMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>
                  ) : (
                    <>Update Job</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job Listing</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this job listing? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDelete(null)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => confirmDelete && deleteJobMutation.mutate(confirmDelete)}
              disabled={deleteJobMutation.isPending}
            >
              {deleteJobMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
              ) : (
                <>Delete Job</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Component for displaying application items
function ApplicationItem({ 
  application, 
  onStatusChange 
}: { 
  application: JobApplication; 
  onStatusChange: (id: number, status: string) => void;
}) {
  const [isViewingResume, setIsViewingResume] = useState(false);

  return (
    <div className="border rounded-lg p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div className="flex items-start">
          <Avatar className="h-10 w-10">
            {application.candidate?.firstName && application.candidate?.lastName && (
              <AvatarFallback>
                {application.candidate.firstName.charAt(0)}{application.candidate.lastName.charAt(0)}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="ml-3">
            <h4 className="font-medium">
              {application.candidate ? 
                `${application.candidate.firstName} ${application.candidate.lastName}` : 
                "Candidate"}
            </h4>
            <p className="text-neutral-medium text-sm">
              {application.candidate?.headline || ""}
              {application.candidate?.location && ` · ${application.candidate.location}`}
            </p>
            <p className="text-xs text-neutral-medium">
              Applied {formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
        
        <div className="mt-3 md:mt-0 flex flex-wrap items-center gap-2">
          {application.candidate?.resumeUrl && (
            <Dialog open={isViewingResume} onOpenChange={setIsViewingResume}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  View Resume
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Resume</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col h-full">
                  <iframe 
                    src={application.candidate.resumeUrl} 
                    className="w-full h-[60vh]" 
                    title="Resume"
                  />
                  <div className="mt-4 flex justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsViewingResume(false)}
                    >
                      Close
                    </Button>
                    <Button
                      className="ml-2"
                      onClick={() => window.open(application.candidate?.resumeUrl, '_blank')}
                    >
                      Download
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          <Select
            defaultValue={application.status}
            onValueChange={(value) => onStatusChange(application.id, value)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="interview">Interview</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {application.coverLetter && (
        <div className="mt-3 border-t pt-3">
          <h5 className="text-sm font-medium mb-1">Cover Letter</h5>
          <p className="text-sm text-neutral-medium">
            {application.coverLetter}
          </p>
        </div>
      )}
    </div>
  );
}
