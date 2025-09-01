-- Packet Pushers Global Leaderboard Database Schema
-- Run this in your Supabase SQL editor

-- Create the game sessions table for server-side game logic
CREATE TABLE IF NOT EXISTS game_sessions (
    id VARCHAR(50) PRIMARY KEY,
    player JSONB NOT NULL,
    day INTEGER NOT NULL DEFAULT 1,
    game_running BOOLEAN NOT NULL DEFAULT true,
    game_over BOOLEAN NOT NULL DEFAULT false,
    current_prices JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_day CHECK (day >= 1 AND day <= 30)
);

-- Create indexes for game sessions
CREATE INDEX IF NOT EXISTS idx_game_sessions_last_activity ON game_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON game_sessions(created_at);

-- Auto-cleanup old sessions (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM game_sessions 
    WHERE last_activity < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Create the leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
    id BIGSERIAL PRIMARY KEY,
    player_name VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL,
    day INTEGER NOT NULL CHECK (day >= 1 AND day <= 30),
    net_worth INTEGER NOT NULL,
    game_duration_minutes INTEGER NOT NULL CHECK (game_duration_minutes >= 5),
    verification_hash VARCHAR(16) NOT NULL,
    game_version VARCHAR(10) DEFAULT '2.5.1',
    user_agent VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_score CHECK (score >= -10000 AND score <= 1000000),
    CONSTRAINT reasonable_duration CHECK (game_duration_minutes <= 300) -- Max 5 hours
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_created_at ON leaderboard(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_player_recent ON leaderboard(player_name, created_at);

-- Create a view for top scores with additional stats
CREATE OR REPLACE VIEW top_scores AS
SELECT 
    id,
    player_name,
    score,
    day,
    net_worth,
    game_duration_minutes,
    game_version,
    created_at,
    ROW_NUMBER() OVER (ORDER BY score DESC) as ranking
FROM leaderboard
ORDER BY score DESC;

-- Create a view for daily leaderboard
CREATE OR REPLACE VIEW daily_leaderboard AS
SELECT 
    id,
    player_name,
    score,
    day,
    net_worth,
    game_duration_minutes,
    created_at,
    ROW_NUMBER() OVER (ORDER BY score DESC) as daily_ranking
FROM leaderboard
WHERE created_at >= CURRENT_DATE
ORDER BY score DESC;

-- Create a view for weekly leaderboard  
CREATE OR REPLACE VIEW weekly_leaderboard AS
SELECT 
    id,
    player_name,
    score,
    day,
    net_worth,
    game_duration_minutes,
    created_at,
    ROW_NUMBER() OVER (ORDER BY score DESC) as weekly_ranking
FROM leaderboard
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY score DESC;

-- Row Level Security (RLS) policies
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read leaderboard data
CREATE POLICY "Leaderboard is readable by everyone"
ON leaderboard FOR SELECT
USING (true);

-- Policy: Anyone can insert scores (API will handle validation)
CREATE POLICY "Anyone can submit scores"
ON leaderboard FOR INSERT
WITH CHECK (true);

-- Policy: No updates or deletes allowed (integrity preservation)
CREATE POLICY "No updates allowed"
ON leaderboard FOR UPDATE
USING (false);

CREATE POLICY "No deletes allowed"
ON leaderboard FOR DELETE
USING (false);

-- Create a function to get player ranking
CREATE OR REPLACE FUNCTION get_player_ranking(player_score INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) + 1 
        FROM leaderboard 
        WHERE score > player_score
    );
END;
$$ LANGUAGE plpgsql;

-- Create a function to get leaderboard stats
CREATE OR REPLACE FUNCTION get_leaderboard_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_players', COUNT(*),
        'highest_score', MAX(score),
        'average_score', ROUND(AVG(score)),
        'total_games', COUNT(*),
        'games_today', (SELECT COUNT(*) FROM leaderboard WHERE created_at >= CURRENT_DATE),
        'games_this_week', (SELECT COUNT(*) FROM leaderboard WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')
    ) INTO result
    FROM leaderboard;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample data (remove this in production)
INSERT INTO leaderboard (player_name, score, day, net_worth, game_duration_minutes, verification_hash, game_version)
VALUES 
    ('TestPlayer1', 50000, 25, 45000, 15, 'abc123def456', '2.5.1'),
    ('TestPlayer2', 75000, 28, 70000, 22, 'def456ghi789', '2.5.1'),
    ('TestPlayer3', 100000, 30, 95000, 35, 'ghi789jkl012', '2.5.1')
ON CONFLICT DO NOTHING;