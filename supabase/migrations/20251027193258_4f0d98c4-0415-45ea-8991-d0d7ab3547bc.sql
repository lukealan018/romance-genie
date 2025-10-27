-- Add reservation preference fields to profiles table
ALTER TABLE profiles 
ADD COLUMN preferred_date DATE,
ADD COLUMN preferred_time TIME,
ADD COLUMN party_size INTEGER DEFAULT 2;