import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Upload, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
import FileUpload from "@/components/FileUpload";

// Step 1: Basic Info
const basicInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  headline: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
});

// Step 2: Education
const educationSchema = z.object({
  institution: z.string().min(1, "Institution name is required"),
  degree: z.string().min(1, "Degree is required"),
  fieldOfStudy: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  current: z.boolean().optional(),
});

// Step 3: Experience
const experienceSchema = z.object({
  company: z.string().min(1, "Company name is required"),
  position: z.string().min(1, "Position is required"),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  current: z.boolean().optional(),
  description: z.string().optional(),
});

// Step 4: Skills & Projects
const skillsSchema = z.object({
  skills: z.array(z.string()).optional(),
});

export default function CandidateOnboarding() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    basicInfo: {} as z.infer<typeof basicInfoSchema>,
    education: {} as z.infer<typeof educationSchema>,
    experience: {} as z.infer<typeof experienceSchema>,
    skills: [] as string[],
  });
  const [newSkill, setNewSkill] = useState("");

  // Forms for each step
  const basicInfoForm = useForm<z.infer<typeof basicInfoSchema>>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      headline: "",
      location: "",
      bio: "",
    },
  });

  const educationForm = useForm<z.infer<typeof educationSchema>>({
    resolver: zodResolver(educationSchema),
    defaultValues: {
      institution: "",
      degree: "",
      fieldOfStudy: "",
      startDate: "",
      endDate: "",
      current: false,
    },
  });

  const experienceForm = useForm<z.infer<typeof experienceSchema>>({
    resolver: zodResolver(experienceSchema),
    defaultValues: {
      company: "",
      position: "",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      description: "",
    },
  });

  // Mutation to create/update profile
  const createProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        // First check if profile exists
        const checkResponse = await fetch('/api/candidate/profile', {
          method: 'GET',
          credentials: 'include',
        });
        
        if (checkResponse.ok) {
          // Profile exists, update it
          const response = await apiRequest('PATCH', '/api/candidate/profile', data);
          return response.json();
        } else {
          // Profile doesn't exist, create it
          const response = await apiRequest('POST', '/api/candidate/profile', data);
          return response.json();
        }
      } catch (error) {
        console.error('Error creating/updating profile:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidate/profile'] });
      
      if (currentStep === 4) {
        toast({
          title: "Profile complete!",
          description: "Your profile has been successfully created.",
        });
        navigate("/candidate/dashboard");
      } else {
        setCurrentStep(prev => prev + 1);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "There was a problem saving your profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleBasicInfoSubmit = (data: z.infer<typeof basicInfoSchema>) => {
    setFormData(prev => ({ ...prev, basicInfo: data }));
    createProfileMutation.mutate({
      ...data,
      profileComplete: false,
    });
  };

  const handleEducationSubmit = (data: z.infer<typeof educationSchema>) => {
    setFormData(prev => ({ ...prev, education: data }));
    createProfileMutation.mutate({
      education: [data],
    });
  };

  const handleExperienceSubmit = (data: z.infer<typeof experienceSchema>) => {
    setFormData(prev => ({ ...prev, experience: data }));
    createProfileMutation.mutate({
      experience: [data],
    });
  };

  const handleSkillsSubmit = () => {
    createProfileMutation.mutate({
      skills: formData.skills,
      resumeUrl,
      profileComplete: true,
    });
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleResumeUpload = (url: string) => {
    setResumeUrl(url);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const progressPercentage = (currentStep / 4) * 100;

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <Briefcase className="text-primary mr-2 h-6 w-6" />
            <span className="font-medium text-lg">InternInvitePortal</span>
          </div>
          <div className="text-sm text-neutral-medium">Step {currentStep} of 4</div>
        </div>
        
        <div className="mb-8">
          <h1 className="text-2xl font-medium">Complete Your Profile</h1>
          <p className="text-neutral-medium mt-2">Tell us about yourself so employers can find you</p>
        </div>
        
        <div className="mb-6">
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex justify-between mt-2">
            <span className={`text-sm ${currentStep === 1 ? 'font-medium text-primary' : 'text-neutral-medium'}`}>Basic Info</span>
            <span className={`text-sm ${currentStep === 2 ? 'font-medium text-primary' : 'text-neutral-medium'}`}>Education</span>
            <span className={`text-sm ${currentStep === 3 ? 'font-medium text-primary' : 'text-neutral-medium'}`}>Experience</span>
            <span className={`text-sm ${currentStep === 4 ? 'font-medium text-primary' : 'text-neutral-medium'}`}>Skills & Resume</span>
          </div>
        </div>
        
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <Form {...basicInfoForm}>
            <form onSubmit={basicInfoForm.handleSubmit(handleBasicInfoSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={basicInfoForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={basicInfoForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={basicInfoForm.control}
                name="headline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Professional Headline</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Computer Science Student at Stanford University" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={basicInfoForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="City, State, Country" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={basicInfoForm.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={4} 
                        placeholder="Tell employers about yourself, your career goals, and what you're looking for" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="submit" 
                  disabled={createProfileMutation.isPending}
                >
                  {createProfileMutation.isPending ? (
                    <>Saving <Loader2 className="ml-2 h-4 w-4 animate-spin" /></>
                  ) : (
                    <>Next Step <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
        
        {/* Step 2: Education */}
        {currentStep === 2 && (
          <Form {...educationForm}>
            <form onSubmit={educationForm.handleSubmit(handleEducationSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={educationForm.control}
                  name="institution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Institution</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="University/College Name" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={educationForm.control}
                  name="degree"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Degree</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Bachelor of Science" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={educationForm.control}
                name="fieldOfStudy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field of Study</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Computer Science" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={educationForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="MM/YYYY" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={educationForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="MM/YYYY or leave blank if current" 
                          {...field}
                          disabled={educationForm.watch("current")} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={educationForm.control}
                name="current"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </FormControl>
                    <FormLabel className="font-normal">I am currently studying here</FormLabel>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-between">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleBack}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <div className="space-x-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={handleSkip}
                  >
                    Skip
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createProfileMutation.isPending}
                  >
                    {createProfileMutation.isPending ? (
                      <>Saving <Loader2 className="ml-2 h-4 w-4 animate-spin" /></>
                    ) : (
                      <>Next Step <ArrowRight className="ml-2 h-4 w-4" /></>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        )}
        
        {/* Step 3: Experience */}
        {currentStep === 3 && (
          <Form {...experienceForm}>
            <form onSubmit={experienceForm.handleSubmit(handleExperienceSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={experienceForm.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Company Name" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={experienceForm.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Software Engineering Intern" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={experienceForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="City, State, Country or Remote" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={experienceForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="MM/YYYY" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={experienceForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="MM/YYYY or leave blank if current" 
                          {...field}
                          disabled={experienceForm.watch("current")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={experienceForm.control}
                name="current"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </FormControl>
                    <FormLabel className="font-normal">I currently work here</FormLabel>
                  </FormItem>
                )}
              />
              
              <FormField
                control={experienceForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={3} 
                        placeholder="Describe your responsibilities and achievements" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-between">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleBack}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <div className="space-x-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={handleSkip}
                  >
                    Skip
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createProfileMutation.isPending}
                  >
                    {createProfileMutation.isPending ? (
                      <>Saving <Loader2 className="ml-2 h-4 w-4 animate-spin" /></>
                    ) : (
                      <>Next Step <ArrowRight className="ml-2 h-4 w-4" /></>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        )}
        
        {/* Step 4: Skills & Resume */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-3">Skills</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {formData.skills.map((skill, index) => (
                  <div 
                    key={index} 
                    className="bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center"
                  >
                    <span>{skill}</span>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-5 w-5 ml-1 p-0"
                      onClick={() => handleRemoveSkill(skill)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add a skill (e.g. JavaScript, Project Management)"
                  className="flex-grow mr-2"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                />
                <Button 
                  onClick={handleAddSkill}
                  disabled={!newSkill.trim()}
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-3">Resume</h3>
              <div className="border-2 border-dashed border-neutral-light rounded-lg p-6 text-center">
                {resumeUrl ? (
                  <div className="flex flex-col items-center">
                    <Check className="h-10 w-10 text-success mb-2" />
                    <p className="text-neutral-medium mb-2">Resume uploaded successfully!</p>
                    <a 
                      href={resumeUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      View Resume
                    </a>
                  </div>
                ) : (
                  <FileUpload 
                    onUploadComplete={handleResumeUpload} 
                    endpoint="/api/candidate/resume" 
                    accept=".pdf,.doc,.docx" 
                  />
                )}
              </div>
            </div>
            
            <div className="flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleBack}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button 
                type="button" 
                onClick={handleSkillsSubmit}
                disabled={createProfileMutation.isPending}
              >
                {createProfileMutation.isPending ? (
                  <>Saving <Loader2 className="ml-2 h-4 w-4 animate-spin" /></>
                ) : (
                  <>Complete Profile <Check className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
