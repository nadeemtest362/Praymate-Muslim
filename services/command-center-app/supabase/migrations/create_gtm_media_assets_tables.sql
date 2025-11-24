-- Create gtm_image_assets table
CREATE TABLE gtm_image_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Workflow and task relationship
  workflow_id TEXT,
  task_id TEXT,
  
  -- Image generation details
  prompt TEXT NOT NULL,
  model TEXT NOT NULL,
  model_provider TEXT, -- 'replicate', 'openai', etc.
  aspect_ratio TEXT, -- '9:16', '1:1', etc.
  width INTEGER,
  height INTEGER,
  
  -- Storage details
  file_path TEXT NOT NULL, -- Path in bucket
  public_url TEXT NOT NULL, -- Public accessible URL
  original_url TEXT, -- Original URL from generation service
  file_size INTEGER, -- Size in bytes
  mime_type TEXT,
  
  -- Cost tracking
  cost_estimate DECIMAL(10, 6), -- Estimated cost in USD
  
  -- Metadata
  metadata JSONB DEFAULT '{}', -- Additional metadata
  tags TEXT[] DEFAULT '{}', -- Tags for organization
  
  -- Usage tracking
  used_in_posts INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create gtm_video_assets table
CREATE TABLE gtm_video_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Workflow and task relationship
  workflow_id TEXT,
  task_id TEXT,
  
  -- Video generation details
  prompt TEXT, -- For generated videos
  script TEXT, -- Video script
  source_image_id UUID REFERENCES gtm_image_assets(id), -- If generated from image
  model TEXT NOT NULL,
  model_provider TEXT,
  duration DECIMAL(10, 2), -- Duration in seconds
  fps INTEGER,
  resolution TEXT, -- '1080p', '720p', etc.
  
  -- Storage details
  file_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  original_url TEXT,
  file_size INTEGER,
  mime_type TEXT,
  
  -- Cost tracking
  cost_estimate DECIMAL(10, 6),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  
  -- Usage tracking
  used_in_posts INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX idx_gtm_image_assets_workflow ON gtm_image_assets(workflow_id);
CREATE INDEX idx_gtm_image_assets_task ON gtm_image_assets(task_id);
CREATE INDEX idx_gtm_image_assets_created ON gtm_image_assets(created_at DESC);
CREATE INDEX idx_gtm_image_assets_tags ON gtm_image_assets USING GIN(tags);

CREATE INDEX idx_gtm_video_assets_workflow ON gtm_video_assets(workflow_id);
CREATE INDEX idx_gtm_video_assets_task ON gtm_video_assets(task_id);
CREATE INDEX idx_gtm_video_assets_created ON gtm_video_assets(created_at DESC);
CREATE INDEX idx_gtm_video_assets_source_image ON gtm_video_assets(source_image_id);

-- Enable Row Level Security
ALTER TABLE gtm_image_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE gtm_video_assets ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth strategy)
CREATE POLICY "Public read access" ON gtm_image_assets FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON gtm_image_assets FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON gtm_image_assets FOR UPDATE USING (true);

CREATE POLICY "Public read access" ON gtm_video_assets FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON gtm_video_assets FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON gtm_video_assets FOR UPDATE USING (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_gtm_image_assets_updated_at BEFORE UPDATE ON gtm_image_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gtm_video_assets_updated_at BEFORE UPDATE ON gtm_video_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();