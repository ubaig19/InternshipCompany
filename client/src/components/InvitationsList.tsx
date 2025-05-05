import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Invitation {
  id: number;
  jobId: number;
  candidateId: number;
  message: string;
  status: string;
  createdAt: string;
  job?: {
    id: number;
    title: string;
    company?: {
      id: number;
      name: string;
      logoUrl?: string;
    };
  };
}

interface InvitationsListProps {
  limit?: number;
}

export default function InvitationsList({ limit }: InvitationsListProps) {
  const { toast } = useToast();
  
  const { data: invitations, isLoading } = useQuery<Invitation[]>({
    queryKey: [limit ? '/api/candidate/invitations/recent' : '/api/candidate/invitations', { limit }],
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest('PATCH', `/api/invitations/${id}/respond`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidate/invitations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidate/invitations/recent'] });
      toast({
        title: "Response sent",
        description: "Your response has been recorded.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to respond to invitation.",
        variant: "destructive",
      });
    }
  });

  const handleAccept = (id: number) => {
    respondMutation.mutate({ id, status: "accepted" });
  };

  const handleDecline = (id: number) => {
    respondMutation.mutate({ id, status: "declined" });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invitations || invitations.length === 0) {
    return (
      <div className="p-4 text-center text-neutral-medium">
        No invitations yet. Check back later!
      </div>
    );
  }

  const getJobTitle = (invitation: Invitation) => {
    if (invitation.job) {
      return invitation.job.title;
    }
    return "Job Title";
  };

  const getCompanyName = (invitation: Invitation) => {
    if (invitation.job?.company) {
      return invitation.job.company.name;
    }
    return "Company Name";
  };

  const getCompanyLogo = (invitation: Invitation) => {
    return invitation.job?.company?.logoUrl;
  };

  return (
    <div className="p-4">
      {invitations.map((invitation) => (
        <div key={invitation.id} className="border-b border-neutral-light py-4 last:border-0">
          <div className="flex items-start md:items-center flex-col md:flex-row">
            <Avatar className="w-10 h-10">
              {getCompanyLogo(invitation) ? (
                <AvatarImage src={getCompanyLogo(invitation)} alt={getCompanyName(invitation)} />
              ) : null}
              <AvatarFallback className="bg-neutral-light">
                {getCompanyName(invitation).charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="mt-2 md:mt-0 md:ml-4 flex-grow">
              <h3 className="font-medium">{getJobTitle(invitation)}</h3>
              <p className="text-neutral-medium text-sm">{getCompanyName(invitation)}</p>
            </div>
            <div className="mt-2 md:mt-0 w-full md:w-auto flex items-center">
              <span className="text-neutral-medium text-sm mr-4">
                {formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true })}
              </span>
              {invitation.status === "pending" ? (
                <div className="flex space-x-2 ml-auto">
                  <Button 
                    size="sm" 
                    onClick={() => handleAccept(invitation.id)}
                    disabled={respondMutation.isPending}
                  >
                    Accept
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleDecline(invitation.id)}
                    disabled={respondMutation.isPending}
                  >
                    Decline
                  </Button>
                </div>
              ) : (
                <span className="ml-auto px-2 py-1 text-sm rounded bg-neutral-light">
                  {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
