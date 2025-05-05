import { 
  type User, type InsertUser, 
  type CandidateProfile, type InsertCandidateProfile,
  type Company, type InsertCompany,
  type Job, type InsertJob,
  type JobApplication, type InsertJobApplication,
  type Invitation, type InsertInvitation,
  type Message, type InsertMessage
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, not, or, like, ilike } from "drizzle-orm";
import * as schema from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Candidate operations
  getCandidateProfile(userId: number): Promise<CandidateProfile | undefined>;
  createCandidateProfile(profile: InsertCandidateProfile): Promise<CandidateProfile>;
  updateCandidateProfile(userId: number, profile: Partial<InsertCandidateProfile>): Promise<CandidateProfile | undefined>;
  updateCandidateResume(userId: number, resumeUrl: string): Promise<CandidateProfile | undefined>;
  searchCandidates(query: string): Promise<CandidateProfile[]>;
  
  // Company operations
  getCompany(id: number): Promise<Company | undefined>;
  getCompanyByOwner(ownerId: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company | undefined>;
  
  // Job operations
  getJob(id: number): Promise<Job | undefined>;
  getJobs(limit?: number): Promise<Job[]>;
  getJobsByCompany(companyId: number): Promise<Job[]>;
  getRecommendedJobsForCandidate(candidateId: number, limit?: number): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, job: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: number): Promise<boolean>;
  
  // Job Application operations
  getJobApplication(id: number): Promise<JobApplication | undefined>;
  getJobApplicationsByCandidate(candidateId: number): Promise<JobApplication[]>;
  getJobApplicationsByJob(jobId: number): Promise<JobApplication[]>;
  createJobApplication(application: InsertJobApplication): Promise<JobApplication>;
  updateJobApplicationStatus(id: number, status: string): Promise<JobApplication | undefined>;
  
  // Invitation operations
  getInvitation(id: number): Promise<Invitation | undefined>;
  getInvitationsByCandidate(candidateId: number): Promise<Invitation[]>;
  getRecentInvitationsByCandidate(candidateId: number, limit?: number): Promise<Invitation[]>;
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  updateInvitationStatus(id: number, status: string): Promise<Invitation | undefined>;
  
  // Message operations
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesBetweenUsers(user1Id: number, user2Id: number, limit?: number): Promise<Message[]>;
  getRecentMessagesByUser(userId: number, limit?: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: number): Promise<Message | undefined>;
  getUnreadMessageCount(userId: number): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(schema.users).values(user).returning();
    return newUser;
  }

  // Candidate operations
  async getCandidateProfile(userId: number): Promise<CandidateProfile | undefined> {
    const [profile] = await db.select().from(schema.candidateProfiles).where(eq(schema.candidateProfiles.userId, userId));
    return profile;
  }

  async createCandidateProfile(profile: InsertCandidateProfile): Promise<CandidateProfile> {
    const [newProfile] = await db.insert(schema.candidateProfiles).values(profile).returning();
    return newProfile;
  }

  async updateCandidateProfile(userId: number, profile: Partial<InsertCandidateProfile>): Promise<CandidateProfile | undefined> {
    const [updatedProfile] = await db
      .update(schema.candidateProfiles)
      .set(profile)
      .where(eq(schema.candidateProfiles.userId, userId))
      .returning();
    return updatedProfile;
  }

  async updateCandidateResume(userId: number, resumeUrl: string): Promise<CandidateProfile | undefined> {
    const [updatedProfile] = await db
      .update(schema.candidateProfiles)
      .set({ resumeUrl })
      .where(eq(schema.candidateProfiles.userId, userId))
      .returning();
    return updatedProfile;
  }

  async searchCandidates(query: string): Promise<CandidateProfile[]> {
    return db
      .select()
      .from(schema.candidateProfiles)
      .where(
        or(
          ilike(schema.candidateProfiles.firstName, `%${query}%`),
          ilike(schema.candidateProfiles.lastName, `%${query}%`),
          ilike(schema.candidateProfiles.headline, `%${query}%`),
          ilike(schema.candidateProfiles.location, `%${query}%`),
          ilike(schema.candidateProfiles.bio, `%${query}%`)
        )
      );
  }

  // Company operations
  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(schema.companies).where(eq(schema.companies.id, id));
    return company;
  }

  async getCompanyByOwner(ownerId: number): Promise<Company | undefined> {
    const [company] = await db.select().from(schema.companies).where(eq(schema.companies.ownerId, ownerId));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db.insert(schema.companies).values(company).returning();
    return newCompany;
  }

  async updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company | undefined> {
    const [updatedCompany] = await db
      .update(schema.companies)
      .set(company)
      .where(eq(schema.companies.id, id))
      .returning();
    return updatedCompany;
  }

  // Job operations
  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, id));
    return job;
  }

  async getJobs(limit: number = 20): Promise<Job[]> {
    return db.select().from(schema.jobs).orderBy(desc(schema.jobs.createdAt)).limit(limit);
  }

  async getJobsByCompany(companyId: number): Promise<Job[]> {
    return db.select().from(schema.jobs).where(eq(schema.jobs.companyId, companyId));
  }

  async getRecommendedJobsForCandidate(candidateId: number, limit: number = 4): Promise<Job[]> {
    // For now, just return the latest jobs - in a real app, this would implement matching logic
    return this.getJobs(limit);
  }

  async createJob(job: InsertJob): Promise<Job> {
    const [newJob] = await db.insert(schema.jobs).values(job).returning();
    return newJob;
  }

  async updateJob(id: number, job: Partial<InsertJob>): Promise<Job | undefined> {
    const [updatedJob] = await db
      .update(schema.jobs)
      .set(job)
      .where(eq(schema.jobs.id, id))
      .returning();
    return updatedJob;
  }

  async deleteJob(id: number): Promise<boolean> {
    const result = await db
      .delete(schema.jobs)
      .where(eq(schema.jobs.id, id));
    return true; // In Drizzle ORM with PostgreSQL, the delete operation doesn't easily return the count
  }

  // Job Application operations
  async getJobApplication(id: number): Promise<JobApplication | undefined> {
    const [application] = await db.select().from(schema.jobApplications).where(eq(schema.jobApplications.id, id));
    return application;
  }

  async getJobApplicationsByCandidate(candidateId: number): Promise<JobApplication[]> {
    return db
      .select()
      .from(schema.jobApplications)
      .where(eq(schema.jobApplications.candidateId, candidateId))
      .orderBy(desc(schema.jobApplications.createdAt));
  }

  async getJobApplicationsByJob(jobId: number): Promise<JobApplication[]> {
    return db
      .select()
      .from(schema.jobApplications)
      .where(eq(schema.jobApplications.jobId, jobId))
      .orderBy(desc(schema.jobApplications.createdAt));
  }

  async createJobApplication(application: InsertJobApplication): Promise<JobApplication> {
    const [newApplication] = await db.insert(schema.jobApplications).values(application).returning();
    return newApplication;
  }

  async updateJobApplicationStatus(id: number, status: string): Promise<JobApplication | undefined> {
    const [updatedApplication] = await db
      .update(schema.jobApplications)
      .set({ status })
      .where(eq(schema.jobApplications.id, id))
      .returning();
    return updatedApplication;
  }

  // Invitation operations
  async getInvitation(id: number): Promise<Invitation | undefined> {
    const [invitation] = await db.select().from(schema.invitations).where(eq(schema.invitations.id, id));
    return invitation;
  }

  async getInvitationsByCandidate(candidateId: number): Promise<Invitation[]> {
    return db
      .select()
      .from(schema.invitations)
      .where(eq(schema.invitations.candidateId, candidateId))
      .orderBy(desc(schema.invitations.createdAt));
  }

  async getRecentInvitationsByCandidate(candidateId: number, limit: number = 5): Promise<Invitation[]> {
    return db
      .select()
      .from(schema.invitations)
      .where(eq(schema.invitations.candidateId, candidateId))
      .orderBy(desc(schema.invitations.createdAt))
      .limit(limit);
  }

  async createInvitation(invitation: InsertInvitation): Promise<Invitation> {
    const [newInvitation] = await db.insert(schema.invitations).values(invitation).returning();
    return newInvitation;
  }

  async updateInvitationStatus(id: number, status: string): Promise<Invitation | undefined> {
    const [updatedInvitation] = await db
      .update(schema.invitations)
      .set({ status })
      .where(eq(schema.invitations.id, id))
      .returning();
    return updatedInvitation;
  }

  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(schema.messages).where(eq(schema.messages.id, id));
    return message;
  }

  async getMessagesBetweenUsers(user1Id: number, user2Id: number, limit: number = 50): Promise<Message[]> {
    return db
      .select()
      .from(schema.messages)
      .where(
        or(
          and(
            eq(schema.messages.senderId, user1Id),
            eq(schema.messages.receiverId, user2Id)
          ),
          and(
            eq(schema.messages.senderId, user2Id),
            eq(schema.messages.receiverId, user1Id)
          )
        )
      )
      .orderBy(desc(schema.messages.createdAt))
      .limit(limit);
  }

  async getRecentMessagesByUser(userId: number, limit: number = 10): Promise<Message[]> {
    return db
      .select()
      .from(schema.messages)
      .where(
        or(
          eq(schema.messages.senderId, userId),
          eq(schema.messages.receiverId, userId)
        )
      )
      .orderBy(desc(schema.messages.createdAt))
      .limit(limit);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(schema.messages).values(message).returning();
    return newMessage;
  }

  async markMessageAsRead(id: number): Promise<Message | undefined> {
    const [updatedMessage] = await db
      .update(schema.messages)
      .set({ read: true })
      .where(eq(schema.messages.id, id))
      .returning();
    return updatedMessage;
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    const result = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(schema.messages)
      .where(
        and(
          eq(schema.messages.receiverId, userId),
          eq(schema.messages.read, false)
        )
      );
    
    return result[0].count || 0;
  }
}

export const storage = new DatabaseStorage();
