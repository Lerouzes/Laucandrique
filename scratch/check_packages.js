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

console.log('Connecting to REST endpoint:', supabaseUrl);

async function main() {
    try {
        console.log('=== Packages ===');
        const pkgRes = await fetch(`${supabaseUrl}/rest/v1/packages`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        if (pkgRes.ok) {
            const packages = await pkgRes.json();
            console.log(packages);
        } else {
            console.error('Error fetching packages:', pkgRes.status, await pkgRes.text());
        }

        console.log('=== Contracts Sample ===');
        const contractRes = await fetch(`${supabaseUrl}/rest/v1/contracts?limit=5`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        if (contractRes.ok) {
            const contracts = await contractRes.json();
            console.log(contracts);
        } else {
            console.error('Error fetching contracts:', contractRes.status, await contractRes.text());
        }

        console.log('=== Contracts Count ===');
        const countRes = await fetch(`${supabaseUrl}/rest/v1/contracts`, {
            method: 'HEAD',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Prefer': 'count=exact'
            }
        });
        console.log('Contracts Count Header:', countRes.headers.get('content-range'));

    } catch (err) {
        console.error("Fetch request failed:", err);
    }
}

main();
