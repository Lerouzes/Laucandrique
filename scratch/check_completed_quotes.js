const fs = require('fs');

const envFile = fs.readFileSync('/Users/goon/Desktop/LAUCANDRIQUE/gustav/.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length === 2) {
        env[parts[0].trim()] = parts[1].trim();
    }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

async function main() {
    const url = `${supabaseUrl}/rest/v1/quotes?select=*,clients(*),contractors(*),quote_items(*)&limit=3`;
    const response = await fetch(url, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });

    if (!response.ok) {
        console.error('Fetch error:', response.statusText);
        return;
    }

    const quotes = await response.json();
    console.log('Quotes count:', quotes.length);
    quotes.forEach((q, idx) => {
        console.log(`\n--- Quote #${idx + 1} ---`);
        console.log(`ID: ${q.id}`);
        console.log(`Status: ${q.status}`);
        console.log(`Quote Number: ${q.quote_number}`);
        console.log(`Title: ${q.title}`);
        console.log(`Client ID: ${q.client_id}`);
        console.log(`Client Name: ${q.clients ? q.clients.full_name : 'null'}`);
        console.log(`Contractor ID: ${q.contractor_id}`);
        console.log(`Contractor Name: ${q.contractors ? q.contractors.full_name : 'null'}`);
        console.log(`Items count: ${q.quote_items ? q.quote_items.length : 0}`);
        if (q.quote_items && q.quote_items.length > 0) {
            console.log('Items:', q.quote_items);
        }
    });
}

main();
