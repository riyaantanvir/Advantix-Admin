# Overview

This is a full-stack web application built with React and Express.js, featuring a modern authentication system and admin dashboard. The application is named "Advantix Admin" and provides comprehensive campaign management, client tracking, financial management, and work reporting capabilities. It uses a PostgreSQL database with Drizzle ORM for data persistence and includes a comprehensive UI component library built with shadcn/ui and Tailwind CSS.

## Recent Updates (October 2, 2025)

**Advantix Ads Manager** - New advanced campaign creation system with:
- **3-Step Campaign Wizard**: Guided workflow for creating Facebook ad campaigns
  - Step 1: Campaign Setup (objective, budget, ad account selection, **Facebook Page selection**)
  - Step 2: Audience Targeting (age range slider, gender selection, location targeting, interests)
  - Step 3: Creative Assets (ad copy, headlines, image/video upload with preview)
- **Facebook Pages Integration**: 
  - New facebook_pages table to store Facebook Pages linked to ad accounts
  - Dynamic page selection based on selected ad account
  - API endpoint GET /api/facebook/pages/:adAccountId for fetching pages
  - Optional page selection in campaign wizard with helpful empty state messages
  - **Sync with FB Button**: One-click sync for ad accounts and pages from Facebook Graph API
    - POST /api/facebook/sync-accounts endpoint fetches and stores both ad accounts and pages
    - Real-time feedback with spinning icon during sync and success/error toasts
    - Automatic cache invalidation to refresh data after sync
- **Campaign Drafts Management**: 
  - **Create**: Save drafts at any wizard step before publishing
  - **Edit**: Click Edit button to load draft into wizard and modify any field
  - **Update**: Changes save with PUT /api/campaign-drafts/:id endpoint
  - **Publish**: Launch campaigns directly to Facebook from drafts
  - **Delete**: Remove unwanted drafts
  - Smart targeting state management with fallback defaults
- **Collapsible Sidebar**: Main navigation sidebar available throughout wizard for easy access to other sections
- **Template System**: Foundation for campaign templates and saved audiences
- **Media Upload**: Image and video upload functionality with real-time preview
- **Database Schema**: New tables for campaign_drafts, campaign_templates, saved_audiences, saved_creatives, facebook_pages

**Email Automation** - Email notification system for client communication:
- **Email Settings Configuration**: New Admin panel tab for centralized email setup
  - Provider selection: Resend, SendGrid, or Mailgun support
  - **API Key Storage**: Stored directly in database (email_settings table) per user request, not in Replit Secrets
  - Sender configuration: Email address and display name
  - Notification toggles: Enable/disable email notifications
  - Test connection: Validates API key and provider settings before activation
- **Notification Types**:
  - New Ad Alerts: Automatic emails when new ads are created
  - Daily Performance Summaries: Scheduled reports at configurable times
- **Database Schema**: New email_settings table with provider, apiKey, senderEmail, senderName, and notification preferences
- **API Endpoints**: 
  - GET /api/email/settings - Retrieve current email configuration
  - POST /api/email/settings - Save email settings with validation
  - POST /api/email/test-connection - Verify API key and connection

**SMS Notifications** (October 3, 2025) - Text message alerts for Bangladesh clients:
- **SMS Settings Configuration**: New Admin panel tab for Bangladesh SMS provider setup
  - Provider selection: SMS in BD or BD Bulk SMS (both ~0.16-0.17 BDT per SMS)
  - **API Key Storage**: Stored directly in database (sms_settings table), not in Replit Secrets
  - Sender ID configuration: Phone number or branded sender ID
  - Notification toggles: Master switch and ad-active alerts
  - Test send: Validates API key and sends test SMS to Bangladesh numbers
- **Bangladesh Phone Validation**: 
  - Supports formats: +8801XXXXXXXXX, 8801XXXXXXXXX, or 01XXXXXXXXX
  - Automatic normalization to international format (880...)
  - Regex validation: /^(\+?880|0)?1[3-9]\d{8}$/
- **Notification Types**:
  - Ad Active Alerts: Automatic SMS when ads become active in Bangladesh
- **Database Schema**: New sms_settings table with provider, apiKey, phoneNumber, enableNotifications, enableAdActiveAlerts, isConfigured, lastTestedAt, connectionError
- **API Endpoints**: 
  - GET /api/sms/settings - Retrieve current SMS configuration
  - POST /api/sms/settings - Save SMS settings with validation
  - POST /api/sms/test-send - Send test SMS to verify connection
- **Provider Integration**:
  - SMS in BD: API endpoint https://api.sms.net.bd/sendsms
  - BD Bulk SMS: API endpoint https://api.bdbulksms.com/api/send
  - Cost-effective: 0.16-0.17 BDT per SMS (vs Twilio $0.05-0.10 USD)

**Client Email Notifications** (October 4, 2025) - Per-client email notification preferences for ad account changes:
- **Client Email Preferences Management**: New Admin panel tab for per-client notification settings
  - Client selector dropdown showing client name and email address
  - Visual warnings when email service not configured or client has no email
  - Master notification toggle to enable/disable all notifications for a client
  - Individual toggles for specific notification types
  - Configurable spend warning threshold percentage
- **Notification Types**:
  - Ad Account Activation Alerts: Automatic emails when ad accounts change from inactive to active
  - Ad Account Suspension Alerts: Automatic emails when ad accounts change from active to inactive  
  - Spend Warning Alerts: Emails when ad spend reaches threshold (configurable percentage)
- **Email Templates**: HTML email templates in server/email-templates.ts
  - Professional branded emails with "Advantix Admin" sender name
  - Activation template with platform and account details
  - Suspension template with helpful next steps
  - Spend warning template with current spend and limit information
- **Email Sending**: Centralized email sender utility in server/email-sender.ts
  - Support for Resend, SendGrid, and Mailgun providers
  - Automatic provider selection based on email settings
  - Error handling and logging for failed sends
- **Database Schema**: New client_email_preferences table with:
  - clientId (foreign key to clients table)
  - enableNotifications (master switch)
  - enableAdAccountActivationAlerts, enableAdAccountSuspensionAlerts, enableSpendWarnings
  - spendWarningThreshold (default 80%)
- **API Endpoints**:
  - GET /api/clients/:clientId/email-preferences - Get preferences for specific client
  - POST /api/clients/:clientId/email-preferences - Save client preferences
  - GET /api/clients/email-preferences/all - Get all client preferences (admin only)
- **Integration**: Email notifications automatically triggered in PUT /api/ad-accounts/:id
  - Checks if status changed between inactive and active
  - Verifies client has email preferences enabled
  - Validates email service is configured and client has email address
  - Sends appropriate email template based on status change
  - Errors logged but don't fail the ad account update

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite with custom configuration for development and production

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Token-based authentication with session storage
- **API Design**: RESTful API with centralized error handling
- **Development**: Hot module replacement and custom middleware for request logging

## Database Schema
- **Users Table**: Stores user credentials with unique usernames and active status
- **Sessions Table**: Manages authentication tokens with expiration tracking
- **Validation**: Zod schemas for runtime type validation and form handling
- **Migrations**: Drizzle Kit for database schema management

## Authentication & Authorization
- **Strategy**: Bearer token authentication stored in localStorage
- **Session Management**: Server-side session validation with token expiration
- **Route Protection**: Client-side route guards with authentication checks
- **Default Credentials**: Admin user with username "Admin" and password "2604"

## Component Architecture
- **Design System**: Comprehensive UI component library with consistent theming
- **Form Handling**: React Hook Form with Zod validation resolvers
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Accessibility**: ARIA-compliant components with keyboard navigation support

# External Dependencies

## Core Technologies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight React router
- **zod**: Runtime type validation

## UI & Styling
- **@radix-ui/***: Headless UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library

## Development Tools
- **vite**: Fast build tool and development server
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Fast JavaScript bundler for production
- **@replit/vite-plugin-***: Replit-specific development enhancements

## Session Storage
- **connect-pg-simple**: PostgreSQL session store for Express
- **ws**: WebSocket implementation for Neon database connections

The application follows a monorepo structure with shared schemas between client and server, enabling type safety across the full stack. The authentication system uses a fallback in-memory storage implementation that can be easily replaced with database-backed storage.