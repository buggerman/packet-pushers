#!/bin/bash
# Automated Supabase setup for Packet Pushers Global Leaderboard

echo "🚀 Setting up Supabase for Packet Pushers..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Installing Supabase CLI..."
    npm install -g supabase
fi

# Login to Supabase (will open browser)
echo "Please login to Supabase when browser opens..."
supabase login

# Create new project
echo "Creating new Supabase project..."
echo "You'll need to provide:"
echo "1. Organization (your GitHub username)"  
echo "2. Project name: packet-pushers-global"
echo "3. Database password (save this!)"
echo "4. Region: us-east-1 (recommended)"

supabase projects create packet-pushers-global --org-id=$(supabase orgs list --format json | jq -r '.[0].id')

# Get project details
echo "Getting project details..."
PROJECT_REF=$(supabase projects list --format json | jq -r '.[] | select(.name=="packet-pushers-global") | .id')

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Failed to create project. Please create manually at https://supabase.com"
    exit 1
fi

echo "✅ Project created with ID: $PROJECT_REF"

# Generate project URL and keys
SUPABASE_URL="https://$PROJECT_REF.supabase.co"
echo "📋 Your Supabase URL: $SUPABASE_URL"

# Link local project
supabase link --project-ref $PROJECT_REF

# Run the database schema
echo "Setting up database schema..."
supabase db push

echo ""
echo "🎉 Supabase setup complete!"
echo ""
echo "📋 Save these values for Vercel:"
echo "SUPABASE_URL=$SUPABASE_URL"
echo "SUPABASE_ANON_KEY=[Get from Supabase dashboard > Settings > API]"
echo ""
echo "Next: Go to https://supabase.com/dashboard/project/$PROJECT_REF/settings/api"
echo "Copy the 'anon public' key for Vercel environment variables"