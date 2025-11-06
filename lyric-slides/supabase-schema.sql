-- Database schema for lyric-slides app
-- Run this in your Supabase SQL editor after creating a project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User libraries table (stores songs)
CREATE TABLE IF NOT EXISTS user_libraries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_data JSONB NOT NULL, -- Stores the full Song object
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User setlists table (stores queue and recents)
CREATE TABLE IF NOT EXISTS user_setlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  queue JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of song IDs
  recents JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of song IDs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) -- One setlist per user
);

-- Saved setlists table (stores multiple named setlists per user)
CREATE TABLE IF NOT EXISTS saved_setlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  song_ids JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of song IDs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_libraries_user_id ON user_libraries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_setlists_user_id ON user_setlists(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_setlists_user_id ON saved_setlists(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_setlists_created_at ON saved_setlists(user_id, created_at DESC);

-- Unique index to ensure one song per user per song ID
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_libraries_unique_song 
  ON user_libraries(user_id, ((song_data->>'id')));

-- Row Level Security (RLS) policies
ALTER TABLE user_libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_setlists ENABLE ROW LEVEL SECURITY;

-- Users can only access their own libraries
CREATE POLICY "Users can view their own libraries"
  ON user_libraries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own libraries"
  ON user_libraries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own libraries"
  ON user_libraries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own libraries"
  ON user_libraries FOR DELETE
  USING (auth.uid() = user_id);

-- Users can only access their own setlists
CREATE POLICY "Users can view their own setlists"
  ON user_setlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own setlists"
  ON user_setlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own setlists"
  ON user_setlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own setlists"
  ON user_setlists FOR DELETE
  USING (auth.uid() = user_id);

-- Users can only access their own saved setlists
CREATE POLICY "Users can view their own saved setlists"
  ON saved_setlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved setlists"
  ON saved_setlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved setlists"
  ON saved_setlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved setlists"
  ON saved_setlists FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_user_libraries_updated_at
  BEFORE UPDATE ON user_libraries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_setlists_updated_at
  BEFORE UPDATE ON user_setlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_setlists_updated_at
  BEFORE UPDATE ON saved_setlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

