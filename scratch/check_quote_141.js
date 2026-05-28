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
    console.log('Fetching recent quotes...');
    const url = `${supabaseUrl}/rest/v1/quotes?select=id,quote_number,status&order=quote_number.desc&limit=100`;
    const response = await fetch(url, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });

    if (!response.ok) {
        console.error('API Error:', response.status, await response.text());
        return;
    }

    const quotes = await response.json();
    console.log(`Fetched ${quotes.length} quotes:`);
    console.log(quotes.map(q => `Quote #${q.quote_number} (id: ${q.id}, status: ${q.status})`).join('\n'));
}

main();
