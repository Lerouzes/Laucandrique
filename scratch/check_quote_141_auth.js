const fs = require('fs');

// Load environment variables from .env.local
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

async function main() {
    const email = `temp_debug_${Date.now()}@example.com`;
    const password = 'TemporaryPassword123!';

    // Sign up first
    const signupRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
            'apikey': supabaseKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    });
    const signupData = await signupRes.json();
    if (!signupRes.ok) {
        console.error('Signup failed:', signupData);
        return;
    }
    const token = signupData.access_token;

    console.log('Searching for any projects or quotes matching "Correction porte" by title...');
    
    // 1. Search quotes by title
    const qUrl = `${supabaseUrl}/rest/v1/quotes?title=ilike.*Correction%20porte*&select=*,projects(*)`;
    const qResponse = await fetch(qUrl, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${token}`
        }
    });
    const quotes = await qResponse.json();
    console.log(`Found ${quotes.length} quotes with matching title:`);
    quotes.forEach(q => {
        console.log(`- Quote #${q.quote_number} (id: ${q.id}) Status: ${q.status}, Client ID: ${q.client_id}`);
        console.log(`  Linked projects (${q.projects.length}):`);
        q.projects.forEach(p => {
            console.log(`    * Project ID: ${p.id}, Title: "${p.title}", Status: ${p.status}, start_date: ${p.start_date}`);
        });
    });

    // 2. Search projects by title
    console.log('\nSearching for any projects matching "Correction porte" by title...');
    const pUrl = `${supabaseUrl}/rest/v1/projects?title=ilike.*Correction%20porte*&select=*`;
    const pResponse = await fetch(pUrl, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${token}`
        }
    });
    const projects = await pResponse.json();
    console.log(`Found ${projects.length} projects with matching title:`);
    projects.forEach(p => {
        console.log(`- Project ID: ${p.id}, Quote ID: ${p.quote_id}, Client ID: ${p.client_id}, Status: ${p.status}, start_date: ${p.start_date}`);
    });
}

main();
