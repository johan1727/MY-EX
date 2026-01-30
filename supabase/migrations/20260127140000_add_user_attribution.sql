-- Create user_attribution table for tracking TikTok Ads and other sources
CREATE TABLE IF NOT EXISTS public.user_attribution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Source tracking (UTM Parameters)
    utm_source TEXT,           -- 'tiktok', 'google', 'facebook', 'organic'
    utm_medium TEXT,           -- 'cpc', 'paid_social', 'organic'
    utm_campaign TEXT,         -- 'lanzamiento_enero_2026'
    utm_content TEXT,          -- 'video_flores_rojas', 'carousel_testimonios'
    utm_term TEXT,             -- keywords (if applicable)
    
    -- TikTok specific tracking
    ttclid TEXT,               -- TikTok Click ID (auto-added by TikTok)
    tt_campaign_id TEXT,       -- TikTok Campaign ID
    tt_ad_group_id TEXT,       -- TikTok Ad Group ID
    tt_ad_id TEXT,             -- TikTok Ad ID
    
    -- Google Play specific
    gclid TEXT,                -- Google Click ID (if from Google Ads)
    install_referrer TEXT,     -- Google Play Install Referrer
    
    -- Device & Platform info
    platform TEXT,             -- 'android', 'ios', 'web'
    device_type TEXT,          -- 'phone', 'tablet'
    device_model TEXT,         -- 'Pixel 8', 'Samsung Galaxy S24'
    os_version TEXT,           -- 'Android 14', 'iOS 17'
    app_version TEXT,          -- '1.0.2'
    user_agent TEXT,
    ip_address INET,
    country_code TEXT,         -- 'MX', 'US', 'ES'
    
    -- Conversion tracking  
    first_touch_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    app_install_at TIMESTAMP WITH TIME ZONE,
    registration_at TIMESTAMP WITH TIME ZONE,
    first_analysis_at TIMESTAMP WITH TIME ZONE,
    first_simulation_at TIMESTAMP WITH TIME ZONE,
    first_call_at TIMESTAMP WITH TIME ZONE,
    first_subscription_at TIMESTAMP WITH TIME ZONE,
    subscription_tier TEXT,    -- 'warrior', 'phoenix'
    subscription_value DECIMAL(10,2),
    
    -- Landing page metadata
    referrer TEXT,
    landing_page TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_attribution ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own attribution"
    ON public.user_attribution
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert attribution"
    ON public.user_attribution
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service role can update attribution"
    ON public.user_attribution
    FOR UPDATE
    USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attribution_user_id ON public.user_attribution(user_id);
CREATE INDEX IF NOT EXISTS idx_attribution_source ON public.user_attribution(utm_source);
CREATE INDEX IF NOT EXISTS idx_attribution_campaign ON public.user_attribution(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_attribution_ttclid ON public.user_attribution(ttclid);
CREATE INDEX IF NOT EXISTS idx_attribution_created ON public.user_attribution(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attribution_conversions ON public.user_attribution(first_subscription_at) WHERE first_subscription_at IS NOT NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_attribution_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_attribution_updated_at
    BEFORE UPDATE ON public.user_attribution
    FOR EACH ROW
    EXECUTE FUNCTION update_attribution_updated_at();

-- Helper function to get attribution stats
CREATE OR REPLACE FUNCTION get_campaign_stats(campaign_name TEXT DEFAULT NULL)
RETURNS TABLE (
    source TEXT,
    campaign TEXT,
    total_users BIGINT,
    app_installs BIGINT,
    registrations BIGINT,
    subscriptions BIGINT,
    total_revenue NUMERIC,
    conversion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ua.utm_source as source,
        ua.utm_campaign as campaign,
        COUNT(DISTINCT ua.user_id) as total_users,
        COUNT(DISTINCT CASE WHEN ua.app_install_at IS NOT NULL THEN ua.user_id END) as app_installs,
        COUNT(DISTINCT CASE WHEN ua.registration_at IS NOT NULL THEN ua.user_id END) as registrations,
        COUNT(DISTINCT CASE WHEN ua.first_subscription_at IS NOT NULL THEN ua.user_id END) as subscriptions,
        COALESCE(SUM(ua.subscription_value), 0) as total_revenue,
        ROUND(
            (COUNT(DISTINCT CASE WHEN ua.first_subscription_at IS NOT NULL THEN ua.user_id END)::NUMERIC / 
            NULLIF(COUNT(DISTINCT ua.user_id), 0)) * 100, 
            2
        ) as conversion_rate
    FROM user_attribution ua
    WHERE (campaign_name IS NULL OR ua.utm_campaign = campaign_name)
    GROUP BY ua.utm_source, ua.utm_campaign
    ORDER BY subscriptions DESC, total_users DESC;
END;
$$ LANGUAGE plpgsql;
