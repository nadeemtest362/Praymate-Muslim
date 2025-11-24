-- Create tables in COMMAND CENTER database for storing analyses

-- Main analysis table
CREATE TABLE IF NOT EXISTS viral_video_analyses (
  id SERIAL PRIMARY KEY,
  video_id TEXT UNIQUE NOT NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('hook_only', 'caption_only', 'skip_insufficient_data')),
  emotional_core TEXT[] NOT NULL DEFAULT '{}',
  viral_factors TEXT[] NOT NULL DEFAULT '{}',
  content_type TEXT NOT NULL DEFAULT 'unknown',
  execution_details JSONB NOT NULL DEFAULT '{}',
  replication_notes TEXT,
  confidence_score FLOAT NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  raw_response TEXT,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Progress tracking table
CREATE TABLE IF NOT EXISTS analysis_progress (
  id SERIAL PRIMARY KEY,
  total_videos INTEGER NOT NULL DEFAULT 0,
  analyzed_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  estimated_cost DECIMAL(10,4) NOT NULL DEFAULT 0,
  rate_limit_pauses INTEGER NOT NULL DEFAULT 0,
  last_processed_id TEXT,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Error tracking table
CREATE TABLE IF NOT EXISTS analysis_errors (
  id SERIAL PRIMARY KEY,
  video_id TEXT NOT NULL,
  error TEXT NOT NULL,
  analysis_type TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_viral_analyses_video_id ON viral_video_analyses(video_id);
CREATE INDEX idx_viral_analyses_content_type ON viral_video_analyses(content_type);
CREATE INDEX idx_viral_analyses_confidence ON viral_video_analyses(confidence_score);
CREATE INDEX idx_viral_analyses_analyzed_at ON viral_video_analyses(analyzed_at);
CREATE INDEX idx_analysis_errors_video_id ON analysis_errors(video_id);
CREATE INDEX idx_analysis_progress_created ON analysis_progress(created_at);

-- View for aggregated insights
CREATE OR REPLACE VIEW viral_insights_summary AS
WITH emotion_counts AS (
  SELECT 
    emotion,
    COUNT(*) as count
  FROM 
    viral_video_analyses,
    UNNEST(emotional_core) as emotion
  WHERE confidence_score > 0.5
  GROUP BY emotion
),
factor_counts AS (
  SELECT 
    factor,
    COUNT(*) as count
  FROM 
    viral_video_analyses,
    UNNEST(viral_factors) as factor
  WHERE confidence_score > 0.5
  GROUP BY factor
),
type_stats AS (
  SELECT 
    content_type,
    COUNT(*) as count,
    AVG(confidence_score) as avg_confidence
  FROM viral_video_analyses
  WHERE confidence_score > 0
  GROUP BY content_type
)
SELECT 
  (SELECT COUNT(*) FROM viral_video_analyses) as total_analyzed,
  (SELECT COUNT(*) FROM viral_video_analyses WHERE confidence_score > 0.7) as high_confidence_count,
  (SELECT json_agg(json_build_object('emotion', emotion, 'count', count) ORDER BY count DESC) FROM emotion_counts LIMIT 10) as top_emotions,
  (SELECT json_agg(json_build_object('factor', factor, 'count', count) ORDER BY count DESC) FROM factor_counts LIMIT 15) as top_factors,
  (SELECT json_agg(json_build_object('type', content_type, 'count', count, 'avg_confidence', avg_confidence) ORDER BY count DESC) FROM type_stats) as content_types,
  (SELECT AVG(confidence_score) FROM viral_video_analyses) as overall_avg_confidence;