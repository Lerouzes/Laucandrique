global.WebSocket = class {};

const { createClient } = require('@supabase/supabase-js');
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

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Testing raw query on bills table...');
    
    const { data: rawBills, error: rawError } = await supabase
        .from('bills')
        .select('*');
        
    if (rawError) {
        console.error('Error fetching raw bills:', rawError);
        return;
    }
    console.log(`Raw query success! Bills count: ${rawBills.length}`);

    console.log('Testing full nested query on bills table...');
    const { data, error } = await supabase
        .from('bills')
        .select('*, quotes(quote_number, title, manager_id, managers(first_name, last_name, team_id)), clients(full_name, company_name), contractors(full_name)');

    if (error) {
        console.error('ERROR in nested query:', error);
    } else {
        console.log('Nested query success!', JSON.stringify(data, null, 2));
    }
}

main();
