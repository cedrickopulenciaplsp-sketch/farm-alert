-- Add requires_password_change column to users table
ALTER TABLE users ADD COLUMN requires_password_change BOOLEAN NOT NULL DEFAULT true;

-- Update existing users to false so they don't get locked out unexpectedly
UPDATE users SET requires_password_change = false;
