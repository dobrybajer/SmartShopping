-- ============================================================================
-- Migration: Add push_subscriptions table with household RLS
-- File: supabase/migrations/20260831000000_add_push_subscriptions.sql
-- ADR: ADR-007 Multiplatform Web Push Notifications & Extensible Event Registry
-- ============================================================================

-- 1. Create table for storing Web Push API subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_push_subscriptions_endpoint UNIQUE (endpoint)
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_household 
    ON public.push_subscriptions(household_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user 
    ON public.push_subscriptions(user_id);

-- 3. Enable Row Level Security
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. Row Level Security Policies
-- Users can view push subscriptions within their household
CREATE POLICY "Users can select push subscriptions for their household"
    ON public.push_subscriptions
    FOR SELECT
    TO authenticated
    USING (
        household_id IN (SELECT public.get_user_household_ids(auth.uid()))
    );

-- Users can insert their own push subscriptions
CREATE POLICY "Users can insert their own push subscriptions"
    ON public.push_subscriptions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND household_id IN (SELECT public.get_user_household_ids(auth.uid()))
    );

-- Users can update their own subscriptions (e.g. refresh keys, update last_used_at)
CREATE POLICY "Users can update their own push subscriptions"
    ON public.push_subscriptions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own push subscriptions (unsubscribe)
CREATE POLICY "Users can delete their own push subscriptions"
    ON public.push_subscriptions
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Service role policy documentation
COMMENT ON TABLE public.push_subscriptions IS 
    'Stores Web Push API VAPID endpoints and keys per user device, scoped to household multi-tenancy.';
