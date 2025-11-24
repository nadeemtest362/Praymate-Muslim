-- Create tables for storing aggregated viral insights

-- Store aggregated insights for different content categories
CREATE TABLE IF NOT EXISTS viral_insights_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category VARCHAR(255) NOT NULL, -- 'christian', 'transformation', 'fitness', etc.
    insights_data JSONB NOT NULL, -- Full analysis results
    total_videos_analyzed INTEGER DEFAULT 0,
    average_views BIGINT DEFAULT 0,
    average_engagement_rate DECIMAL(5,2) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category)
);

-- Store individual viral techniques with counts
CREATE TABLE IF NOT EXISTS viral_techniques (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category VARCHAR(255) NOT NULL,
    technique TEXT NOT NULL,
    occurrence_count INTEGER DEFAULT 1,
    avg_views_when_used BIGINT DEFAULT 0,
    avg_engagement_rate DECIMAL(5,2) DEFAULT 0,
    example_video_ids TEXT[], -- Array of video IDs that use this technique
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category, technique)
);

-- Store emotional triggers
CREATE TABLE IF NOT EXISTS viral_emotional_triggers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category VARCHAR(255) NOT NULL,
    trigger TEXT NOT NULL,
    occurrence_count INTEGER DEFAULT 1,
    effectiveness_score DECIMAL(5,2) DEFAULT 0, -- Based on engagement
    example_video_ids TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category, trigger)
);

-- Store visual elements
CREATE TABLE IF NOT EXISTS viral_visual_elements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category VARCHAR(255) NOT NULL,
    element TEXT NOT NULL,
    occurrence_count INTEGER DEFAULT 1,
    avg_views_when_used BIGINT DEFAULT 0,
    example_video_ids TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category, element)
);

-- Store proven hook formulas
CREATE TABLE IF NOT EXISTS viral_hook_formulas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category VARCHAR(255) NOT NULL,
    hook_text TEXT NOT NULL,
    pattern_type VARCHAR(100), -- 'question', 'revelation', 'challenge', etc.
    views BIGINT NOT NULL,
    engagement_rate DECIMAL(5,2) NOT NULL,
    author_username VARCHAR(255),
    video_id VARCHAR(255),
    techniques_used TEXT[], -- Array of techniques identified
    emotional_triggers TEXT[], -- Array of emotions triggered
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store concept themes for content creation
CREATE TABLE IF NOT EXISTS viral_concept_themes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category VARCHAR(255) NOT NULL,
    theme_title TEXT NOT NULL,
    occurrence_count INTEGER DEFAULT 1,
    concept_examples JSONB, -- Store full concept details
    avg_performance_score DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category, theme_title)
);

-- Create indexes for performance
CREATE INDEX idx_viral_techniques_category ON viral_techniques(category);
CREATE INDEX idx_viral_techniques_count ON viral_techniques(occurrence_count DESC);
CREATE INDEX idx_viral_emotional_triggers_category ON viral_emotional_triggers(category);
CREATE INDEX idx_viral_visual_elements_category ON viral_visual_elements(category);
CREATE INDEX idx_viral_hook_formulas_category ON viral_hook_formulas(category);
CREATE INDEX idx_viral_hook_formulas_engagement ON viral_hook_formulas(engagement_rate DESC);
CREATE INDEX idx_viral_concept_themes_category ON viral_concept_themes(category);

-- Add RLS policies
ALTER TABLE viral_insights_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_emotional_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_visual_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_hook_formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_concept_themes ENABLE ROW LEVEL SECURITY;

-- Allow public read access (these are aggregated insights, not private data)
CREATE POLICY "Allow public read access to insights" ON viral_insights_summary FOR SELECT USING (true);
CREATE POLICY "Allow public read access to techniques" ON viral_techniques FOR SELECT USING (true);
CREATE POLICY "Allow public read access to triggers" ON viral_emotional_triggers FOR SELECT USING (true);
CREATE POLICY "Allow public read access to elements" ON viral_visual_elements FOR SELECT USING (true);
CREATE POLICY "Allow public read access to formulas" ON viral_hook_formulas FOR SELECT USING (true);
CREATE POLICY "Allow public read access to themes" ON viral_concept_themes FOR SELECT USING (true);

-- Only allow authenticated users to write (for when we run the analysis)
CREATE POLICY "Allow authenticated insert" ON viral_insights_summary FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON viral_insights_summary FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated insert techniques" ON viral_techniques FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update techniques" ON viral_techniques FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated insert triggers" ON viral_emotional_triggers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update triggers" ON viral_emotional_triggers FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated insert elements" ON viral_visual_elements FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update elements" ON viral_visual_elements FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated insert formulas" ON viral_hook_formulas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated insert themes" ON viral_concept_themes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update themes" ON viral_concept_themes FOR UPDATE USING (true);