import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import FileUpload from "@/components/FileUpload";
import { Loader2, Plus, Trash2 } from "lucide-react";

const basicInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  headline: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
});

const educationItemSchema = z.object({
  institution: z.string().min(1, "Institution name is required"),
  degree: z.string().min(1, "Degree is required"),
  fieldOfStudy: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  current: z.boolean().optional(),
});

const experienceItemSchema = z.object({
  company: z.string().min(1, "Company name is required"),
  position: z.string().min(1, "Position is required"),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  current: z.boolean().optional(),
  description: z.string().optional(),
});

const skillsSchema = z.object({
  skills: z.array(z.string()).optional(),
});

export default function CandidateProfile() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("basic");
  const [educationItems, setEducationItems] = useState<any[]>([]);
  const [experienceItems, setExperienceItems] = useState<any[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ['/api/candidate/profile'],
  });

  // Forms
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

  // Update form values when profile is loaded
  useEffect(() => {
    if (profile) {
      basicInfoForm.reset({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        headline: profile.headline || "",
        location: profile.location || "",
        bio: profile.bio || "",
      });

      if (profile.education && Array.isArray(profile.education)) {
        setEducationItems(profile.education);
      }

      if (profile.experience && Array.isArray(profile.experience)) {
        setExperienceItems(profile.experience);
      }

      if (profile.skills && Array.isArray(profile.skills)) {
        setSkills(profile.skills);
      }
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PATCH', '/api/candidate/profile', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidate/profile'] });
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    },
  });

  const handleBasicInfoSubmit = (data: z.infer<typeof basicInfoSchema>) => {
    updateProfileMutation.mutate(data);
  };

  const handleEducationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const newEducation = {
      institution: formData.get('institution') as string,
      degree: formData.get('degree') as string,
      fieldOfStudy: formData.get('fieldOfStudy') as string,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      current: Boolean(formData.get('current'))
    };
    
    const updatedEducation = [...educationItems, newEducation];
    setEducationItems(updatedEducation);
    updateProfileMutation.mutate({ education: updatedEducation });
    form.reset();
  };

  const handleExperienceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const newExperience = {
      company: formData.get('company') as string,
      position: formData.get('position') as string,
      location: formData.get('location') as string,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      current: Boolean(formData.get('current')),
      description: formData.get('description') as string
    };
    
    const updatedExperience = [...experienceItems, newExperience];
    setExperienceItems(updatedExperience);
    updateProfileMutation.mutate({ experience: updatedExperience });
    form.reset();
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      const updatedSkills = [...skills, newSkill.trim()];
      setSkills(updatedSkills);
      updateProfileMutation.mutate({ skills: updatedSkills });
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const updatedSkills = skills.filter(skill => skill !== skillToRemove);
    setSkills(updatedSkills);
    updateProfileMutation.mutate({ skills: updatedSkills });
  };

  const handleRemoveEducation = (index: number) => {
    const updatedEducation = [...educationItems];
    updatedEducation.splice(index, 1);
    setEducationItems(updatedEducation);
    updateProfileMutation.mutate({ education: updatedEducation });
  };

  const handleRemoveExperience = (index: number) => {
    const updatedExperience = [...experienceItems];
    updatedExperience.splice(index, 1);
    setExperienceItems(updatedExperience);
    updateProfileMutation.mutate({ experience: updatedExperience });
  };

  const handleResumeUpload = (url: string) => {
    updateProfileMutation.mutate({ resumeUrl: url });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-medium mb-6">My Profile</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="skills">Skills & Resume</TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...basicInfoForm}>
                  <form onSubmit={basicInfoForm.handleSubmit(handleBasicInfoSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="education">
            <Card>
              <CardHeader>
                <CardTitle>Education</CardTitle>
              </CardHeader>
              <CardContent>
                {educationItems.length > 0 && (
                  <div className="mb-6 space-y-4">
                    {educationItems.map((item, index) => (
                      <div key={index} className="border p-4 rounded-lg relative">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="absolute top-2 right-2"
                          onClick={() => handleRemoveEducation(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <h3 className="font-medium">{item.institution}</h3>
                        <p>{item.degree}{item.fieldOfStudy ? `, ${item.fieldOfStudy}` : ''}</p>
                        <p className="text-sm text-neutral-medium">
                          {item.startDate} {item.endDate ? `- ${item.endDate}` : item.current ? '- Present' : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                
                <form onSubmit={handleEducationSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <FormLabel htmlFor="institution">Institution</FormLabel>
                      <Input 
                        id="institution" 
                        name="institution" 
                        placeholder="University/College Name" 
                        required 
                      />
                    </div>
                    <div>
                      <FormLabel htmlFor="degree">Degree</FormLabel>
                      <Input 
                        id="degree" 
                        name="degree" 
                        placeholder="e.g. Bachelor of Science" 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <FormLabel htmlFor="fieldOfStudy">Field of Study</FormLabel>
                    <Input 
                      id="fieldOfStudy" 
                      name="fieldOfStudy" 
                      placeholder="e.g. Computer Science" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <FormLabel htmlFor="startDate">Start Date</FormLabel>
                      <Input 
                        id="startDate" 
                        name="startDate" 
                        placeholder="MM/YYYY" 
                      />
                    </div>
                    <div>
                      <FormLabel htmlFor="endDate">End Date</FormLabel>
                      <Input 
                        id="endDate" 
                        name="endDate" 
                        placeholder="MM/YYYY or leave blank if current" 
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="current" 
                      name="current" 
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" 
                    />
                    <FormLabel htmlFor="current" className="font-normal">I am currently studying here</FormLabel>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? "Adding..." : "Add Education"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="experience">
            <Card>
              <CardHeader>
                <CardTitle>Experience</CardTitle>
              </CardHeader>
              <CardContent>
                {experienceItems.length > 0 && (
                  <div className="mb-6 space-y-4">
                    {experienceItems.map((item, index) => (
                      <div key={index} className="border p-4 rounded-lg relative">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="absolute top-2 right-2"
                          onClick={() => handleRemoveExperience(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <h3 className="font-medium">{item.position}</h3>
                        <p>{item.company}{item.location ? `, ${item.location}` : ''}</p>
                        <p className="text-sm text-neutral-medium">
                          {item.startDate} {item.endDate ? `- ${item.endDate}` : item.current ? '- Present' : ''}
                        </p>
                        {item.description && <p className="mt-2 text-sm">{item.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
                
                <form onSubmit={handleExperienceSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <FormLabel htmlFor="company">Company</FormLabel>
                      <Input 
                        id="company" 
                        name="company" 
                        placeholder="Company Name" 
                        required 
                      />
                    </div>
                    <div>
                      <FormLabel htmlFor="position">Position</FormLabel>
                      <Input 
                        id="position" 
                        name="position" 
                        placeholder="e.g. Software Engineering Intern" 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <FormLabel htmlFor="location">Location</FormLabel>
                    <Input 
                      id="location" 
                      name="location" 
                      placeholder="City, State, Country or Remote" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <FormLabel htmlFor="startDate">Start Date</FormLabel>
                      <Input 
                        id="startDate" 
                        name="startDate" 
                        placeholder="MM/YYYY" 
                      />
                    </div>
                    <div>
                      <FormLabel htmlFor="endDate">End Date</FormLabel>
                      <Input 
                        id="endDate" 
                        name="endDate" 
                        placeholder="MM/YYYY or leave blank if current" 
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="current" 
                      name="current" 
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" 
                    />
                    <FormLabel htmlFor="current" className="font-normal">I currently work here</FormLabel>
                  </div>
                  
                  <div>
                    <FormLabel htmlFor="description">Description</FormLabel>
                    <Textarea 
                      id="description" 
                      name="description" 
                      rows={3} 
                      placeholder="Describe your responsibilities and achievements" 
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? "Adding..." : "Add Experience"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="skills">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {skills.map((skill, index) => (
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
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Resume</CardTitle>
                </CardHeader>
                <CardContent>
                  {profile?.resumeUrl ? (
                    <div className="mb-4">
                      <p className="mb-2">Current Resume:</p>
                      <div className="flex items-center">
                        <a 
                          href={profile.resumeUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary underline flex items-center"
                        >
                          <File className="h-5 w-5 mr-2" />
                          View Resume
                        </a>
                      </div>
                      <p className="mt-4 mb-2">Upload a new resume:</p>
                    </div>
                  ) : (
                    <p className="mb-4">Upload your resume to help employers learn more about you.</p>
                  )}
                  
                  <FileUpload 
                    onUploadComplete={handleResumeUpload} 
                    endpoint="/api/candidate/resume" 
                    accept=".pdf,.doc,.docx" 
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
