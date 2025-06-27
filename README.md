# SecureChat - End-to-End Encrypted Communication Platform

A modern, full-stack real-time communication platform built with React, Express, and PostgreSQL. Features secure messaging, voice calls, and video calls with WebRTC technology.

## Features

- 🔐 **Secure Authentication** - Replit Auth with OpenID Connect
- 💬 **Real-time Messaging** - WebSocket-based instant messaging
- 📞 **Voice & Video Calls** - WebRTC peer-to-peer communication
- 👥 **Contact Management** - Add and manage contacts via email
- 🔄 **Auto-clearing Messages** - Configurable message retention
- 📱 **Responsive Design** - Works on desktop and mobile
- 🌙 **Dark Mode Support** - Toggle between light and dark themes

## Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS + shadcn/ui components
- TanStack Query for state management
- Wouter for routing
- WebRTC for peer-to-peer calls

### Backend
- Node.js + Express.js
- PostgreSQL with Drizzle ORM
- WebSocket for real-time communication
- OpenID Connect authentication
- Session management with PostgreSQL storage

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Replit account (for authentication)

### Environment Variables

Create a `.env` file with:

```env
# Database
DATABASE_URL=your_postgresql_connection_string

# Authentication
REPL_ID=your_replit_app_id
REPLIT_DOMAINS=your-app.replit.app
ISSUER_URL=https://replit.com/oidc

# Session
SESSION_SECRET=your_session_secret_key
```

### Installation

```bash
# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Deployment

### Vercel Deployment

1. **Connect to GitHub**: Push your code to a GitHub repository
2. **Import to Vercel**: Connect your GitHub repo to Vercel
3. **Configure Environment Variables**: Add all `.env` variables to Vercel
4. **Deploy**: Vercel will automatically build and deploy your app

### Environment Variables for Vercel

Set these in your Vercel dashboard:

- `DATABASE_URL` - Your PostgreSQL connection string (recommend Neon)
- `REPL_ID` - Your Replit app ID
- `REPLIT_DOMAINS` - Your Vercel domain (e.g., `your-app.vercel.app`)
- `SESSION_SECRET` - A secure random string
- `NODE_ENV` - Set to `production`

## Database Setup

### Using Neon (Recommended)

1. Create account at [neon.tech](https://neon.tech)
2. Create a new database
3. Copy the connection string to `DATABASE_URL`
4. Run migrations: `npm run db:migrate`

### Local PostgreSQL

1. Install PostgreSQL
2. Create database: `createdb securechat`
3. Set `DATABASE_URL=postgresql://user:password@localhost:5432/securechat`
4. Run migrations: `npm run db:migrate`

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and configs
│   │   └── pages/         # Route components
├── server/                # Express backend
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database operations
│   └── replitAuth.ts      # Authentication setup
├── shared/                # Shared types and schemas
│   └── schema.ts          # Database schema
└── vercel.json           # Vercel deployment config
```

## API Documentation

### Authentication Endpoints
- `GET /api/login` - Initiate login
- `GET /api/callback` - OAuth callback
- `GET /api/logout` - Logout user
- `GET /api/auth/user` - Get current user

### Chat Endpoints
- `GET /api/conversations` - Get user conversations
- `POST /api/conversations` - Create conversation
- `GET /api/conversations/:id/messages` - Get messages
- `POST /api/conversations/:id/messages` - Send message

### Contact Endpoints
- `GET /api/contacts` - Get user contacts
- `POST /api/contacts` - Add contact
- `PUT /api/contacts/:id` - Update contact status

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `npm test`
5. Commit changes: `git commit -m 'Add feature'`
6. Push to branch: `git push origin feature-name`
7. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@securechat.com or create an issue on GitHub.