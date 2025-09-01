-- Add missing policies to existing game_sessions table

-- Enable RLS if not already enabled
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Add policies (will skip if they already exist)
DO $$
BEGIN
    -- Check and create policies only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_sessions' AND policyname = 'Sessions readable') THEN
        CREATE POLICY "Sessions readable" ON game_sessions FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_sessions' AND policyname = 'Sessions insertable') THEN
        CREATE POLICY "Sessions insertable" ON game_sessions FOR INSERT WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_sessions' AND policyname = 'Sessions updatable') THEN
        CREATE POLICY "Sessions updatable" ON game_sessions FOR UPDATE USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_sessions' AND policyname = 'Sessions deletable') THEN
        CREATE POLICY "Sessions deletable" ON game_sessions FOR DELETE USING (true);
    END IF;
END $$;

-- Verify the table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'game_sessions' 
ORDER BY ordinal_position;