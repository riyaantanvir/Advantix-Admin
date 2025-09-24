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

// Page definitions for access control
export const pages = pgTable("pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pageKey: text("page_key").notNull().unique(), // e.g., "dashboard", "campaigns", "clients"
  displayName: text("display_name").notNull(), // e.g., "Dashboard", "Campaign Management"
  path: text("path").notNull(), // e.g., "/", "/campaigns", "/clients"
  description: text("description"), // Optional description of the page
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Role-based page permissions
export const rolePermissions = pgTable("role_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: text("role").notNull(), // "user", "manager", "admin", "super_admin"
  pageId: varchar("page_id").references(() => pages.id, { onDelete: "cascade" }).notNull(),
  canView: boolean("can_view").default(false),
  canEdit: boolean("can_edit").default(false),
  canDelete: boolean("can_delete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    roleCheck: sql`CHECK (${table.role} IN ('user', 'manager', 'admin', 'super_admin'))`,
    uniqueRolePage: sql`UNIQUE(${table.role}, ${table.pageId})`
  }
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
}).extend({
  date: z.coerce.date(),
  hoursWorked: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0.1;
  }, "Hours worked must be a valid number of at least 0.1"),
});

export const insertAdCopySetSchema = createInsertSchema(adCopySets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPageSchema = createInsertSchema(pages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  role: UserRoleEnum,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Finance Management Tables

// Tags for categorization
export const tags = pgTable("tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#3B82F6"), // Default blue color
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employees for finance tracking (separate from users)
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  department: text("department"),
  position: text("position"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects for finance tracking
export const financeProjects = pgTable("finance_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "restrict" }).notNull(),
  startDate: timestamp("start_date").notNull(),
  budget: decimal("budget", { precision: 12, scale: 2 }).notNull(), // USD
  expense: decimal("expense", { precision: 12, scale: 2 }).default("0"), // BDT
  status: text("status").notNull().default("active"), // "active", "closed"
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payments from clients
export const financePayments = pgTable("finance_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "restrict" }).notNull(),
  projectId: varchar("project_id").references(() => financeProjects.id, { onDelete: "restrict" }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(), // USD
  conversionRate: decimal("conversion_rate", { precision: 8, scale: 4 }).notNull(), // USD to BDT rate
  convertedAmount: decimal("converted_amount", { precision: 12, scale: 2 }).notNull(), // BDT
  currency: text("currency").notNull().default("USD"),
  date: timestamp("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Expenses and Salaries
export const financeExpenses = pgTable("finance_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // "expense", "salary"
  projectId: varchar("project_id").references(() => financeProjects.id, { onDelete: "restrict" }),
  employeeId: varchar("employee_id").references(() => employees.id, { onDelete: "restrict" }), // Employee reference for salaries
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(), // BDT
  currency: text("currency").notNull().default("BDT"),
  date: timestamp("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Settings for exchange rates and configurations
export const financeSettings = pgTable("finance_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(), // "usd_to_bdt_rate", etc.
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for finance tables
export const insertFinanceProjectSchema = createInsertSchema(financeProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.coerce.date(),
  budget: z.coerce.number().min(0, "Budget must be a positive number"),
  expense: z.coerce.number().min(0, "Expense must be a positive number").optional(),
});

export const insertFinancePaymentSchema = createInsertSchema(financePayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  date: z.coerce.date(),
});

export const insertFinanceExpenseSchema = createInsertSchema(financeExpenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  date: z.coerce.date(),
});

export const insertFinanceSettingSchema = createInsertSchema(financeSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export type InsertPage = z.infer<typeof insertPageSchema>;
export type Page = typeof pages.$inferSelect;

export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;

// Finance types
export type InsertFinanceProject = z.infer<typeof insertFinanceProjectSchema>;
export type FinanceProject = typeof financeProjects.$inferSelect;

export type InsertFinancePayment = z.infer<typeof insertFinancePaymentSchema>;
export type FinancePayment = typeof financePayments.$inferSelect;

export type InsertFinanceExpense = z.infer<typeof insertFinanceExpenseSchema>;
export type FinanceExpense = typeof financeExpenses.$inferSelect;

export type InsertFinanceSetting = z.infer<typeof insertFinanceSettingSchema>;
export type FinanceSetting = typeof financeSettings.$inferSelect;

export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tags.$inferSelect;

export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;
