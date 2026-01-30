-- Migration: Add RPC function to get campaign stats
-- Description: Creates a function to aggregate attribution data by campaign

-- Drop ALL existing overloads of this function (CASCADE removes dependencies)
DROP FUNCTION IF EXISTS public.get_campaign_stats CASCADE;
DROP FUNCTION IF EXISTS get_campaign_stats CASCADE;

-- Create the RPC function to get campaign statistics
CREATE FUNCTION public.get_campaign_stats()
RETURNS TABLE (
    source TEXT,
    campaign TEXT,
    total_users BIGINT,
    app_installs BIGINT,
    registrations BIGINT,
    subscriptions BIGINT,
    total_revenue NUMERIC,
    conversion_rate NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ua.utm_source, 'organic')::TEXT as source,
        COALESCE(ua.utm_campaign, 'direct')::TEXT as campaign,
        COUNT(DISTINCT ua.user_id)::BIGINT as total_users,
        COUNT(DISTINCT CASE WHEN ua.app_install_at IS NOT NULL THEN ua.user_id END)::BIGINT as app_installs,
        COUNT(DISTINCT CASE WHEN ua.registration_at IS NOT NULL THEN ua.user_id END)::BIGINT as registrations,
        COUNT(DISTINCT CASE WHEN ua.first_subscription_at IS NOT NULL THEN ua.user_id END)::BIGINT as subscriptions,
        COALESCE(SUM(ua.subscription_value), 0)::NUMERIC as total_revenue,
        CASE 
            WHEN COUNT(DISTINCT ua.user_id) > 0 THEN 
                (COUNT(DISTINCT CASE WHEN ua.first_subscription_at IS NOT NULL THEN ua.user_id END)::NUMERIC / COUNT(DISTINCT ua.user_id)::NUMERIC) * 100
            ELSE 0
        END::NUMERIC as conversion_rate
    FROM public.user_attribution ua
    GROUP BY ua.utm_source, ua.utm_campaign
    ORDER BY total_users DESC, total_revenue DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_campaign_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaign_stats() TO anon;

-- Add comment
COMMENT ON FUNCTION public.get_campaign_stats IS 'Returns aggregated attribution stats by campaign for analytics dashboard';
