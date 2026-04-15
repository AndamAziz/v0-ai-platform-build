-- Add website type to generations table
ALTER TABLE generations 
DROP CONSTRAINT IF EXISTS generations_type_check;

ALTER TABLE generations 
ADD CONSTRAINT generations_type_check 
CHECK (type IN ('image', 'video', 'voice', 'chat', 'website'));
