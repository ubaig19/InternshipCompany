import { useEffect } from "react";
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
import { Loader2 } from "lucide-react";

const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  description: z.string().min(1, "Company description is required"),
  industry: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  logoUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

export default function CompanyProfile() {
  const { toast } = useToast();

  // Get existing company data
  const { data: company, isLoading } = useQuery({
    queryKey: ['/api/company'],
  });

  // Set up form with zod validation
  const form = useForm<z.infer<typeof companySchema>>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      description: "",
      industry: "",
      location: "",
      website: "",
      logoUrl: "",
    },
  });

  // Update form when company data is loaded
  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name || "",
        description: company.description || "",
        industry: company.industry || "",
        location: company.location || "",
        website: company.website || "",
        logoUrl: company.logoUrl || "",
      });
    }
  }, [company, form]);

  // Create or update company profile
  const companyMutation = useMutation({
    mutationFn: async (data: z.infer<typeof companySchema>) => {
      if (company) {
        // Update existing profile
        return apiRequest('PATCH', `/api/company/${company.id}`, data);
      } else {
        // Create new profile
        return apiRequest('POST', '/api/company', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company'] });
      toast({
        title: company ? "Company profile updated" : "Company profile created",
        description: company ? "Your company profile has been updated successfully." : "Your company profile has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "There was a problem saving your company profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof companySchema>) => {
    companyMutation.mutate(data);
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
      <h1 className="text-2xl font-medium mb-6">Company Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>{company ? "Edit Company Profile" : "Create Company Profile"}</CardTitle>
          <CardDescription>
            {company
              ? "Update your company information to attract the best candidates."
              : "Tell candidates about your company and what makes it a great place to work."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={5} 
                        placeholder="Tell candidates about your company, mission, culture, and values." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Technology, Healthcare, Finance" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. San Francisco, CA" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://www.example.com" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://www.example.com/logo.png" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={companyMutation.isPending}
                >
                  {companyMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    <>{company ? "Update Profile" : "Create Profile"}</>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
