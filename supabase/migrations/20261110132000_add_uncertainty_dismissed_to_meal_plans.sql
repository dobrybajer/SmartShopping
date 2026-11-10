-- ==============================================================================
-- Migracja: 20261110132000_add_uncertainty_dismissed_to_meal_plans.sql
-- Cel (MED-03): Możliwość wyciszenia alertu niepewności (⚠️) w kalendarzu posiłków
-- po świadomym potwierdzeniu brakujących składników przez użytkownika.
-- ==============================================================================

ALTER TABLE public.meal_plans
ADD COLUMN IF NOT EXISTS is_uncertainty_dismissed BOOLEAN NOT NULL DEFAULT FALSE;

