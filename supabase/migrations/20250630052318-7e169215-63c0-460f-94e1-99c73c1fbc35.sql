
-- First, add the Administrator role to the enum (this needs to be in its own transaction)
ALTER TYPE public.user_role ADD VALUE 'administrator';
