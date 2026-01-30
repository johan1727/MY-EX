import { supabase } from './supabase';

/**
 * List of admin emails who can access analytics and admin features
 * TODO: Move this to environment variables or Supabase config table
 */
const ADMIN_EMAILS = [
    'gastrolbg@gmail.com',
    'jhonatanvillagomez38@gmail.com',
    // Add more admin emails here
];

/**
 * Check if current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || !user.email) {
            return false;
        }

        return ADMIN_EMAILS.includes(user.email.toLowerCase());
    } catch (error) {
        console.error('[Admin] Error checking admin status:', error);
        return false;
    }
}

/**
 * Get admin email for current user (returns null if not admin)
 */
export async function getAdminEmail(): Promise<string | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || !user.email) {
            return null;
        }

        const email = user.email.toLowerCase();
        return ADMIN_EMAILS.includes(email) ? email : null;
    } catch (error) {
        console.error('[Admin] Error getting admin email:', error);
        return null;
    }
}

/**
 * Require admin access - throws error if not admin
 */
export async function requireAdmin(): Promise<void> {
    const admin = await isAdmin();

    if (!admin) {
        throw new Error('Unauthorized: Admin access required');
    }
}
