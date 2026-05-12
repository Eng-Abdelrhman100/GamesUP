-- Add subtitle and badge fields to banners table
ALTER TABLE banners 
ADD COLUMN IF NOT EXISTS subtitle TEXT,
ADD COLUMN IF NOT EXISTS badge TEXT;

-- Update existing banners with default values
UPDATE banners 
SET subtitle = 'The largest collection of digital keys and gift cards is finally here.',
    badge = 'Special Edition'
WHERE subtitle IS NULL AND badge IS NULL AND position = 1;

UPDATE banners 
SET subtitle = 'Global Access Cards',
    badge = 'Trending'
WHERE subtitle IS NULL AND badge IS NULL AND position = 2;

UPDATE banners 
SET subtitle = 'Next-Gen Gaming Pass',
    badge = 'New Arrival'
WHERE subtitle IS NULL AND badge IS NULL AND position = 3;
