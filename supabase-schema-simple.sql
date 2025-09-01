-- Simple Database Update for Game Sessions
-- Run this to add the game sessions table

-- Create the game sessions table
CREATE TABLE game_sessions (
    id VARCHAR(50) PRIMARY KEY,
    player JSONB NOT NULL,
    day INTEGER NOT NULL DEFAULT 1,
    game_running BOOLEAN NOT NULL DEFAULT true,
    game_over BOOLEAN NOT NULL DEFAULT false,
    current_prices JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_game_sessions_last_activity ON game_sessions(last_activity);
CREATE INDEX idx_game_sessions_created_at ON game_sessions(created_at);

-- Enable RLS
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Sessions readable" ON game_sessions FOR SELECT USING (true);
CREATE POLICY "Sessions insertable" ON game_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Sessions updatable" ON game_sessions FOR UPDATE USING (true);
CREATE POLICY "Sessions deletable" ON game_sessions FOR DELETE USING (true);