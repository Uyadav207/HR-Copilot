-- Add company and why_using_platform columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS company VARCHAR(255) NOT NULL DEFAULT 'My Company',
ADD COLUMN IF NOT EXISTS why_using_platform TEXT;

-- Update existing users to have a default company if they don't have one
UPDATE users SET company = 'My Company' WHERE company IS NULL OR company = '';

-- Make company NOT NULL after setting defaults
ALTER TABLE users 
ALTER COLUMN company SET NOT NULL;

-- Add user_id column to jobs table
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);

-- For existing jobs, we need to assign them to a user or delete them
-- Since we're implementing multi-tenant, existing jobs without a user should be deleted
-- But first, let's just make user_id nullable temporarily, then we can clean up

-- Add foreign key constraint (we'll handle orphaned data separately)
-- First, delete orphaned data (jobs without users or users that don't exist)
DELETE FROM jobs WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users);

-- Now add the foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'jobs_user_id_users_id_fk'
    ) THEN
        ALTER TABLE jobs 
        ADD CONSTRAINT jobs_user_id_users_id_fk 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Note: After running this, you may want to:
-- 1. Delete all existing jobs (they don't belong to any user)
-- 2. Or assign them to a default user if you have one

