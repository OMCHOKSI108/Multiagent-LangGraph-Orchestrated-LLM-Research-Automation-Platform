-- Source Tracking Enhancements
-- Adds richer metadata to data_sources for improved source attribution display.

ALTER TABLE data_sources
ADD COLUMN IF NOT EXISTS title VARCHAR(500),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS favicon VARCHAR(500),
ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(500),
ADD COLUMN IF NOT EXISTS published_date VARCHAR(50),
ADD COLUMN IF NOT EXISTS citation_text TEXT;
