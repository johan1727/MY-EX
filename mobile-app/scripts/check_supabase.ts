
import { createClient } from '@supabase/supabase-js';

// Retrieve env vars from processing (simulating environment)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://p84qnwkuo3mrf1z0.supabase.co'; // Hardcoded from user context if env fails
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_KEY) {
    console.error("Please set EXPO_PUBLIC_SUPABASE_ANON_KEY in environment or hardcode for testing.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkProfiles() {
    console.log("Querying Supabase ex_profiles...");

    // Get profiles with count
    const { data, error, count } = await supabase
        .from('ex_profiles')
        .select('id, ex_name, message_count, created_at, user_id', { count: 'exact' })
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error querying profiles:", error);
        return;
    }

    console.log(`Total Profiles Found: ${count}`);

    if (data && data.length > 0) {
        console.log("\nRecent Profiles:");
        data.forEach((p, i) => {
            console.log(`${i + 1}. [${p.ex_name}] (ID: ${p.id})`);
            console.log(`   - Messages: ${p.message_count}`);
            console.log(`   - Created: ${new Date(p.created_at).toLocaleString()}`);
            console.log(`   - User ID: ${p.user_id}`);
        });
    } else {
        console.log("No profiles found.");
    }
}

checkProfiles();
