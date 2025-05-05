import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, File, Loader2, Check, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface FileUploadProps {
  onUploadComplete?: (url: string) => void;
  accept?: string;
  maxSizeMB?: number;
  endpoint: string;
}

export default function FileUpload({ 
  onUploadComplete, 
  accept = ".pdf,.doc,.docx", 
  maxSizeMB = 5, 
  endpoint 
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('resume', file);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(current => {
          const next = Math.min(current + 10, 90);
          return next;
        });
      }, 300);
      
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Upload failed');
        }
        
        const data = await response.json();
        
        // Set upload to complete
        setUploadProgress(100);
        setTimeout(() => clearInterval(progressInterval), 300);
        
        return data;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "File uploaded successfully",
        description: "Your file has been uploaded.",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/candidate/profile'] });
      
      // Call the callback if provided
      if (onUploadComplete && data.url) {
        onUploadComplete(data.url);
      }
    },
    onError: () => {
      setUploadProgress(0);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
      toast({
        title: "File too large",
        description: `File size must be less than ${maxSizeMB}MB`,
        variant: "destructive",
      });
      return;
    }
    
    // Check file type based on accept prop
    const fileType = file.type;
    const acceptedTypes = accept.split(',').map(type => 
      type.startsWith('.') 
        ? type.substring(1) 
        : type
    );
    
    const isAcceptedType = acceptedTypes.some(type => 
      fileType.includes(type) || 
      file.name.endsWith(`.${type}`)
    );
    
    if (!isAcceptedType) {
      toast({
        title: "Invalid file type",
        description: `File must be one of the following types: ${accept}`,
        variant: "destructive",
      });
      return;
    }
    
    setFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = () => {
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setUploadProgress(0);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="w-full">
      <CardContent className="p-0">
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-neutral-light'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {!file ? (
            <div className="flex flex-col items-center">
              <Upload className="h-10 w-10 text-neutral-medium mb-2" />
              <p className="text-neutral-medium mb-2">
                Drag and drop your file here, or
              </p>
              <Button 
                type="button" 
                onClick={triggerFileInput}
                className="px-4 py-2"
              >
                Choose File
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={accept}
                className="hidden"
              />
              <p className="text-xs text-neutral-medium mt-2">
                Supported formats: {accept.replace(/\./g, '').toUpperCase()} (Max {maxSizeMB}MB)
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-10 w-10 text-primary animate-spin mb-2" />
                  <p className="font-medium mb-2">Uploading...</p>
                  <Progress value={uploadProgress} className="w-full max-w-xs mb-2" />
                </>
              ) : uploadProgress === 100 ? (
                <>
                  <Check className="h-10 w-10 text-success mb-2" />
                  <p className="font-medium mb-2">Upload Complete!</p>
                </>
              ) : (
                <>
                  <File className="h-10 w-10 text-primary mb-2" />
                  <p className="font-medium mb-2">{file.name}</p>
                  <div className="flex space-x-2">
                    <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
                      Upload
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
