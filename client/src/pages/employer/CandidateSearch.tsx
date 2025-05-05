import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  MapPin, 
  Briefcase, 
  Loader2, 
  FileText, 
  Send,
  MessageSquare
} from "lucide-react";

// Interface for candidate profile
interface CandidateProfile {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  headline?: string;
  bio?: string;
  location?: string;
  resumeUrl?: string;
  skills?: string[];
  education?: any[];
  experience?: any[];
}

// Interface for job
interface Job {
  id: number;
  title: string;
  companyId: number;
}

export default function CandidateSearch() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile | null>(null);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [invitationMessage, setInvitationMessage] = useState("");
  const [directMessage, setDirectMessage] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  // Search for candidates
  const { data: candidates, isLoading: searchLoading } = useQuery<CandidateProfile[]>({
    queryKey: ['/api/search/candidates', { q: searchQuery }],
    enabled: searchQuery.length > 2, // Only search when query is at least 3 characters
  });

  // Get company jobs for invitations
  const { data: jobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ['/api/company/jobs'],
  });

  // Send invitation mutation
  const sendInvitationMutation = useMutation({
    mutationFn: async ({ 
      candidateId, 
      jobId, 
      message 
    }: { 
      candidateId: number; 
      jobId: number; 
      message: string;
    }) => {
      return apiRequest('POST', '/api/invitations', {
        candidateId,
        jobId,
        message
      });
    },
    onSuccess: () => {
      setIsInviteDialogOpen(false);
      setInvitationMessage("");
      setSelectedJobId(null);
      
      toast({
        title: "Invitation sent",
        description: "Your invitation has been sent to the candidate.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "There was a problem sending the invitation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Send direct message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      content 
    }: { 
      userId: number; 
      content: string;
    }) => {
      return apiRequest('POST', '/api/messages', {
        receiverId: userId,
        content
      });
    },
    onSuccess: () => {
      setIsMessageDialogOpen(false);
      setDirectMessage("");
      
      toast({
        title: "Message sent",
        description: "Your message has been sent to the candidate.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "There was a problem sending the message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendInvitation = () => {
    if (selectedCandidate && selectedJobId) {
      sendInvitationMutation.mutate({
        candidateId: selectedCandidate.id,
        jobId: selectedJobId,
        message: invitationMessage
      });
    }
  };

  const handleSendMessage = () => {
    if (selectedCandidate && directMessage.trim()) {
      sendMessageMutation.mutate({
        userId: selectedCandidate.userId,
        content: directMessage
      });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The query will be triggered automatically due to the dependency on searchQuery
  };

  return (
    <div>
      <h1 className="text-2xl font-medium mb-6">Find Candidates</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search for Candidates</CardTitle>
          <CardDescription>
            Find qualified candidates based on skills, location, or other criteria.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex space-x-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-medium h-4 w-4" />
              <Input
                placeholder="Search by name, skills, location, etc." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={searchQuery.length < 3}>
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Search Results */}
      <Card>
        <CardHeader>
          <CardTitle>Search Results</CardTitle>
        </CardHeader>
        <CardContent>
          {searchLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : candidates && candidates.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {candidates.map((candidate) => (
                <Card key={candidate.id} className="overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {candidate.firstName.charAt(0)}{candidate.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-3">
                          <h3 className="font-medium">
                            {candidate.firstName} {candidate.lastName}
                          </h3>
                          {candidate.headline && (
                            <p className="text-neutral-medium text-sm">{candidate.headline}</p>
                          )}
                          {candidate.location && (
                            <div className="flex items-center text-neutral-medium text-xs mt-1">
                              <MapPin className="h-3 w-3 mr-1" />
                              {candidate.location}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedCandidate(candidate);
                            setIsInviteDialogOpen(true);
                          }}
                        >
                          <Briefcase className="h-4 w-4 mr-1" />
                          Invite
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedCandidate(candidate);
                            setIsMessageDialogOpen(true);
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Message
                        </Button>
                      </div>
                    </div>
                    
                    {candidate.bio && (
                      <p className="mt-3 text-sm text-neutral-dark line-clamp-2">
                        {candidate.bio}
                      </p>
                    )}
                    
                    {candidate.skills && candidate.skills.length > 0 && (
                      <div className="mt-3">
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills.map((skill, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      variant="link" 
                      className="p-0 h-auto mt-2 text-primary text-sm"
                      onClick={() => setSelectedCandidate(candidate)}
                    >
                      View Full Profile
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : searchQuery.length > 2 ? (
            <div className="text-center py-8 text-neutral-medium">
              <p>No candidates found matching your search criteria.</p>
              <p className="mt-2 text-sm">Try different keywords or broaden your search.</p>
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-medium">
              <Search className="h-10 w-10 mx-auto mb-2 text-neutral-light" />
              <p>Enter at least 3 characters to start searching for candidates.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Candidate Profile Dialog */}
      <Dialog open={!!selectedCandidate && !isInviteDialogOpen && !isMessageDialogOpen} onOpenChange={(open) => !open && setSelectedCandidate(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedCandidate && (
            <>
              <DialogHeader>
                <DialogTitle>Candidate Profile</DialogTitle>
              </DialogHeader>
              
              <div className="py-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                  <div className="flex items-center">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="text-lg">
                        {selectedCandidate.firstName.charAt(0)}{selectedCandidate.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="ml-4">
                      <h2 className="text-xl font-medium">
                        {selectedCandidate.firstName} {selectedCandidate.lastName}
                      </h2>
                      {selectedCandidate.headline && (
                        <p className="text-neutral-medium">{selectedCandidate.headline}</p>
                      )}
                      {selectedCandidate.location && (
                        <div className="flex items-center text-neutral-medium text-sm mt-1">
                          <MapPin className="h-4 w-4 mr-1" />
                          {selectedCandidate.location}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0 flex space-x-2">
                    <Button 
                      onClick={() => setIsInviteDialogOpen(true)}
                    >
                      <Briefcase className="h-4 w-4 mr-2" />
                      Invite to Job
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setIsMessageDialogOpen(true)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                  </div>
                </div>
                
                <Tabs defaultValue="about">
                  <TabsList>
                    <TabsTrigger value="about">About</TabsTrigger>
                    <TabsTrigger value="experience">Experience</TabsTrigger>
                    <TabsTrigger value="education">Education</TabsTrigger>
                    <TabsTrigger value="skills">Skills</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="about" className="mt-4">
                    {selectedCandidate.bio ? (
                      <div className="prose max-w-none">
                        <p>{selectedCandidate.bio}</p>
                      </div>
                    ) : (
                      <p className="text-neutral-medium">No bio information available.</p>
                    )}
                    
                    {selectedCandidate.resumeUrl && (
                      <div className="mt-6">
                        <h3 className="text-lg font-medium mb-2">Resume</h3>
                        <Button 
                          variant="outline" 
                          onClick={() => window.open(selectedCandidate.resumeUrl, '_blank')}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Resume
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="experience" className="mt-4">
                    {selectedCandidate.experience && selectedCandidate.experience.length > 0 ? (
                      <div className="space-y-4">
                        {selectedCandidate.experience.map((exp, idx) => (
                          <div key={idx} className="border rounded-lg p-4">
                            <h4 className="font-medium">{exp.position}</h4>
                            <p className="text-neutral-dark">{exp.company}</p>
                            <p className="text-sm text-neutral-medium">
                              {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                              {exp.location && ` · ${exp.location}`}
                            </p>
                            {exp.description && (
                              <p className="mt-2 text-sm">{exp.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-neutral-medium">No experience information available.</p>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="education" className="mt-4">
                    {selectedCandidate.education && selectedCandidate.education.length > 0 ? (
                      <div className="space-y-4">
                        {selectedCandidate.education.map((edu, idx) => (
                          <div key={idx} className="border rounded-lg p-4">
                            <h4 className="font-medium">{edu.institution}</h4>
                            <p className="text-neutral-dark">
                              {edu.degree}
                              {edu.fieldOfStudy && `, ${edu.fieldOfStudy}`}
                            </p>
                            <p className="text-sm text-neutral-medium">
                              {edu.startDate} - {edu.current ? 'Present' : edu.endDate}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-neutral-medium">No education information available.</p>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="skills" className="mt-4">
                    {selectedCandidate.skills && selectedCandidate.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedCandidate.skills.map((skill, idx) => (
                          <Badge key={idx} className="px-3 py-1">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-neutral-medium">No skills information available.</p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Invite to Job Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite to Job</DialogTitle>
            <DialogDescription>
              Invite {selectedCandidate?.firstName} {selectedCandidate?.lastName} to apply for a job position.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Select Job</label>
              <Select
                value={selectedJobId?.toString() || ""}
                onValueChange={(value) => setSelectedJobId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a job position" />
                </SelectTrigger>
                <SelectContent>
                  {jobsLoading ? (
                    <div className="flex justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : jobs && jobs.length > 0 ? (
                    jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id.toString()}>
                        {job.title}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      No jobs available. Create a job first.
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Message (Optional)</label>
              <Textarea
                placeholder="Add a personalized message for the candidate"
                value={invitationMessage}
                onChange={(e) => setInvitationMessage(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsInviteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendInvitation}
              disabled={!selectedJobId || sendInvitationMutation.isPending}
            >
              {sendInvitationMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
              ) : (
                <>Send Invitation</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Message Dialog */}
      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
            <DialogDescription>
              Send a direct message to {selectedCandidate?.firstName} {selectedCandidate?.lastName}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              placeholder="Write your message here..."
              value={directMessage}
              onChange={(e) => setDirectMessage(e.target.value)}
              rows={6}
              className="mt-1"
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsMessageDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendMessage}
              disabled={!directMessage.trim() || sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
              ) : (
                <><Send className="mr-2 h-4 w-4" /> Send Message</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
