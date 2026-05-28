const fs = require('fs');

// Load environment variables from .env.local
const envFile = fs.readFileSync('/Users/goon/Desktop/LAUCANDRIQUE/gustav/.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
    if (match) {
        env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

async function main() {
    try {
        console.log('=== Upserting standard packages ===');
        const packageNames = ['Bronze', 'Argent', 'Argent+', 'Or', 'Platinum', 'Non spécifié'];
        const payload = packageNames.map(name => ({ name }));
        
        const upsertRes = await fetch(`${supabaseUrl}/rest/v1/packages`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(payload)
        });

        if (upsertRes.ok) {
            console.log('Successfully upserted packages!');
        } else {
            console.error('Error upserting packages:', upsertRes.status, await upsertRes.text());
        }

        console.log('=== Fetching Packages again ===');
        const getRes = await fetch(`${supabaseUrl}/rest/v1/packages`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        if (getRes.ok) {
            console.log(await getRes.json());
        } else {
            console.error('Error getting packages:', getRes.status, await getRes.text());
        }
    } catch (err) {
        console.error("Failed:", err);
    }
}

main();
