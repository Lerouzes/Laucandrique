const fs = require('fs');

// Load environment variables from .env.local
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
    try {
        const res = await fetch(`${supabaseUrl}/rest/v1/settings`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        if (!res.ok) {
            const errText = await res.text();
            console.error('Error fetching settings:', res.status, errText);
            return;
        }
        const data = await res.json();
        console.log('Settings list length:', data.length);
        console.log('Settings list data:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Fetch request failed:", err);
    }
}

main();
