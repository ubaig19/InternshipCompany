import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle } from "lucide-react";
import { useLocation } from "wouter";

interface ProfileSection {
  name: string;
  isComplete: boolean;
}

interface ProfileCompletionCardProps {
  sections: ProfileSection[];
}

export default function ProfileCompletionCard({ sections }: ProfileCompletionCardProps) {
  const [, navigate] = useLocation();
  
  const completedSections = sections.filter(section => section.isComplete).length;
  const totalSections = sections.length;
  const completionPercentage = Math.round((completedSections / totalSections) * 100);

  const handleCompleteProfile = () => {
    navigate("/candidate/profile");
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Profile Completion</CardTitle>
        <Button variant="link" onClick={handleCompleteProfile}>
          Complete Profile
        </Button>
      </CardHeader>
      <CardContent>
        <Progress value={completionPercentage} className="h-2" />
        <div className="flex justify-between mt-2 text-sm">
          <span>{completionPercentage}% Complete</span>
          <span>{completedSections}/{totalSections} Sections</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          {sections.map((section, index) => (
            <div 
              key={index}
              className={`border rounded p-3 ${
                section.isComplete 
                  ? "bg-neutral-lightest border-success" 
                  : "bg-neutral-lightest border-neutral-light"
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{section.name}</span>
                {section.isComplete ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <Circle className="h-5 w-5 text-neutral-medium" />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
