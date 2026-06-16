-- Migration: 20260616004322_add_is_board_member_to_doors.sql

ALTER TABLE public.doors ADD COLUMN IF NOT EXISTS is_board_member BOOLEAN DEFAULT FALSE NOT NULL;
