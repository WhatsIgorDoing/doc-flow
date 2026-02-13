const fs = require('fs');
const path = require('path');
const https = require('https');

// 1. Load env
try {
    const envPath = path.resolve(process.cwd(), 'doc-flow-web', '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;

        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^['"]|['"]$/g, ''); // Remove quotes
            process.env[key] = value;
        }
    });
    console.log('✅ Loaded .env.local');
} catch (e) {
    console.error('❌ Failed to load .env.local:', e.message);
    process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log(`URL: ${url}`);
console.log(`Key: ${key ? key.substring(0, 10) + '...' : 'MISSING'}`);

if (!url || !key) {
    console.error('❌ Missing URL or Key');
    process.exit(1);
}

// 2. Manual Fetch Test
console.log('\n--- FETCH TEST ---');
const endpoint = `${url}/rest/v1/validated_documents?select=*&limit=1`;
const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`
};

if (typeof fetch === 'function') {
    console.log('Using global fetch...');
    fetch(endpoint, { headers })
        .then(async res => {
            console.log(`Status: ${res.status}`);
            if (!res.ok) {
                console.log('Text:', await res.text());
                process.exit(1);
            } else {
                const data = await res.json();
                console.log('✅ Success! Data:', JSON.stringify(data).substring(0, 100) + '...');
                process.exit(0);
            }
        })
        .catch(err => {
            console.error('❌ Fetch Failed:', err);
            if (err.cause) console.error('Cause:', err.cause);
            process.exit(1);
        });
} else {
    // Fallback
    console.log('Using https...');
    https.get(endpoint, { headers }, (res) => {
        console.log(`Status: ${res.status}`);
        res.on('data', (d) => process.stdout.write(d));
    }).on('error', (e) => {
        console.error('❌ HTTPS Error:', e);
        process.exit(1);
    });
}
