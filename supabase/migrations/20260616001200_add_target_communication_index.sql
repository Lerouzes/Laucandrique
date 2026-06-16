-- Migration: Add communication_target_index to settings
-- Created: 2026-06-16 00:12:00

ALTER TABLE settings ADD COLUMN IF NOT EXISTS communication_target_index DECIMAL(5,2) DEFAULT 2.50;
