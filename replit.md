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