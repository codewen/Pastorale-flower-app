# Deployment Guide

This project is set up for deployment to Vercel with CI/CD via GitHub Actions.

## Prerequisites

1. A GitHub repository
2. A Vercel account
3. A Supabase project with environment variables

## Setup Instructions

### 1. GitHub Repository Setup

1. Create a new repository on GitHub
2. Push your code to the repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git push -u origin main
   ```

### 2. Vercel Setup

#### Option A: Automatic Setup (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Sign in with your GitHub account
3. Click "Add New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Next.js settings
6. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
7. Click "Deploy"

Vercel will automatically:
- Deploy on every push to main/master
- Create preview deployments for pull requests
- Handle builds and deployments automatically

#### Option B: Manual Setup with GitHub Actions

If you prefer to use GitHub Actions for deployment:

1. **Get Vercel credentials:**
   - Install Vercel CLI: `npm i -g vercel`
   - Run `vercel login`
   - Run `vercel link` in your project directory
   - This will create a `.vercel` folder with `project.json` containing:
     - `orgId` - Your Vercel organization ID
     - `projectId` - Your Vercel project ID

2. **Get Vercel token:**
   - Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
   - Create a new token
   - Copy the token

3. **Add GitHub Secrets:**
   - Go to your GitHub repository
   - Navigate to Settings > Secrets and variables > Actions
   - Add the following secrets:
     - `VERCEL_TOKEN` - Your Vercel token
     - `VERCEL_ORG_ID` - From `.vercel/project.json`
     - `VERCEL_PROJECT_ID` - From `.vercel/project.json`
     - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase URL (optional, for CI)
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key (optional, for CI)

4. **Push to trigger deployment:**
   ```bash
   git push origin main
   ```

### 3. Environment Variables

Make sure to set these environment variables in Vercel:

1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key

These can be set for:
- **Production** - Live production site
- **Preview** - Preview deployments (pull requests)
- **Development** - Local development (if using Vercel CLI)

## CI/CD Workflow

### GitHub Actions

The project includes two GitHub Actions workflows:

1. **`.github/workflows/ci.yml`** - Runs on every push and PR:
   - Lints the code
   - Builds the application
   - Ensures code quality

2. **`.github/workflows/deploy.yml`** - Runs on pushes to main/master:
   - Builds the project
   - Deploys to Vercel production

### Vercel Automatic Deployments

If you use Vercel's automatic setup (Option A), Vercel will:
- Automatically deploy on every push to main/master
- Create preview deployments for pull requests
- Run builds automatically

## Deployment Regions

The `vercel.json` is configured to deploy to `syd1` (Sydney, Australia) region. You can change this in `vercel.json` if needed.

## Troubleshooting

### Build Failures

If builds fail:
1. Check that all environment variables are set in Vercel
2. Verify that Supabase credentials are correct
3. Check the build logs in Vercel dashboard

### GitHub Actions Failures

If GitHub Actions fail:
1. Check that all required secrets are set
2. Verify Vercel credentials are correct
3. Check Actions tab in GitHub for detailed error messages

### Environment Variables Not Working

- Make sure variables are prefixed with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding new environment variables
- Check that variables are set for the correct environment (Production/Preview)

## Manual Deployment

If you need to deploy manually:

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

## Preview Deployments

Every pull request automatically gets a preview deployment URL that you can share for testing.

## Production URL

After deployment, your production URL will be:
- `https://your-project-name.vercel.app`
- Or your custom domain if configured
