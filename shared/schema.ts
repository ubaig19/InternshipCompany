import { pgTable, text, serial, integer, boolean, timestamp, json, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Base user table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["candidate", "employer"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations for users table
export const usersRelations = relations(users, ({ one, many }) => ({
  candidateProfile: one(candidateProfiles, {
    fields: [users.id],
    references: [candidateProfiles.userId],
  }),
  companyProfile: one(companies, {
    fields: [users.id],
    references: [companies.ownerId],
  }),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" }),
}));

// Candidate profiles
export const candidateProfiles = pgTable("candidate_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  headline: text("headline"),
  bio: text("bio"),
  location: text("location"),
  resumeUrl: text("resume_url"),
  profileComplete: boolean("profile_complete").default(false),
  education: json("education").default([]),
  experience: json("experience").default([]),
  skills: json("skills").default([]),
});

// Relations for candidate profiles
export const candidateProfilesRelations = relations(candidateProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [candidateProfiles.userId],
    references: [users.id],
  }),
  jobApplications: many(jobApplications),
  invitations: many(invitations),
}));

// Companies
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  name: text("name").notNull(),
  description: text("description"),
  industry: text("industry"),
  location: text("location"),
  logoUrl: text("logo_url"),
  website: text("website"),
});

// Relations for companies
export const companiesRelations = relations(companies, ({ one, many }) => ({
  owner: one(users, {
    fields: [companies.ownerId],
    references: [users.id],
  }),
  jobs: many(jobs),
}));

// Jobs
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  type: text("type", { enum: ["full-time", "part-time", "contract"] }).notNull(),
  requirements: json("requirements").default([]),
  isRemote: boolean("is_remote").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

// Relations for jobs
export const jobsRelations = relations(jobs, ({ one, many }) => ({
  company: one(companies, {
    fields: [jobs.companyId],
    references: [companies.id],
  }),
  applications: many(jobApplications),
  invitations: many(invitations),
}));

// Job applications
export const jobApplications = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  jobId: integer("job_id").notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  status: text("status", { enum: ["pending", "reviewed", "interview", "rejected", "accepted"] }).default("pending").notNull(),
  coverLetter: text("cover_letter"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations for job applications
export const jobApplicationsRelations = relations(jobApplications, ({ one }) => ({
  candidate: one(candidateProfiles, {
    fields: [jobApplications.candidateId],
    references: [candidateProfiles.id],
  }),
  job: one(jobs, {
    fields: [jobApplications.jobId],
    references: [jobs.id],
  }),
}));

// Invitations from employers to candidates
export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  candidateId: integer("candidate_id").notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  message: text("message"),
  status: text("status", { enum: ["pending", "accepted", "declined"] }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations for invitations
export const invitationsRelations = relations(invitations, ({ one }) => ({
  job: one(jobs, {
    fields: [invitations.jobId],
    references: [jobs.id],
  }),
  candidate: one(candidateProfiles, {
    fields: [invitations.candidateId],
    references: [candidateProfiles.id],
  }),
}));

// Messages between users
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: integer("receiver_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations for messages
export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receiver",
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCandidateProfileSchema = createInsertSchema(candidateProfiles).omit({
  id: true,
  profileComplete: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
});

export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({
  id: true,
  status: true,
  createdAt: true,
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  status: true, 
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  read: true,
  createdAt: true,
});

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type CandidateProfile = typeof candidateProfiles.$inferSelect;
export type InsertCandidateProfile = z.infer<typeof insertCandidateProfileSchema>;

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;

export type JobApplication = typeof jobApplications.$inferSelect;
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
