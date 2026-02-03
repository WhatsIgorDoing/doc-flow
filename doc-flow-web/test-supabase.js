// Test Supabase Connection
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://egfaojisslxiqixggmjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZmFvamlzc2x4aXFpeGdnbWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDA1NDQsImV4cCI6MjA4NTAxNjU0NH0.5C-yAoaj4R6I1sAE1VATTk72YPLQcAJO4S2Lhe40FOY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('🔍 Testing Supabase connection...');
    console.log('URL:', supabaseUrl);

    try {
        // Test 1: Simple query
        console.log('\n📊 Test 1: Fetching companies...');
        const { data: companies, error: companiesError } = await supabase
            .from('companies')
            .select('*')
            .limit(5);

        if (companiesError) {
            console.error('❌ Companies Error:', companiesError);
        } else {
            console.log('✅ Companies found:', companies?.length || 0);
            if (companies && companies.length > 0) {
                console.log('   First company:', companies[0]);
            }
        }

        // Test 2: Fetch demo contract
        console.log('\n📊 Test 2: Fetching demo contract...');
        const { data: contract, error: contractError } = await supabase
            .from('contracts')
            .select('*, company:companies(*)')
            .eq('id', '00000000-0000-0000-0000-000000000002')
            .single();

        if (contractError) {
            console.error('❌ Contract Error:', contractError);
        } else {
            console.log('✅ Contract found:', contract);
        }

        console.log('\n✅ Connection test complete!');
    } catch (error) {
        console.error('\n❌ Fatal error:', error);
    }
}

testConnection();
