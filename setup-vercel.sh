#!/bin/bash
# Automated Vercel setup for Packet Pushers Global Leaderboard

echo "🚀 Setting up Vercel deployment for Packet Pushers..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Login to Vercel (will open browser) 
echo "Please login to Vercel when browser opens..."
vercel login

# Deploy the project
echo "Deploying to Vercel..."
echo "When prompted:"
echo "1. Link to existing project? No"
echo "2. Project name: packet-pushers-global" 
echo "3. Directory: ./ (current directory)"
echo "4. Want to override settings? No"

vercel --prod

# Get deployment URL
DEPLOYMENT_URL=$(vercel ls packet-pushers-global --format json | jq -r '.[0].url')

echo ""
echo "🎉 Vercel deployment complete!"
echo "🌐 Your app URL: https://$DEPLOYMENT_URL"
echo ""
echo "⚙️  Now add environment variables:"
echo "vercel env add SUPABASE_URL"
echo "vercel env add SUPABASE_ANON_KEY"
echo ""
echo "Or set them via dashboard:"
echo "https://vercel.com/dashboard > Your Project > Settings > Environment Variables"
echo ""
echo "Add these values:"
echo "SUPABASE_URL: [Your Supabase URL from setup-supabase.sh]"
echo "SUPABASE_ANON_KEY: [Your anon key from Supabase dashboard]"