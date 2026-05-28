const fs = require('fs');

const envFile = fs.readFileSync('./.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
    }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key length:', supabaseKey ? supabaseKey.length : 0);
console.log('Supabase Key starts with:', supabaseKey ? supabaseKey.substring(0, 15) : 'none');

async function main() {
    // 1. Fetch count of quotes
    const qUrl = `${supabaseUrl}/rest/v1/quotes?select=id&limit=1`;
    const qRes = await fetch(qUrl, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    console.log('Quotes table response status:', qRes.status);
    if (qRes.ok) {
        const data = await qRes.json();
        console.log('Quotes data sample:', data);
    } else {
        console.log('Quotes error:', await qRes.text());
    }

    // 2. Fetch count of projects
    const pUrl = `${supabaseUrl}/rest/v1/projects?select=id&limit=1`;
    const pRes = await fetch(pUrl, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    console.log('Projects table response status:', pRes.status);
    if (pRes.ok) {
        const data = await pRes.json();
        console.log('Projects data sample:', data);
    } else {
        console.log('Projects error:', await pRes.text());
    }
}

main();
