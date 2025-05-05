import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Job {
  id: number;
  companyId: number;
  title: string;
  description: string;
  location: string;
  type: string;
  requirements: string[];
  isRemote: boolean;
  company?: {
    id: number;
    name: string;
    logoUrl?: string;
  };
}

interface JobsListProps {
  recommended?: boolean;
  limit?: number;
}

export default function JobsList({ recommended = false, limit }: JobsListProps) {
  const { toast } = useToast();
  
  const queryKey = recommended 
    ? ['/api/candidate/recommended-jobs', { limit }] 
    : ['/api/jobs', { limit }];
  
  const { data: jobs, isLoading } = useQuery<Job[]>({
    queryKey,
  });

  const applyMutation = useMutation({
    mutationFn: async (jobId: number) => {
      await apiRequest('POST', `/api/jobs/${jobId}/apply`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidate/applications'] });
      toast({
        title: "Application submitted",
        description: "Your job application has been submitted successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Application failed",
        description: "There was an error submitting your application. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleApply = (jobId: number) => {
    applyMutation.mutate(jobId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="p-4 text-center text-neutral-medium">
        No jobs found. Check back later!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {jobs.map((job) => (
        <Card key={job.id} className="p-4 hover:shadow-md transition-all">
          <div className="flex">
            <Avatar className="w-12 h-12 rounded-lg">
              {job.company?.logoUrl ? (
                <AvatarImage src={job.company.logoUrl} alt={job.company?.name} />
              ) : null}
              <AvatarFallback className="bg-neutral-light rounded-lg">
                {job.company?.name?.charAt(0) || 'C'}
              </AvatarFallback>
            </Avatar>
            <div className="ml-4">
              <h3 className="font-medium">{job.title}</h3>
              <p className="text-neutral-medium text-sm">{job.company?.name || 'Company'}</p>
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
            <Button 
              variant="link" 
              className="text-primary"
              onClick={() => handleApply(job.id)}
              disabled={applyMutation.isPending}
            >
              Apply
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
