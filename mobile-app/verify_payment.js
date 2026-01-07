
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.log('Error: Missing Env Vars');
    process.exit(1);
}

console.log(`Connecting to Supabase at ${supabaseUrl} with key ending in ...${supabaseKey.slice(-4)}`);
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPaidUsers() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(5);

    if (error) {
        console.log('Error query:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('--- NO PAID USERS FOUND ---');
    } else {
        console.log(`--- FOUND ${data.length} PAID USERS ---`);
        data.forEach(user => {
            console.log(`Email: ${user.email}`);
            console.log(`Tier: ${user.subscription_tier}`);
            console.log(`Status: ${user.subscription_status}`);
            console.log(`Stripe ID: ${user.stripe_customer_id}`);
            console.log(`Start Date: ${user.subscription_start_date}`);
            console.log(`Period End: ${user.subscription_current_period_end}`);
            console.log(`Expires At: ${user.subscription_expires_at}`);
            console.log('------------------');
        });
    }
}

checkPaidUsers();
