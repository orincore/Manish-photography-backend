-- Migration to add video support to homepage_elements
-- =====================================================

-- Update the type constraint to include video types
ALTER TABLE homepage_elements DROP CONSTRAINT IF EXISTS homepage_elements_type_check;

ALTER TABLE homepage_elements
ADD CONSTRAINT homepage_elements_type_check
CHECK (type IN ('hero', 'featured', 'instagram', 'about', 'gallery', 'testimonial', 'service', 'contact', 'hero-video', 'featured-video'));

-- Add video-specific columns
ALTER TABLE homepage_elements 
ADD COLUMN IF NOT EXISTS video_autoplay BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS video_muted BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS video_loop BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS video_poster VARCHAR(500),
ADD COLUMN IF NOT EXISTS video_duration INTEGER,
ADD COLUMN IF NOT EXISTS video_thumbnail_url VARCHAR(500);

-- Add index for video elements
CREATE INDEX IF NOT EXISTS idx_homepage_elements_video ON homepage_elements(media_type) WHERE media_type = 'video';

-- Update existing hero elements to support video
-- This will set default video settings for existing elements
UPDATE homepage_elements 
SET video_autoplay = true, 
    video_muted = true, 
    video_loop = true 
WHERE type = 'hero' AND media_type = 'video'; 