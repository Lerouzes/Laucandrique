-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the vector memory table
CREATE TABLE IF NOT EXISTS public.syndicate_vector_memory (
    id BIGSERIAL PRIMARY KEY,
    syndicate_id TEXT NOT NULL, -- The namespace key (e.g., 'R106', 'S205')
    document_type TEXT NOT NULL, -- e.g., 'bylaw', 'email', 'financial_rule'
    raw_text_content TEXT NOT NULL, 
    vector_embedding VECTOR(1536), -- Assuming standard OpenAI/Gemini embedding size
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS syndicate_vector_memory_hnsw_idx ON public.syndicate_vector_memory USING hnsw (vector_embedding vector_cosine_ops);

-- Ensure our user table (profiles) includes department and portfolio_ids
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS portfolio_ids TEXT[];

-- Update/Alter settings table to include AI configurations
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS ai_engine TEXT DEFAULT 'Google Gemini 1.5 Pro';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS global_system_prompt TEXT DEFAULT 'You are Gustav, an elite property co-pilot for Gestion Laucandrique. Maintain an impeccably courteous, clear French-Canadian business tone.';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS role_behavior_prompt TEXT DEFAULT 'Focus explicitly on contractor follow-ups. If an item exceeds $1500, flag it for the Operations department.';

-- Populate default values on the existing settings row
UPDATE public.settings 
SET 
  ai_engine = COALESCE(ai_engine, 'Google Gemini 1.5 Pro'),
  global_system_prompt = COALESCE(global_system_prompt, 'You are Gustav, an elite property co-pilot for Gestion Laucandrique. Maintain an impeccably courteous, clear French-Canadian business tone.'),
  role_behavior_prompt = COALESCE(role_behavior_prompt, 'Focus explicitly on contractor follow-ups. If an item exceeds $1500, flag it for the Operations department.')
WHERE ai_engine IS NULL OR global_system_prompt IS NULL OR role_behavior_prompt IS NULL;
