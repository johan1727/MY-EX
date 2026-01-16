-- Migration to ensure master_prompt exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'master_prompt') THEN 
        ALTER TABLE profiles ADD COLUMN master_prompt TEXT DEFAULT NULL; 
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'relationship_type') THEN 
        ALTER TABLE profiles ADD COLUMN relationship_type TEXT DEFAULT 'ex'; 
    END IF;
END $$;
