-- Create table for storing AI analyses of viral videos
CREATE TABLE IF NOT EXISTS ai_analyses (
  id SERIAL PRIMARY KEY,
  video_id_internal INTEGER REFERENCES videos(id) ON DELETE CASCADE,
  video_id TEXT, -- TikTok video ID
  
  -- Analysis metadata
  analysis_type TEXT NOT NULL, -- e.g., 'claude_3.5_sonnet_structured_v2', 'gemini_1.5_pro_raw_v1'
  model_version TEXT NOT NULL, -- Specific model version used
  source_of_analysis_input TEXT NOT NULL, -- 'transcript', 'gemini_video', 'thumbnail', 'description'
  
  -- Analysis content
  content JSONB, -- Structured analysis output (for Claude)
  raw_text_content TEXT, -- Raw text output (for Gemini)
  
  -- Timestamps
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Create unique constraint to prevent duplicate analyses
  UNIQUE(video_id_internal, analysis_type)
);

-- Create indexes for performance
CREATE INDEX idx_ai_analyses_video_id ON ai_analyses(video_id);
CREATE INDEX idx_ai_analyses_video_id_internal ON ai_analyses(video_id_internal);
CREATE INDEX idx_ai_analyses_type ON ai_analyses(analysis_type);
CREATE INDEX idx_ai_analyses_source ON ai_analyses(source_of_analysis_input);
CREATE INDEX idx_ai_analyses_analyzed_at ON ai_analyses(analyzed_at DESC);

-- Add comment for documentation
COMMENT ON TABLE ai_analyses IS 'Stores AI-generated analyses of viral TikTok videos from various sources';
COMMENT ON COLUMN ai_analyses.analysis_type IS 'Type and version of analysis (e.g., claude_3.5_sonnet_structured_v2)';
COMMENT ON COLUMN ai_analyses.source_of_analysis_input IS 'Source of input text: transcript, gemini_video, thumbnail, or description';
COMMENT ON COLUMN ai_analyses.content IS 'Structured JSON output from Claude analysis';
COMMENT ON COLUMN ai_analyses.raw_text_content IS 'Raw text output from Gemini video analysis';