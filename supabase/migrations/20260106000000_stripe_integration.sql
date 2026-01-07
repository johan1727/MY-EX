-- =====================================================
-- Migration: Stripe Integration for Profiles
-- Fecha: 6 de Enero 2026
-- Descripción: Agrega columnas necesarias para Stripe
-- =====================================================

-- Agregar columnas de Stripe a profiles (si no existen)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);

-- Comentarios
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe Customer ID for web payments';
COMMENT ON COLUMN profiles.stripe_subscription_id IS 'Stripe Subscription ID';
COMMENT ON COLUMN profiles.subscription_status IS 'Status: active, past_due, canceled, etc.';
