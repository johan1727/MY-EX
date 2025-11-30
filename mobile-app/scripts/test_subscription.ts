
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mrabsfuwprxisgxfqnuy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yYWJzZnV3cHJ4aXNneGZxbnV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NzEzOTQsImV4cCI6MjA3OTA0NzM5NH0.V24-RloMtu_yn82Q1DdhtxHoppRwfwe415x7UO1Jjw8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSubscriptionLogic() {
    console.log('🚀 Starting Subscription Logic Verification...');

    // 1. Create a random test user
    const email = `test_${Date.now()}@example.com`;
    const password = 'password123';

    console.log(`\n1. Creating test user: ${email}`);
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        console.error('❌ Error creating user:', authError.message);
        return;
    }

    const userId = authData.user?.id;
    if (!userId) {
        console.error('❌ User created but no ID returned.');
        return;
    }
    console.log('✅ User created:', userId);

    // 2. Test Message Limits (Limit: 10)
    console.log('\n2. Testing Message Limits (Limit: 10)');

    for (let i = 1; i <= 12; i++) {
        const { data: allowed, error } = await supabase.rpc('increment_usage', {
            user_id: userId,
            feature_type: 'message'
        });

        if (error) {
            console.error(`❌ Error on attempt ${i}:`, error.message);
            break;
        }

        if (i <= 10) {
            if (allowed === true) {
                console.log(`✅ Attempt ${i}: Allowed (Expected)`);
            } else {
                console.error(`❌ Attempt ${i}: Blocked (Unexpected)`);
            }
        } else {
            if (allowed === false) {
                console.log(`✅ Attempt ${i}: Blocked (Expected - Limit Reached)`);
            } else {
                console.error(`❌ Attempt ${i}: Allowed (Unexpected - Should be blocked)`);
            }
        }
    }

    // 3. Test Decoder Limits (Limit: 1)
    console.log('\n3. Testing Decoder Limits (Limit: 1)');

    // Attempt 1 (Should succeed)
    const { data: allowed1 } = await supabase.rpc('increment_usage', {
        user_id: userId,
        feature_type: 'decoder'
    });
    console.log(allowed1 ? '✅ Attempt 1: Allowed (Expected)' : '❌ Attempt 1: Blocked (Unexpected)');

    // Attempt 2 (Should fail)
    const { data: allowed2 } = await supabase.rpc('increment_usage', {
        user_id: userId,
        feature_type: 'decoder'
    });
    console.log(!allowed2 ? '✅ Attempt 2: Blocked (Expected)' : '❌ Attempt 2: Allowed (Unexpected)');

    console.log('\n🏁 Verification Complete.');
}

testSubscriptionLogic();
