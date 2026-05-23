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
        const query = 'table_name=eq.settings&select=column_name,data_type';
        const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_columns?table_name=settings`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        // Let's also try standard REST query on information_schema view if RPC doesn't exist
        const res2 = await fetch(`${supabaseUrl}/rest/v1/information_schema_columns?table_name=settings`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        console.log('RPC response status:', res.status);
        console.log('REST response status:', res2.status);
        
        // If they both fail, let's just inspect what updateSettingsAction does or try inserting a dummy settings row to inspect the error
        const testPayload = {
            company_name: "Test Company",
            pdf_template_url: "test"
        };
        
        const resInsert = await fetch(`${supabaseUrl}/rest/v1/settings`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(testPayload)
        });
        
        console.log('Insert test with pdf_template_url status:', resInsert.status);
        const resJson = await resInsert.json();
        console.log('Insert test response:', JSON.stringify(resJson, null, 2));
    } catch (err) {
        console.error("Fetch request failed:", err);
    }
}

main();
