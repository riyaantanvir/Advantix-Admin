import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles enum - must be declared before use
export const UserRole = {
  USER: 'user' as const,
  MANAGER: 'manager' as const,
  ADMIN: 'admin' as const,
  SUPER_ADMIN: 'super_admin' as const,
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"), // "user", "manager", "admin", "super_admin"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    roleCheck: sql`CHECK (${table.role} IN ('user', 'manager', 'admin', 'super_admin'))`
  }
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Ad Accounts Management
export const adAccounts = pgTable("ad_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: text("platform").notNull(), // "facebook", "google", "tiktok", etc.
  accountName: text("account_name").notNull(),
  accountId: text("account_id").notNull(), // External account ID
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "restrict" }).notNull(),
  spendLimit: decimal("spend_limit", { precision: 12, scale: 2 }).notNull(),
  totalSpend: decimal("total_spend", { precision: 12, scale: 2 }).default("0"),
  status: text("status").notNull().default("active"), // "active", "suspended"
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Campaign Management
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  startDate: timestamp("start_date").notNull(),
  comments: text("comments"),
  adAccountId: varchar("ad_account_id").references(() => adAccounts.id, { onDelete: "restrict" }).notNull(),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "set null" }),
  status: text("status").notNull().default("active"), // "active", "paused", "completed"
  objective: text("objective").notNull(),
  budget: decimal("budget", { precision: 12, scale: 2 }).notNull(),
  spend: decimal("spend", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client Management
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientName: text("client_name").notNull(),
  businessName: text("business_name").notNull(),
  contactPerson: text("contact_person").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  notes: text("notes"),
  status: text("status").notNull().default("active"), // "active", "paused"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Salary Management
export const salaries = pgTable("salaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  employeeName: text("employee_name").notNull(), // Denormalized for display
  salaryAmount: decimal("salary_amount", { precision: 10, scale: 2 }).notNull(),
  totalHours: integer("total_hours").notNull(),
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }).notNull(),
  bonus: decimal("bonus", { precision: 10, scale: 2 }).default("0"),
  calculatedTotal: decimal("calculated_total", { precision: 10, scale: 2 }),
  month: text("month").notNull(), // "YYYY-MM" format
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    uniqueUserMonth: sql`UNIQUE(${table.userId}, ${table.month})`
  }
});

// Ad Copy Sets for Campaign Management
export const adCopySets = pgTable("ad_copy_sets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }).notNull(),
  setName: text("set_name").notNull(),
  isActive: boolean("is_active").default(false),
  // Facebook Asset Level Details
  age: text("age"),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  adType: text("ad_type"),
  creativeLink: text("creative_link"),
  headline: text("headline"),
  description: text("description"),
  callToAction: text("call_to_action"),
  targetAudience: text("target_audience"),
  placement: text("placement"),
  schedule: text("schedule"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Work Reports
export const workReports = pgTable("work_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  hoursWorked: decimal("hours_worked", { precision: 4, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  status: text("status").notNull().default("submitted"), // "draft", "submitted", "approved"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Validation schemas with role constraints
const UserRoleEnum = z.enum([UserRole.USER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN]);

export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  username: true,
  password: true,
}).extend({
  name: z.string().min(1, "Name is required"),
  password: z.string().min(3, "Password must be at least 3 characters"),
});

// Admin-only user creation schema (for super admins)
export const insertUserWithRoleSchema = insertUserSchema.extend({
  role: UserRoleEnum.default(UserRole.USER),
});

export const insertAdAccountSchema = createInsertSchema(adAccounts).omit({
  id: true,
  totalSpend: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.coerce.date(),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSalarySchema = createInsertSchema(salaries).omit({
  id: true,
  calculatedTotal: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkReportSchema = createInsertSchema(workReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdCopySetSchema = createInsertSchema(adCopySets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertUserWithRole = z.infer<typeof insertUserWithRoleSchema>;
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type LoginRequest = z.infer<typeof loginSchema>;

export type InsertAdAccount = z.infer<typeof insertAdAccountSchema>;
export type AdAccount = typeof adAccounts.$inferSelect;

export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertSalary = z.infer<typeof insertSalarySchema>;
export type Salary = typeof salaries.$inferSelect;

export type InsertWorkReport = z.infer<typeof insertWorkReportSchema>;
export type WorkReport = typeof workReports.$inferSelect;

export type InsertAdCopySet = z.infer<typeof insertAdCopySetSchema>;
export type AdCopySet = typeof adCopySets.$inferSelect;
