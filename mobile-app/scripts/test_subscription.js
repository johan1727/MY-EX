const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mrabsfuwprxisgxfqnuy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yYWJzZnV3cHJ4aXNneGZxbnV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NzEzOTQsImV4cCI6MjA3OTA0NzM5NH0.V24-RloMtu_yn82Q1DdhtxHoppRwfwe415x7UO1Jjw8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSubscriptionLogic() {
    console.log('🚀 Starting Subscription Logic Verification...\n');

    // Prompt user for credentials
    console.log('⚠️  This test requires an existing user account.');
    console.log('Please provide credentials for testing:\n');

    // For automated testing, we'll use a test user ID directly
    // In production, you would prompt for email/password
    const testUserId = 'test-user-id-placeholder';

    console.log('Testing with user ID:', testUserId);
    console.log('\n' + '='.repeat(60));

    // Test 1: Message Limits (10 free messages)
    console.log('\n📨 TEST 1: Message Limits (Free tier: 10 messages/day)');
    console.log('='.repeat(60));

    let messageCount = 0;
    for (let i = 1; i <= 12; i++) {
        const { data: allowed, error } = await supabase.rpc('increment_usage', {
            user_id: testUserId,
            feature_type: 'message'
        });

        if (error) {
            console.log(`\n⚠️  RPC Error on attempt ${i}:`, error.message);
            if (error.message.includes('does not exist')) {
                console.log('\n❌ The increment_usage function does not exist in Supabase.');
                console.log('Please run the migration: supabase/migrations/20240601000001_usage_tracking.sql\n');
                return;
            }
            break;
        }

        if (allowed === true) {
            messageCount++;
            console.log(`✅ Message ${i}: Allowed (Count: ${messageCount}/10)`);
        } else {
            console.log(`🚫 Message ${i}: BLOCKED - Daily limit reached!`);
        }
    }

    console.log(`\n📊 Result: ${messageCount} messages allowed before blocking`);
    console.log(messageCount === 10 ? '✅ PASS: Limit working correctly' : '❌ FAIL: Expected 10 messages');

    // Test 2: Decoder Limits (1 free analysis per week)
    console.log('\n' + '='.repeat(60));
    console.log('🔍 TEST 2: Decoder Limits (Free tier: 1 analysis/week)');
    console.log('='.repeat(60));

    let decoderCount = 0;
    for (let i = 1; i <= 3; i++) {
        const { data: allowed, error } = await supabase.rpc('increment_usage', {
            user_id: testUserId,
            feature_type: 'decoder'
        });

        if (error) {
            console.log(`\n⚠️  RPC Error on attempt ${i}:`, error.message);
            break;
        }

        if (allowed === true) {
            decoderCount++;
            console.log(`✅ Analysis ${i}: Allowed`);
        } else {
            console.log(`🚫 Analysis ${i}: BLOCKED - Weekly limit reached!`);
        }
    }

    console.log(`\n📊 Result: ${decoderCount} analysis allowed before blocking`);
    console.log(decoderCount === 1 ? '✅ PASS: Limit working correctly' : '❌ FAIL: Expected 1 analysis');

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Messages: ${messageCount === 10 ? '✅ PASS' : '❌ FAIL'} (${messageCount}/10)`);
    console.log(`Decoder:  ${decoderCount === 1 ? '✅ PASS' : '❌ FAIL'} (${decoderCount}/1)`);
    console.log('\n🏁 Verification Complete.\n');
}

testSubscriptionLogic().catch(err => {
    console.error('\n❌ Fatal Error:', err.message);
    console.error(err);
});
