import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, TrendingUp, Users, DollarSign, Target, ExternalLink } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { isAdmin } from '@/lib/adminService';

interface CampaignStats {
    source: string;
    campaign: string;
    total_users: number;
    app_installs: number;
    registrations: number;
    subscriptions: number;
    total_revenue: number;
    conversion_rate: number;
}

export default function AttributionDashboard() {
    const router = useRouter();
    const { isDark } = useTheme();
    const [stats, setStats] = useState<CampaignStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [totalStats, setTotalStats] = useState({
        users: 0,
        registrations: 0,
        subscriptions: 0,
        revenue: 0
    });

    // Check admin access on mount
    useEffect(() => {
        const checkAccess = async () => {
            const admin = await isAdmin();
            if (!admin) {
                // Not authorized - go back
                router.back();
                return;
            }
            setIsAuthorized(true);
            loadStats();
        };
        checkAccess();
    }, []);

    const loadStats = async () => {
        try {
            // Get all campaigns stats
            const { data, error } = await supabase
                .rpc('get_campaign_stats');

            if (error) throw error;

            if (data) {
                setStats(data as CampaignStats[]);

                // Calculate totals
                const totals = data.reduce((acc: any, curr: CampaignStats) => ({
                    users: acc.users + (curr.total_users || 0),
                    registrations: acc.registrations + (curr.registrations || 0),
                    subscriptions: acc.subscriptions + (curr.subscriptions || 0),
                    revenue: acc.revenue + (parseFloat(curr.total_revenue?.toString() || '0'))
                }), { users: 0, registrations: 0, subscriptions: 0, revenue: 0 });

                setTotalStats(totals);
            }
        } catch (error) {
            console.error('[Dashboard] Error loading stats:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadStats();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadStats();
    };

    // Filter TikTok campaigns
    const tiktokStats = stats.filter(s => s.source?.toLowerCase() === 'tiktok');
    const otherStats = stats.filter(s => s.source?.toLowerCase() !== 'tiktok');

    if (loading) {
        return (
            <View style={[styles.container, styles.center, isDark && { backgroundColor: '#000' }]}>
                <ActivityIndicator size="large" color="#a855f7" />
                <Text style={{ color: isDark ? '#fff' : '#000', marginTop: 10 }}>
                    Cargando métricas...
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, isDark && { backgroundColor: '#000' }]}>
            <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color={isDark ? '#fff' : '#000'} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, isDark && { color: '#fff' }]}>
                        📊 Attribution Dashboard
                    </Text>
                    <TouchableOpacity
                        onPress={() => loadStats()}
                        style={[styles.backButton, refreshing && { opacity: 0.5 }]}
                        disabled={refreshing}
                    >
                        <TrendingUp size={20} color="#a855f7" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a855f7" />
                }
            >
                {/* Overall Stats Cards */}
                <View style={styles.statsGrid}>
                    <StatCard
                        icon={<Users size={20} color="#a855f7" />}
                        label="Total Users"
                        value={totalStats.users.toString()}
                        isDark={isDark}
                    />
                    <StatCard
                        icon={<Target size={20} color="#10b981" />}
                        label="Registrations"
                        value={totalStats.registrations.toString()}
                        isDark={isDark}
                    />
                    <StatCard
                        icon={<DollarSign size={20} color="#f59e0b" />}
                        label="Subscriptions"
                        value={totalStats.subscriptions.toString()}
                        isDark={isDark}
                    />
                    <StatCard
                        icon={<TrendingUp size={20} color="#3b82f6" />}
                        label="Revenue"
                        value={`$${totalStats.revenue.toFixed(2)}`}
                        isDark={isDark}
                    />
                </View>

                {/* TikTok Campaigns */}
                {tiktokStats.length > 0 && (
                    <>
                        <Text style={[styles.sectionTitle, isDark && { color: '#fff' }]}>
                            🎵 TikTok Ads
                        </Text>
                        {tiktokStats.map((stat, idx) => (
                            <CampaignCard key={idx} stat={stat} isDark={isDark} />
                        ))}
                    </>
                )}

                {/* Other Sources */}
                {otherStats.length > 0 && (
                    <>
                        <Text style={[styles.sectionTitle, isDark && { color: '#fff' }]}>
                            🌐 Other Sources
                        </Text>
                        {otherStats.map((stat, idx) => (
                            <CampaignCard key={idx} stat={stat} isDark={isDark} />
                        ))}
                    </>
                )}

                {/* Empty State */}
                {stats.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyTitle, isDark && { color: '#fff' }]}>
                            No hay datos todavía
                        </Text>
                        <Text style={[styles.emptyText, isDark && { color: '#888' }]}>
                            Los datos aparecerán aquí cuando usuarios instalen la app desde tus campañas.
                        </Text>
                    </View>
                )}

                {/* Instructions */}
                <View style={[styles.instructionsCard, isDark && { backgroundColor: '#1a1a1a', borderColor: '#333' }]}>
                    <Text style={[styles.instructionsTitle, isDark && { color: '#fff' }]}>
                        💡 Cómo usar TikTok Ads
                    </Text>
                    <Text style={[styles.instructionsText, isDark && { color: '#ccc' }]}>
                        1. Crea cuenta en TikTok Ads Manager{'\n'}
                        2. Activa oferta de créditos gratis (hasta $6,000){'\n'}
                        3. Usa este link en tus ads:{'\n'}
                        <Text style={{ color: '#a855f7', fontWeight: 'bold' }}>
                            https://soyremi.com?utm_source=tiktok&utm_campaign=TU_CAMPAÑA
                        </Text>
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

// Stat Card Component
function StatCard({ icon, label, value, isDark }: any) {
    return (
        <View style={[styles.statCard, isDark && { backgroundColor: '#1a1a1a', borderColor: '#333' }]}>
            {icon}
            <Text style={[styles.statValue, isDark && { color: '#fff' }]}>{value}</Text>
            <Text style={[styles.statLabel, isDark && { color: '#888' }]}>{label}</Text>
        </View>
    );
}

// Campaign Card Component
function CampaignCard({ stat, isDark }: { stat: CampaignStats; isDark: boolean }) {
    const conversionRate = stat.conversion_rate || 0;
    const cpa = stat.subscriptions > 0 ? (stat.total_revenue / stat.subscriptions) : 0;

    return (
        <View style={[styles.campaignCard, isDark && { backgroundColor: '#1a1a1a', borderColor: '#333' }]}>
            <View style={styles.campaignHeader}>
                <Text style={[styles.campaignName, isDark && { color: '#fff' }]}>
                    {stat.campaign || 'Unnamed Campaign'}
                </Text>
                <View style={[styles.sourceBadge, {
                    backgroundColor: stat.source === 'tiktok' ? '#fe2c55' : '#6366f1'
                }]}>
                    <Text style={styles.sourceBadgeText}>
                        {stat.source?.toUpperCase() || 'ORGANIC'}
                    </Text>
                </View>
            </View>

            <View style={styles.campaignStats}>
                <View style={styles.campaignStat}>
                    <Text style={[styles.campaignStatValue, isDark && { color: '#fff' }]}>
                        {stat.total_users || 0}
                    </Text>
                    <Text style={[styles.campaignStatLabel, isDark && { color: '#888' }]}>
                        Users
                    </Text>
                </View>

                <View style={styles.campaignStat}>
                    <Text style={[styles.campaignStatValue, isDark && { color: '#fff' }]}>
                        {stat.registrations || 0}
                    </Text>
                    <Text style={[styles.campaignStatLabel, isDark && { color: '#888' }]}>
                        Signups
                    </Text>
                </View>

                <View style={styles.campaignStat}>
                    <Text style={[styles.campaignStatValue, isDark && { color: '#fff' }]}>
                        {stat.subscriptions || 0}
                    </Text>
                    <Text style={[styles.campaignStatLabel, isDark && { color: '#888' }]}>
                        Subs
                    </Text>
                </View>

                <View style={styles.campaignStat}>
                    <Text style={[styles.campaignStatValue, { color: '#10b981' }]}>
                        {conversionRate.toFixed(1)}%
                    </Text>
                    <Text style={[styles.campaignStatLabel, isDark && { color: '#888' }]}>
                        CVR
                    </Text>
                </View>
            </View>

            <View style={styles.campaignFooter}>
                <Text style={[styles.revenueText, isDark && { color: '#10b981' }]}>
                    ${parseFloat(stat.total_revenue?.toString() || '0').toFixed(2)} revenue
                </Text>
                {cpa > 0 && (
                    <Text style={[styles.cpaText, isDark && { color: '#888' }]}>
                        ${cpa.toFixed(2)} CPA
                    </Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignItems: 'center',
        gap: 6,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 12,
        marginTop: 8,
    },
    campaignCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    campaignHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    campaignName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        flex: 1,
    },
    sourceBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    sourceBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    campaignStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#f3f4f6',
    },
    campaignStat: {
        alignItems: 'center',
    },
    campaignStatValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    campaignStatLabel: {
        fontSize: 11,
        color: '#6b7280',
        marginTop: 2,
    },
    campaignFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    revenueText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#10b981',
    },
    cpaText: {
        fontSize: 14,
        color: '#6b7280',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    instructionsCard: {
        backgroundColor: '#f9fafb',
        borderRadius: 16,
        padding: 16,
        marginTop: 24,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    instructionsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 8,
    },
    instructionsText: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
    },
});
