-- Add enhanced_data column to evaluations table
-- This stores the detailed RAG-based evaluation data

ALTER TABLE evaluations 
ADD COLUMN IF NOT EXISTS enhanced_data JSONB;

-- Add a comment to document the column
COMMENT ON COLUMN evaluations.enhanced_data IS 'Stores enhanced evaluation data from RAG-based analysis including matching_strengths, missing_gaps, criteria_analysis, brutal_gap_analysis, and other detailed evaluation fields';
