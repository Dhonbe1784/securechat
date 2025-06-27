# Deployment Guide for SecureChat

## Quick Deploy to Vercel

### Step 1: Prepare Your Repository
1. Push your code to GitHub
2. Create a new repository or use existing one

### Step 2: Setup Database
1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new database project
3. Copy the connection string (looks like: `postgresql://user:pass@host/db`)

### Step 3: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click "New Project" and import your GitHub repository
3. Add these environment variables in Vercel dashboard:

```
DATABASE_URL=your_neon_connection_string
SESSION_SECRET=any_random_32_character_string
REPL_ID=your_app_name
REPLIT_DOMAINS=your-app.vercel.app
NODE_ENV=production
```

### Step 4: Configure Authentication
1. After deployment, note your Vercel URL (e.g., `your-app.vercel.app`)
2. Update `REPLIT_DOMAINS` environment variable with your actual Vercel domain
3. Redeploy if needed

## Environment Variables Explained

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `SESSION_SECRET` | Random string for session encryption | `abcd1234...` (32+ chars) |
| `REPL_ID` | Your app identifier | `securechat` |
| `REPLIT_DOMAINS` | Your deployment domain | `your-app.vercel.app` |
| `NODE_ENV` | Environment mode | `production` |

## Troubleshooting

### Database Connection Issues
- Ensure DATABASE_URL is correct
- Check if database allows external connections
- Verify database exists and is accessible

### Authentication Problems
- Make sure REPLIT_DOMAINS matches your actual domain
- Check if all auth environment variables are set
- Verify session secret is long enough (32+ characters)

### Build Failures
- Check Node.js version (should be 18+)
- Ensure all dependencies are properly installed
- Review build logs for specific errors

## Free Tier Limits

### Vercel Free Tier
- 100GB bandwidth per month
- 100 serverless function executions per day
- 10 seconds max execution time
- Perfect for small to medium apps

### Neon Free Tier
- 512 MB storage
- 1 database
- No connection limits
- Suitable for development and small production apps

## Alternative Hosting Options

### Netlify
- Similar to Vercel
- Good for static sites with serverless functions
- Easy GitHub integration

### Railway
- Database and app hosting combined
- PostgreSQL included
- Simple deployment process

### Render
- Full-stack app hosting
- Built-in PostgreSQL option
- Automatic SSL certificates