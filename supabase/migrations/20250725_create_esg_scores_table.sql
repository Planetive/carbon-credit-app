-- Create ESG scores table for admin manual scoring
CREATE TABLE IF NOT EXISTS esg_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES esg_assessments(id) ON DELETE CASCADE,
    
    -- Environmental Scores (E-q1 to E-q7) - Admin raw scores (1-3)
    e_q1_score INTEGER CHECK (e_q1_score >= 1 AND e_q1_score <= 3),
    e_q2_score INTEGER CHECK (e_q2_score >= 1 AND e_q2_score <= 3),
    e_q3_score INTEGER CHECK (e_q3_score >= 1 AND e_q3_score <= 3),
    e_q4_score INTEGER CHECK (e_q4_score >= 1 AND e_q4_score <= 3),
    e_q5_score INTEGER CHECK (e_q5_score >= 1 AND e_q5_score <= 3),
    e_q6_score INTEGER CHECK (e_q6_score >= 1 AND e_q6_score <= 3),
    e_q7_score INTEGER CHECK (e_q7_score >= 1 AND e_q7_score <= 3),
    
    -- Social Scores (S-q1 to S-q12) - Admin raw scores (1-3)
    s_q1_score INTEGER CHECK (s_q1_score >= 1 AND s_q1_score <= 3),
    s_q2_score INTEGER CHECK (s_q2_score >= 1 AND s_q2_score <= 3),
    s_q3_score INTEGER CHECK (s_q3_score >= 1 AND s_q3_score <= 3),
    s_q4_score INTEGER CHECK (s_q4_score >= 1 AND s_q4_score <= 3),
    s_q5_score INTEGER CHECK (s_q5_score >= 1 AND s_q5_score <= 3),
    s_q6_score INTEGER CHECK (s_q6_score >= 1 AND s_q6_score <= 3),
    s_q7_score INTEGER CHECK (s_q7_score >= 1 AND s_q7_score <= 3),
    s_q8_score INTEGER CHECK (s_q8_score >= 1 AND s_q8_score <= 3),
    s_q9_score INTEGER CHECK (s_q9_score >= 1 AND s_q9_score <= 3),
    s_q10_score INTEGER CHECK (s_q10_score >= 1 AND s_q10_score <= 3),
    s_q11_score INTEGER CHECK (s_q11_score >= 1 AND s_q11_score <= 3),
    s_q12_score INTEGER CHECK (s_q12_score >= 1 AND s_q12_score <= 3),
    
    -- Governance Scores (G-q1 to G-q7) - Admin raw scores (1-3)
    g_q1_score INTEGER CHECK (g_q1_score >= 1 AND g_q1_score <= 3),
    g_q2_score INTEGER CHECK (g_q2_score >= 1 AND g_q2_score <= 3),
    g_q3_score INTEGER CHECK (g_q3_score >= 1 AND g_q3_score <= 3),
    g_q4_score INTEGER CHECK (g_q4_score >= 1 AND g_q4_score <= 3),
    g_q5_score INTEGER CHECK (g_q5_score >= 1 AND g_q5_score <= 3),
    g_q6_score INTEGER CHECK (g_q6_score >= 1 AND g_q6_score <= 3),
    g_q7_score INTEGER CHECK (g_q7_score >= 1 AND g_q7_score <= 3),
    
    -- Calculated weighted scores (final percentages 0-100%)
    environmental_total_score DECIMAL(5,2),
    social_total_score DECIMAL(5,2),
    governance_total_score DECIMAL(5,2),
    overall_score DECIMAL(5,2),
    
    -- Admin notes
    environmental_strengths TEXT,
    environmental_improvements TEXT,
    social_strengths TEXT,
    social_improvements TEXT,
    governance_strengths TEXT,
    governance_improvements TEXT,
    overall_recommendations TEXT,
    
    -- Metadata
    scored_by TEXT, -- admin email/name
    scored_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(assessment_id)
);

-- Enable RLS
ALTER TABLE esg_scores ENABLE ROW LEVEL SECURITY;

-- Create policies (admin can read all, users can only read their own)
CREATE POLICY "Admin can read all scores" ON esg_scores
    FOR SELECT USING (true);

CREATE POLICY "Admin can insert scores" ON esg_scores
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can update scores" ON esg_scores
    FOR UPDATE USING (true);

CREATE POLICY "Users can read their own scores" ON esg_scores
    FOR SELECT USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_esg_scores_user_id ON esg_scores(user_id);
CREATE INDEX idx_esg_scores_assessment_id ON esg_scores(assessment_id);
CREATE INDEX idx_esg_scores_scored_at ON esg_scores(scored_at);
