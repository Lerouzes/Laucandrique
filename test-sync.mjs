const supabaseUrl = 'https://fvlriovotmupeqmmrlit.supabase.co';
const supabaseKey = 'sb_publishable_srNlt6jpuGKP95AuTrt5bw_Jbhj6Meu';

async function fetchFromSupabase(path, options = {}) {
    const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
        ...options,
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
            ...(options.headers || {})
        }
    });
    if (!res.ok) {
        throw new Error(`Supabase error: ${res.status} ${await res.text()}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

async function testInsert() {
    try {
        const payload = {
            external_m365_id: 'm365-row-1',
            field_name: 'all_fields',
            new_value: '{}',
            approval_status: 'Pending',
            requested_by: 'Test Script'
        };
        const data = await fetchFromSupabase('sync_approval_queue', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        console.log("Insert success:", data);
    } catch (err) {
        console.error("Insert failed:", err);
    }
}

testInsert();
