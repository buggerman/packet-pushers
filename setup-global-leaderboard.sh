#!/bin/bash
# Complete automated setup for Packet Pushers Global Leaderboard
# This script sets up both Supabase and Vercel automatically

echo "🎮 Packet Pushers Global Leaderboard Setup"
echo "=========================================="
echo ""

# Check prerequisites
echo "📦 Installing dependencies..."
npm install

# Make scripts executable
chmod +x setup-supabase.sh
chmod +x setup-vercel.sh

echo ""
echo "🗄️  STEP 1: Setting up Supabase database..."
echo "This will:"
echo "- Create Supabase account (if needed)"
echo "- Create new project 'packet-pushers-global'"
echo "- Set up database schema with leaderboard table"
echo "- Configure Row Level Security policies"
echo ""
read -p "Continue with Supabase setup? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./setup-supabase.sh
else
    echo "❌ Skipping Supabase setup"
fi

echo ""
echo "🚀 STEP 2: Setting up Vercel deployment..."
echo "This will:"
echo "- Deploy your game to Vercel"
echo "- Set up serverless API endpoints"
echo "- Configure domain and SSL"
echo ""
read -p "Continue with Vercel setup? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./setup-vercel.sh
else
    echo "❌ Skipping Vercel setup"
fi

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Get your Supabase anon key from: https://supabase.com/dashboard"
echo "2. Add environment variables to Vercel:"
echo "   vercel env add SUPABASE_URL"
echo "   vercel env add SUPABASE_ANON_KEY"
echo "3. Redeploy: vercel --prod"
echo ""
echo "🌐 Your global leaderboard will be live!"
echo "Players worldwide can now compete for high scores!"