const supabaseUrl = 'https://fvlriovotmupeqmmrlit.supabase.co';
const supabaseKey = 'sb_publishable_srNlt6jpuGKP95AuTrt5bw_Jbhj6Meu';

async function fetchFromSupabase(path, options = {}) {
    const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
        ...options,
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });
    return {
        status: res.status,
        statusText: res.statusText,
        data: res.ok ? await res.json().catch(() => null) : await res.text()
    };
}

async function run() {
    console.log("Checking if syndicate_workload exists...");
    const workloadRes = await fetchFromSupabase('syndicate_workload?limit=1');
    console.log("syndicate_workload query status:", workloadRes.status);
    console.log("syndicate_workload response:", workloadRes.data);

    console.log("\nChecking if one_on_ones has conducted_by...");
    const oneOnOnesRes = await fetchFromSupabase('one_on_ones?select=id,conducted_by&limit=1');
    console.log("one_on_ones query status:", oneOnOnesRes.status);
    console.log("one_on_ones response:", oneOnOnesRes.data);
}

run();
