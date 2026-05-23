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
    const { data: quotes, error } = await supabase
        .from('quotes')
        .select('id, status, manager_id, total');
    
    if (error) {
        console.error('Error fetching quotes:', error);
        return;
    }

    console.log(`Total quotes fetched: ${quotes.length}`);
    const statusCounts = {};
    quotes.forEach(q => {
        statusCounts[q.status] = (statusCounts[q.status] || 0) + 1;
    });
    console.log('Status distribution:', statusCounts);

    // Let's see some example quotes with status sent
    const sentQuotes = quotes.filter(q => q.status === 'sent');
    console.log(`Sent quotes count: ${sentQuotes.length}`);
    if (sentQuotes.length > 0) {
        console.log('Sample sent quotes:', sentQuotes.slice(0, 5));
    }
}

main();
