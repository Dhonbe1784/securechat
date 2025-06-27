# SecureChat - End-to-End Encrypted Communication Platform

## Overview

SecureChat is a modern, full-stack real-time communication platform built with React, Express, and PostgreSQL. The application provides secure messaging, voice calls, and video calls with WebRTC technology. It features a clean, responsive interface built with shadcn/ui components and Tailwind CSS.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **WebSocket**: Native WebSocket implementation for real-time communication
- **Authentication**: Replit Auth with OpenID Connect (OIDC)
- **Session Management**: Express sessions with PostgreSQL storage

### Database Architecture
- **Primary Database**: PostgreSQL with Neon serverless
- **ORM**: Drizzle ORM with type-safe schema definitions
- **Connection Pool**: Neon serverless connection pooling
- **Schema Management**: Drizzle Kit for migrations

## Key Components

### Authentication System
- **Provider**: Replit Auth using OpenID Connect
- **Session Storage**: PostgreSQL-backed sessions with `connect-pg-simple`
- **Session Security**: HTTP-only cookies with secure configuration
- **User Management**: Automatic user creation/updates on login

### Real-time Communication
- **WebSocket Server**: Custom WebSocket implementation with user authentication
- **WebRTC Integration**: Peer-to-peer audio/video calls using native WebRTC APIs
- **Signaling**: WebSocket-based signaling for WebRTC connection establishment
- **Media Handling**: Support for screen sharing, mute/unmute, video toggle

### Database Schema
- **Users Table**: Stores user profiles with Replit Auth integration
- **Contacts Table**: Manages user connections with status tracking
- **Conversations Table**: Handles chat conversations between users
- **Messages Table**: Stores encrypted messages with sender information
- **Call Logs Table**: Tracks voice/video call history and duration
- **Sessions Table**: PostgreSQL session storage for authentication

### UI Components
- **Chat Interface**: Sidebar for conversations, main chat area, message composition
- **Call Modals**: Separate interfaces for voice and video calls
- **Contact Management**: Modal for adding new contacts via email search
- **Responsive Design**: Mobile-first approach with desktop enhancements

## Data Flow

### Message Flow
1. User types message in chat interface
2. Message sent via REST API to server
3. Server validates authentication and stores in database
4. Server broadcasts message to relevant users via WebSocket
5. Recipients receive real-time message updates

### Call Flow
1. User initiates call from chat interface
2. WebSocket signaling establishes WebRTC peer connection
3. Media streams exchanged directly between peers
4. Call metadata logged to database
5. Call termination updates call logs

### Authentication Flow
1. User redirected to Replit Auth provider
2. OIDC authentication with callback handling
3. User session created and stored in PostgreSQL
4. User profile created/updated in database
5. Client receives authenticated user data

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection with WebSocket support
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Unstyled UI primitives for accessibility
- **wouter**: Lightweight client-side routing

### Development Dependencies
- **vite**: Fast development server and build tool
- **typescript**: Type checking and compilation
- **tailwindcss**: Utility-first CSS framework
- **tsx**: TypeScript execution for development

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Development tooling integration

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js 20 with Replit modules
- **Database**: PostgreSQL 16 provisioned automatically
- **Hot Reload**: Vite development server with HMR
- **Port Configuration**: Development server on port 5000

### Production Build
- **Frontend Build**: Vite builds React app to `dist/public`
- **Backend Build**: esbuild bundles server code to `dist/index.js`
- **Asset Serving**: Express serves static files from build directory
- **Process Management**: Single process handling both API and static files

### Replit Configuration
- **Autoscale Deployment**: Configured for automatic scaling
- **Environment Variables**: Database URL and session secrets
- **Port Mapping**: External port 80 maps to internal port 5000
- **WebSocket Support**: WebSocket upgrade handling in Express

## Changelog

Changelog:
- June 27, 2025. Initial setup
- June 27, 2025. Added functional voice and video calling with WebRTC
- June 27, 2025. Implemented user search and contact management system
- June 27, 2025. Fixed API response parsing in ContactModal for proper contact addition
- June 27, 2025. Implemented incoming call notifications and acceptance/rejection system
- June 27, 2025. Added WebSocket signaling improvements and call state debugging
- June 27, 2025. Added conversation auto-clearing feature with 24h/1week/30days/never options
- June 27, 2025. Created conversation settings modal for managing auto-clear preferences and manual message deletion
- June 27, 2025. Fixed infinite call loop by implementing manual call initiation with start buttons
- June 27, 2025. Added Info button functionality and enhanced error logging for debugging
- June 27, 2025. Created GitHub repository setup with README, LICENSE, and .env.example files
- June 27, 2025. Completed Replit to GitHub migration with Vercel deployment configuration
- June 27, 2025. Fixed database schema issues and session management for production deployment
- June 27, 2025. Added comprehensive deployment documentation and GitHub Actions workflow

## User Preferences

Preferred communication style: Simple, everyday language.