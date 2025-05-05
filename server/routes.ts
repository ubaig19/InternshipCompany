import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateToken, createToken, requireCandidate, requireEmployer } from "./middleware/auth";
import multer from "multer";
import { validateFile, uploadToS3 } from "./services/fileUpload";
import { extractTextFromPdf, parseResume } from "./services/resumeParser";
import { setupWebSocket } from "./websocket";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { z } from "zod";
import { insertUserSchema, insertCandidateProfileSchema, insertCompanySchema, insertJobSchema, insertJobApplicationSchema, insertInvitationSchema } from "@shared/schema";

// Setup multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  // Setup WebSocket server
  const wsManager = setupWebSocket(httpServer);

  // Enable cookie parser
  app.use(cookieParser());

  // API Routes - all prefixed with /api
  const apiRouter = app.route("/api");

  // Auth routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const userData = insertUserSchema.parse(req.body);

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ message: "Email already in use" });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Create JWT token
      const token = createToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Set JWT token in HTTP-only cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Return user data (excluding password)
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error during registration" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Validate request
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Create JWT token
      const token = createToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Set JWT token in HTTP-only cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Return user data (excluding password)
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Server error during login" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    // Clear the JWT cookie
    res.clearCookie("token");
    res.json({ message: "Logged out successfully" });
  });

  app.get("/api/auth/me", authenticateToken, async (req: Request, res: Response) => {
    try {
      // User information is already attached to the request by authenticateToken middleware
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return user data (excluding password)
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get a token for WebSocket authentication
  app.get("/api/auth/ws-token", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Create a short-lived token specifically for WebSocket
      const wsToken = createToken({
        userId: req.user!.id,
        email: req.user!.email,
        role: req.user!.role
      });
      
      res.json({ token: wsToken });
    } catch (error) {
      res.status(500).json({ message: "Error generating WebSocket token" });
    }
  });

  // Candidate Profile routes
  app.post("/api/candidate/profile", authenticateToken, requireCandidate, async (req: Request, res: Response) => {
    try {
      // Validate request body
      const profileData = insertCandidateProfileSchema.parse(req.body);

      // Check if profile already exists
      const existingProfile = await storage.getCandidateProfile(req.user!.id);
      if (existingProfile) {
        return res.status(409).json({ message: "Profile already exists" });
      }

      // Create profile
      const profile = await storage.createCandidateProfile({
        ...profileData,
        userId: req.user!.id,
      });

      res.status(201).json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error while creating profile" });
    }
  });

  app.get("/api/candidate/profile", authenticateToken, requireCandidate, async (req: Request, res: Response) => {
    try {
      // Get profile
      const profile = await storage.getCandidateProfile(req.user!.id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Server error while fetching profile" });
    }
  });

  app.patch("/api/candidate/profile", authenticateToken, requireCandidate, async (req: Request, res: Response) => {
    try {
      // Update profile
      const updatedProfile = await storage.updateCandidateProfile(req.user!.id, req.body);
      if (!updatedProfile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      res.json(updatedProfile);
    } catch (error) {
      res.status(500).json({ message: "Server error while updating profile" });
    }
  });

  // Resume upload and parsing
  app.post("/api/candidate/resume", authenticateToken, requireCandidate, upload.single("resume"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Validate file
      const validation = validateFile(req.file);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }

      // Upload to S3
      const { url } = await uploadToS3(req.file, `resumes/${req.user!.id}`);

      // Update candidate profile with resume URL
      const updatedProfile = await storage.updateCandidateResume(req.user!.id, url);
      if (!updatedProfile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      res.json({ url, profile: updatedProfile });
    } catch (error) {
      res.status(500).json({ message: "Server error during file upload" });
    }
  });

  app.post("/api/parse-resume", authenticateToken, upload.single("resume"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Validate file
      const validation = validateFile(req.file, ['application/pdf']);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }

      // Parse resume
      const resumeText = await extractTextFromPdf(req.file.buffer);
      res.json({ text: resumeText });
    } catch (error) {
      res.status(500).json({ message: "Server error during resume parsing" });
    }
  });

  // Company routes
  app.post("/api/company", authenticateToken, requireEmployer, async (req: Request, res: Response) => {
    try {
      // Validate request body
      const companyData = insertCompanySchema.parse(req.body);

      // Check if company already exists for this employer
      const existingCompany = await storage.getCompanyByOwner(req.user!.id);
      if (existingCompany) {
        return res.status(409).json({ message: "Company already exists for this user" });
      }

      // Create company
      const company = await storage.createCompany({
        ...companyData,
        ownerId: req.user!.id,
      });

      res.status(201).json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error while creating company" });
    }
  });

  app.get("/api/company", authenticateToken, requireEmployer, async (req: Request, res: Response) => {
    try {
      // Get company
      const company = await storage.getCompanyByOwner(req.user!.id);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      res.json(company);
    } catch (error) {
      res.status(500).json({ message: "Server error while fetching company" });
    }
  });

  app.patch("/api/company/:id", authenticateToken, requireEmployer, async (req: Request, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);
      
      // Check if company exists and belongs to this employer
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      if (company.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "You do not have permission to update this company" });
      }

      // Update company
      const updatedCompany = await storage.updateCompany(companyId, req.body);
      res.json(updatedCompany);
    } catch (error) {
      res.status(500).json({ message: "Server error while updating company" });
    }
  });

  // Job routes
  app.post("/api/jobs", authenticateToken, requireEmployer, async (req: Request, res: Response) => {
    try {
      // Validate request body
      const jobData = insertJobSchema.parse(req.body);

      // Check if company exists
      const company = await storage.getCompanyByOwner(req.user!.id);
      if (!company) {
        return res.status(404).json({ message: "Company not found for this employer" });
      }

      // Create job
      const job = await storage.createJob({
        ...jobData,
        companyId: company.id,
      });

      res.status(201).json(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error while creating job" });
    }
  });

  app.get("/api/jobs", async (req: Request, res: Response) => {
    try {
      // Get all jobs with optional limit
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const jobs = await storage.getJobs(limit);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: "Server error while fetching jobs" });
    }
  });

  app.get("/api/jobs/:id", async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      res.json(job);
    } catch (error) {
      res.status(500).json({ message: "Server error while fetching job" });
    }
  });

  app.get("/api/company/:id/jobs", async (req: Request, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);
      const jobs = await storage.getJobsByCompany(companyId);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: "Server error while fetching company jobs" });
    }
  });

  app.patch("/api/jobs/:id", authenticateToken, requireEmployer, async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.id);
      
      // Check if job exists
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Check company ownership
      const company = await storage.getCompany(job.companyId);
      if (!company || company.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "You do not have permission to update this job" });
      }

      // Update job
      const updatedJob = await storage.updateJob(jobId, req.body);
      res.json(updatedJob);
    } catch (error) {
      res.status(500).json({ message: "Server error while updating job" });
    }
  });

  app.delete("/api/jobs/:id", authenticateToken, requireEmployer, async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.id);
      
      // Check if job exists
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Check company ownership
      const company = await storage.getCompany(job.companyId);
      if (!company || company.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "You do not have permission to delete this job" });
      }

      // Delete job
      await storage.deleteJob(jobId);
      res.json({ message: "Job deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error while deleting job" });
    }
  });

  // Job application routes
  app.post("/api/jobs/:id/apply", authenticateToken, requireCandidate, async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.id);
      
      // Check if job exists
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Get candidate profile
      const candidateProfile = await storage.getCandidateProfile(req.user!.id);
      if (!candidateProfile) {
        return res.status(404).json({ message: "Candidate profile not found" });
      }

      // Create application
      const application = await storage.createJobApplication({
        jobId,
        candidateId: candidateProfile.id,
        coverLetter: req.body.coverLetter,
      });

      res.status(201).json(application);
    } catch (error) {
      res.status(500).json({ message: "Server error while applying for job" });
    }
  });

  app.get("/api/candidate/applications", authenticateToken, requireCandidate, async (req: Request, res: Response) => {
    try {
      // Get candidate profile
      const candidateProfile = await storage.getCandidateProfile(req.user!.id);
      if (!candidateProfile) {
        return res.status(404).json({ message: "Candidate profile not found" });
      }

      // Get applications
      const applications = await storage.getJobApplicationsByCandidate(candidateProfile.id);
      res.json(applications);
    } catch (error) {
      res.status(500).json({ message: "Server error while fetching applications" });
    }
  });

  app.get("/api/jobs/:id/applications", authenticateToken, requireEmployer, async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.id);
      
      // Check if job exists
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Check company ownership
      const company = await storage.getCompany(job.companyId);
      if (!company || company.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "You do not have permission to view these applications" });
      }

      // Get applications
      const applications = await storage.getJobApplicationsByJob(jobId);
      res.json(applications);
    } catch (error) {
      res.status(500).json({ message: "Server error while fetching job applications" });
    }
  });

  // Invitation routes
  app.post("/api/invitations", authenticateToken, requireEmployer, async (req: Request, res: Response) => {
    try {
      // Validate request body
      const invitationData = insertInvitationSchema.parse(req.body);

      // Check if job exists and belongs to this employer
      const job = await storage.getJob(invitationData.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      const company = await storage.getCompany(job.companyId);
      if (!company || company.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "You do not have permission to create invitations for this job" });
      }

      // Create invitation
      const invitation = await storage.createInvitation(invitationData);

      // Send notification via WebSocket
      wsManager.sendInvitationNotification(invitation.id);

      res.status(201).json(invitation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error while creating invitation" });
    }
  });

  app.get("/api/candidate/invitations", authenticateToken, requireCandidate, async (req: Request, res: Response) => {
    try {
      // Get candidate profile
      const candidateProfile = await storage.getCandidateProfile(req.user!.id);
      if (!candidateProfile) {
        return res.status(404).json({ message: "Candidate profile not found" });
      }

      // Get invitations
      const invitations = await storage.getInvitationsByCandidate(candidateProfile.id);
      res.json(invitations);
    } catch (error) {
      res.status(500).json({ message: "Server error while fetching invitations" });
    }
  });

  app.get("/api/candidate/invitations/recent", authenticateToken, requireCandidate, async (req: Request, res: Response) => {
    try {
      // Get candidate profile
      const candidateProfile = await storage.getCandidateProfile(req.user!.id);
      if (!candidateProfile) {
        return res.status(404).json({ message: "Candidate profile not found" });
      }

      // Get recent invitations
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const invitations = await storage.getRecentInvitationsByCandidate(candidateProfile.id, limit);
      res.json(invitations);
    } catch (error) {
      res.status(500).json({ message: "Server error while fetching invitations" });
    }
  });

  app.patch("/api/invitations/:id/respond", authenticateToken, requireCandidate, async (req: Request, res: Response) => {
    try {
      const invitationId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !["accepted", "declined"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // Get invitation
      const invitation = await storage.getInvitation(invitationId);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      // Get candidate profile
      const candidateProfile = await storage.getCandidateProfile(req.user!.id);
      if (!candidateProfile) {
        return res.status(404).json({ message: "Candidate profile not found" });
      }
      
      // Check if invitation belongs to this candidate
      if (invitation.candidateId !== candidateProfile.id) {
        return res.status(403).json({ message: "You do not have permission to respond to this invitation" });
      }

      // Update invitation status
      const updatedInvitation = await storage.updateInvitationStatus(invitationId, status);
      res.json(updatedInvitation);
    } catch (error) {
      res.status(500).json({ message: "Server error while responding to invitation" });
    }
  });

  // Message routes
  app.get("/api/messages/:userId", authenticateToken, async (req: Request, res: Response) => {
    try {
      const otherUserId = parseInt(req.params.userId);
      
      // Get messages between users
      const messages = await storage.getMessagesBetweenUsers(req.user!.id, otherUserId);
      
      // Mark all messages from the other user as read
      for (const message of messages) {
        if (message.senderId === otherUserId && !message.read) {
          await storage.markMessageAsRead(message.id);
        }
      }
      
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Server error while fetching messages" });
    }
  });

  app.get("/api/messages", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Get recent messages for this user
      const messages = await storage.getRecentMessagesByUser(req.user!.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Server error while fetching messages" });
    }
  });

  app.get("/api/messages/unread/count", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Get unread message count
      const count = await storage.getUnreadMessageCount(req.user!.id);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Server error while counting unread messages" });
    }
  });

  // Search routes
  app.get("/api/search/candidates", authenticateToken, requireEmployer, async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query required" });
      }
      
      // Search candidates
      const candidates = await storage.searchCandidates(query);
      res.json(candidates);
    } catch (error) {
      res.status(500).json({ message: "Server error while searching candidates" });
    }
  });

  app.get("/api/candidate/recommended-jobs", authenticateToken, requireCandidate, async (req: Request, res: Response) => {
    try {
      // Get candidate profile
      const candidateProfile = await storage.getCandidateProfile(req.user!.id);
      if (!candidateProfile) {
        return res.status(404).json({ message: "Candidate profile not found" });
      }

      // Get recommended jobs
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 4;
      const jobs = await storage.getRecommendedJobsForCandidate(candidateProfile.id, limit);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: "Server error while fetching recommended jobs" });
    }
  });

  return httpServer;
}
