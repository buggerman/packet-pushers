// Packet Pushers Global Leaderboard API
// Vercel serverless function for managing global scores

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Anti-cheat validation functions
function validateScore(gameData) {
  const { score, day, startTime, endTime, gameEvents, playerStats } = gameData;
  
  // Basic validation rules
  const gameMinutes = (endTime - startTime) / (1000 * 60);
  const maxPossibleScore = 1000000; // Reasonable maximum
  
  // Rule 1: Game must take reasonable time (at least 5 minutes)
  if (gameMinutes < 5) {
    return { valid: false, reason: 'Game completed too quickly' };
  }
  
  // Rule 2: Score must be within reasonable bounds
  if (score > maxPossibleScore || score < -10000) {
    return { valid: false, reason: 'Score outside reasonable bounds' };
  }
  
  // Rule 3: Day progression must make sense
  if (day < 1 || day > 30) {
    return { valid: false, reason: 'Invalid day progression' };
  }
  
  // Rule 4: Player must have ended with reasonable debt status
  const { debt, cash } = playerStats;
  const netWorth = cash - debt;
  if (Math.abs(netWorth - score) > 1000) {
    return { valid: false, reason: 'Score doesn\'t match net worth' };
  }
  
  // Rule 5: Check for impossible progression patterns
  if (gameEvents && gameEvents.length > 0) {
    // Validate event sequence makes sense
    const eventTypes = gameEvents.map(e => e.type);
    const uniqueEvents = [...new Set(eventTypes)];
    
    // Must have some market activity
    if (!uniqueEvents.some(type => ['buy', 'sell', 'travel'].includes(type))) {
      return { valid: false, reason: 'No market activity detected' };
    }
  }
  
  return { valid: true };
}

function calculateScoreHash(gameData) {
  // Create a hash of critical game data for verification
  const crypto = require('crypto');
  const criticalData = {
    score: gameData.score,
    day: gameData.day,
    startTime: gameData.startTime,
    endTime: gameData.endTime,
    playerStats: gameData.playerStats
  };
  
  return crypto.createHash('sha256')
    .update(JSON.stringify(criticalData))
    .digest('hex')
    .substring(0, 16); // Use first 16 chars for brevity
}

module.exports = async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getLeaderboard(req, res);
      case 'POST':
        return await submitScore(req, res);
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getLeaderboard(req, res) {
  const { limit = 100, timeframe = 'all' } = req.query;
  
  let query = supabase
    .from('leaderboard')
    .select('*')
    .order('score', { ascending: false })
    .limit(parseInt(limit));
  
  // Add timeframe filtering
  if (timeframe === 'daily') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    query = query.gte('created_at', today.toISOString());
  } else if (timeframe === 'weekly') {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    query = query.gte('created_at', weekAgo.toISOString());
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
  
  res.json({
    success: true,
    leaderboard: data,
    timestamp: new Date().toISOString()
  });
}

async function submitScore(req, res) {
  const { playerName, gameData, clientHash } = req.body;
  
  // Validate required fields
  if (!playerName || !gameData || !clientHash) {
    return res.status(400).json({ 
      error: 'Missing required fields: playerName, gameData, clientHash' 
    });
  }
  
  // Validate player name
  if (playerName.length > 50 || playerName.length < 1) {
    return res.status(400).json({ 
      error: 'Player name must be between 1 and 50 characters' 
    });
  }
  
  // Run anti-cheat validation
  const validation = validateScore(gameData);
  if (!validation.valid) {
    return res.status(400).json({ 
      error: 'Score validation failed',
      reason: validation.reason
    });
  }
  
  // Verify hash matches
  const serverHash = calculateScoreHash(gameData);
  if (clientHash !== serverHash) {
    return res.status(400).json({ 
      error: 'Score verification failed',
      reason: 'Data integrity check failed'
    });
  }
  
  // Rate limiting: Check if player has submitted recently
  const recentSubmission = await supabase
    .from('leaderboard')
    .select('created_at')
    .eq('player_name', playerName)
    .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // 5 minutes ago
    .single();
  
  if (recentSubmission.data) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded',
      reason: 'Please wait 5 minutes between submissions'
    });
  }
  
  // Insert score into database
  const scoreData = {
    player_name: playerName,
    score: gameData.score,
    day: gameData.day,
    net_worth: gameData.playerStats.cash - gameData.playerStats.debt,
    game_duration_minutes: Math.round((gameData.endTime - gameData.startTime) / (1000 * 60)),
    verification_hash: serverHash,
    game_version: gameData.version || '2.5.1',
    user_agent: req.headers['user-agent']?.substring(0, 200) || 'Unknown'
  };
  
  const { data, error } = await supabase
    .from('leaderboard')
    .insert([scoreData])
    .select()
    .single();
  
  if (error) {
    console.error('Database insert error:', error);
    return res.status(500).json({ error: 'Failed to save score' });
  }
  
  // Return success with ranking info
  const { count } = await supabase
    .from('leaderboard')
    .select('*', { count: 'exact' })
    .gt('score', gameData.score);
  
  const ranking = (count || 0) + 1;
  
  res.json({
    success: true,
    message: 'Score submitted successfully!',
    ranking: ranking,
    score: gameData.score,
    player: playerName,
    timestamp: new Date().toISOString()
  });
}