-- Packet Pushers Database Schema Update
-- Run this to add game sessions table to existing database

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

-- Enable RLS for game sessions
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Sessions are readable by session ID" ON game_sessions;
DROP POLICY IF EXISTS "Anyone can create sessions" ON game_sessions;
DROP POLICY IF EXISTS "Sessions can be updated" ON game_sessions;
DROP POLICY IF EXISTS "Sessions can be deleted for cleanup" ON game_sessions;

-- Policy: Anyone can read sessions (API will manage access)
CREATE POLICY "Sessions are readable by session ID"
ON game_sessions FOR SELECT
USING (true);

-- Policy: Anyone can create new sessions
CREATE POLICY "Anyone can create sessions"
ON game_sessions FOR INSERT
WITH CHECK (true);

-- Policy: Anyone can update sessions (API will validate)
CREATE POLICY "Sessions can be updated"
ON game_sessions FOR UPDATE
USING (true);

-- Policy: Sessions can be deleted for cleanup
CREATE POLICY "Sessions can be deleted for cleanup"
ON game_sessions FOR DELETE
USING (true);

-- Optional: Add a cleanup job (run this manually or set up as a cron job)
-- SELECT cleanup_old_sessions();

-- Verify tables exist
SELECT 'game_sessions table created successfully' as status
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'game_sessions'
);

SELECT 'leaderboard table exists' as status
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'leaderboard'
);