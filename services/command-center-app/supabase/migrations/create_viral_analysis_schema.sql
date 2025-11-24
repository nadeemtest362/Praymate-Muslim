-- Drop old tables if they exist
DROP TABLE IF EXISTS viral_video_analyses CASCADE;
DROP TABLE IF EXISTS analysis_progress CASCADE;
DROP TABLE IF EXISTS analysis_errors CASCADE;

-- Main analysis table with proper schema
CREATE TABLE viral_video_analyses (
  id SERIAL PRIMARY KEY,
  video_id TEXT UNIQUE NOT NULL,
  
  -- Video metadata (denormalized for easier querying)
  view_count BIGINT NOT NULL,
  like_count BIGINT NOT NULL,
  comment_count BIGINT NOT NULL,
  share_count BIGINT NOT NULL,
  engagement_rate DECIMAL(5,2) GENERATED ALWAYS AS ((like_count + comment_count + share_count)::decimal / NULLIF(view_count, 0) * 100) STORED,
  duration INTEGER NOT NULL,
  author_name TEXT NOT NULL,
  
  -- Analysis results (structured for querying)
  content_type TEXT NOT NULL,
  hook_type TEXT, -- question|statement|challenge|story|revelation
  
  -- Emotional analysis (normalized)
  primary_emotion TEXT NOT NULL,
  secondary_emotion TEXT,
  tertiary_emotion TEXT,
  
  -- Viral factors (structured)
  viral_factor_1 TEXT NOT NULL,
  viral_factor_2 TEXT,
  viral_factor_3 TEXT,
  
  -- Hook analysis
  hook_strategy TEXT NOT NULL,
  hook_word_count INTEGER,
  hook_has_question BOOLEAN DEFAULT FALSE,
  hook_has_number BOOLEAN DEFAULT FALSE,
  hook_personal BOOLEAN DEFAULT FALSE, -- uses I/my/me
  
  -- Content analysis
  video_structure TEXT, -- single_scene|montage|tutorial|testimonial
  pacing TEXT, -- fast|medium|slow|building
  
  -- Actionable insights
  replication_formula TEXT NOT NULL, -- the key formula for replication
  target_audience TEXT, -- who this appeals to
  
  -- Technical details
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  analysis_confidence DECIMAL(3,2) NOT NULL DEFAULT 0.8,
  
  -- Raw data for future re-analysis
  raw_caption TEXT,
  raw_hook TEXT,
  raw_analysis_response JSONB
);

-- Separate table for viral factors (many-to-many)
CREATE TABLE viral_factors (
  id SERIAL PRIMARY KEY,
  factor_name TEXT UNIQUE NOT NULL,
  factor_category TEXT NOT NULL, -- emotional|social|content|timing|technical
  occurrence_count INTEGER DEFAULT 1
);

CREATE TABLE video_viral_factors (
  video_id TEXT REFERENCES viral_video_analyses(video_id) ON DELETE CASCADE,
  factor_id INTEGER REFERENCES viral_factors(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, factor_id)
);

-- Separate table for emotions (many-to-many)
CREATE TABLE emotions (
  id SERIAL PRIMARY KEY,
  emotion_name TEXT UNIQUE NOT NULL,
  emotion_category TEXT NOT NULL, -- positive|negative|mixed
  occurrence_count INTEGER DEFAULT 1
);

CREATE TABLE video_emotions (
  video_id TEXT REFERENCES viral_video_analyses(video_id) ON DELETE CASCADE,
  emotion_id INTEGER REFERENCES emotions(id) ON DELETE CASCADE,
  emotion_rank INTEGER NOT NULL, -- 1=primary, 2=secondary, 3=tertiary
  PRIMARY KEY (video_id, emotion_id)
);

-- Hook patterns table
CREATE TABLE hook_patterns (
  id SERIAL PRIMARY KEY,
  pattern_name TEXT UNIQUE NOT NULL,
  pattern_template TEXT NOT NULL,
  example_hook TEXT NOT NULL,
  avg_view_count BIGINT DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  avg_engagement_rate DECIMAL(5,2) DEFAULT 0
);

CREATE TABLE video_hook_patterns (
  video_id TEXT REFERENCES viral_video_analyses(video_id) ON DELETE CASCADE,
  pattern_id INTEGER REFERENCES hook_patterns(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, pattern_id)
);

-- Create indexes for performance
CREATE INDEX idx_analyses_content_type ON viral_video_analyses(content_type);
CREATE INDEX idx_analyses_view_count ON viral_video_analyses(view_count DESC);
CREATE INDEX idx_analyses_engagement_rate ON viral_video_analyses(engagement_rate DESC);
CREATE INDEX idx_analyses_primary_emotion ON viral_video_analyses(primary_emotion);
CREATE INDEX idx_analyses_author ON viral_video_analyses(author_name);
CREATE INDEX idx_analyses_hook_type ON viral_video_analyses(hook_type);
CREATE INDEX idx_analyses_analyzed_at ON viral_video_analyses(analyzed_at);

-- Materialized views for fast insights

-- Top performing content formulas
CREATE MATERIALIZED VIEW top_content_formulas AS
SELECT 
  content_type,
  primary_emotion,
  hook_type,
  COUNT(*) as video_count,
  AVG(view_count) as avg_views,
  AVG(engagement_rate) as avg_engagement,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY view_count) as median_views
FROM viral_video_analyses
GROUP BY content_type, primary_emotion, hook_type
HAVING COUNT(*) >= 3
ORDER BY avg_views DESC;

-- Emotion combinations that work
CREATE MATERIALIZED VIEW emotion_combinations AS
SELECT 
  primary_emotion,
  secondary_emotion,
  COUNT(*) as video_count,
  AVG(view_count) as avg_views,
  AVG(engagement_rate) as avg_engagement
FROM viral_video_analyses
WHERE secondary_emotion IS NOT NULL
GROUP BY primary_emotion, secondary_emotion
HAVING COUNT(*) >= 2
ORDER BY avg_views DESC;

-- Hook patterns performance
CREATE MATERIALIZED VIEW hook_performance AS
SELECT 
  hook_type,
  hook_has_question,
  hook_has_number,
  hook_personal,
  COUNT(*) as video_count,
  AVG(view_count) as avg_views,
  AVG(engagement_rate) as avg_engagement,
  AVG(hook_word_count) as avg_word_count
FROM viral_video_analyses
WHERE hook_type IS NOT NULL
GROUP BY hook_type, hook_has_question, hook_has_number, hook_personal
ORDER BY avg_views DESC;

-- Author strategies
CREATE MATERIALIZED VIEW author_strategies AS
SELECT 
  author_name,
  COUNT(*) as viral_videos,
  AVG(view_count) as avg_views,
  MODE() WITHIN GROUP (ORDER BY content_type) as primary_content_type,
  MODE() WITHIN GROUP (ORDER BY primary_emotion) as primary_emotion_used,
  MODE() WITHIN GROUP (ORDER BY hook_type) as primary_hook_type
FROM viral_video_analyses
GROUP BY author_name
HAVING COUNT(*) >= 3
ORDER BY avg_views DESC;

-- Time-based trends (if we add created_at later)
CREATE MATERIALIZED VIEW content_trends AS
SELECT 
  DATE_TRUNC('week', analyzed_at) as week,
  content_type,
  COUNT(*) as video_count,
  AVG(view_count) as avg_views
FROM viral_video_analyses
GROUP BY DATE_TRUNC('week', analyzed_at), content_type
ORDER BY week DESC, avg_views DESC;

-- Helper functions for insights

-- Get winning formula for a content type
CREATE OR REPLACE FUNCTION get_winning_formula(p_content_type TEXT)
RETURNS TABLE (
  formula TEXT,
  avg_views BIGINT,
  example_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CONCAT(
      'Use ', vva.primary_emotion, ' emotion',
      CASE WHEN vva.secondary_emotion IS NOT NULL 
        THEN CONCAT(' with ', vva.secondary_emotion) 
        ELSE '' 
      END,
      ' in a ', vva.hook_type, ' hook',
      CASE WHEN vva.hook_has_question THEN ' (include question)' ELSE '' END,
      CASE WHEN vva.hook_has_number THEN ' (include numbers)' ELSE '' END
    ) as formula,
    AVG(vva.view_count)::BIGINT as avg_views,
    COUNT(*)::INTEGER as example_count
  FROM viral_video_analyses vva
  WHERE vva.content_type = p_content_type
  GROUP BY vva.primary_emotion, vva.secondary_emotion, vva.hook_type, 
           vva.hook_has_question, vva.hook_has_number
  HAVING COUNT(*) >= 2
  ORDER BY AVG(vva.view_count) DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Get similar videos
CREATE OR REPLACE FUNCTION get_similar_videos(p_video_id TEXT, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  video_id TEXT,
  similarity_score DECIMAL,
  view_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH target_video AS (
    SELECT * FROM viral_video_analyses WHERE video_id = p_video_id
  )
  SELECT 
    v.video_id,
    (
      CASE WHEN v.content_type = t.content_type THEN 0.3 ELSE 0 END +
      CASE WHEN v.primary_emotion = t.primary_emotion THEN 0.3 ELSE 0 END +
      CASE WHEN v.hook_type = t.hook_type THEN 0.2 ELSE 0 END +
      CASE WHEN v.hook_has_question = t.hook_has_question THEN 0.1 ELSE 0 END +
      CASE WHEN v.hook_personal = t.hook_personal THEN 0.1 ELSE 0 END
    )::DECIMAL as similarity_score,
    v.view_count
  FROM viral_video_analyses v, target_video t
  WHERE v.video_id != p_video_id
  ORDER BY similarity_score DESC, v.view_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;