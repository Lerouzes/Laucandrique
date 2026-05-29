import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
    try {
        const payload = await request.json()
        const {
            external_m365_id,
            title,
            manager_email,
            contract_tier,
            monthly_revenue,
            end_date
        } = payload

        if (!title || !external_m365_id) {
            return NextResponse.json({ error: 'Champs Title et external_m365_id obligatoires.' }, { status: 400 })
        }

        const supabase = await createClient()

        // 1. Look up the existing client record
        const { data: client } = await supabase
            .from('clients')
            .select('id, full_name, company_name, manager_id, managers(email), contracts(package_name, monthly_fee, end_date)')
            .or(`company_name.eq."${title}",full_name.eq."${title}"`)
            .maybeSingle()

        if (!client) {
            // New client delta sync -> create 'all_fields' pending item
            const newClientPayload = {
                full_name: title,
                company_name: title,
                manager_email: manager_email || null,
                package_name: contract_tier || 'Bronze',
                monthly_fee: monthly_revenue != null ? Number(monthly_revenue) : 0,
                end_date: end_date || null
            }

            // Check if already pending in queue
            const { data: queueExist } = await supabase
                .from('sync_approval_queue')
                .select('id')
                .eq('external_m365_id', external_m365_id)
                .eq('approval_status', 'Pending')
                .maybeSingle()

            if (!queueExist) {
                await supabase.from('sync_approval_queue').insert({
                    external_m365_id,
                    field_name: 'all_fields',
                    new_value: JSON.stringify(newClientPayload),
                    approval_status: 'Pending',
                    requested_by: 'M365 Webhook Delta API'
                })
            }

            return NextResponse.json({ success: true, message: 'Nouveau client ajouté à la file d\'approbation.' })
        }

        const clientId = client.id
        const contract = client.contracts
        const managerEmail = client.managers?.email

        // 2. Perform delta comparisons
        const differences = []

        // A. Monthly Revenue
        if (monthly_revenue != null && Number(contract?.monthly_fee || 0) !== Number(monthly_revenue)) {
            differences.push({
                field_name: 'monthly_fee',
                old_value: contract?.monthly_fee ? String(contract.monthly_fee) : null,
                new_value: String(monthly_revenue)
            })
        }

        // B. Contract Tier
        if (contract_tier && contract?.package_name !== contract_tier) {
            differences.push({
                field_name: 'package_name',
                old_value: contract?.package_name || null,
                new_value: contract_tier
            })
        }

        // C. End Date
        if (end_date !== undefined && contract?.end_date !== end_date) {
            differences.push({
                field_name: 'end_date',
                old_value: contract?.end_date || null,
                new_value: end_date || null
            })
        }

        // D. Manager
        if (manager_email && managerEmail !== manager_email) {
            // Find target manager id
            const { data: manager } = await supabase
                .from('managers')
                .select('id')
                .eq('email', manager_email)
                .maybeSingle()

            if (manager && client.manager_id !== manager.id) {
                differences.push({
                    field_name: 'manager_id',
                    old_value: client.manager_id || null,
                    new_value: manager.id
                })
            }
        }

        // 3. Insert individual pending rows for every difference
        let insertedCount = 0
        for (const diff of differences) {
            // Avoid duplicate queue entries for the same client and field
            const { data: exist } = await supabase
                .from('sync_approval_queue')
                .select('id')
                .eq('target_client_id', clientId)
                .eq('field_name', diff.field_name)
                .eq('approval_status', 'Pending')
                .maybeSingle()

            if (!exist) {
                await supabase.from('sync_approval_queue').insert({
                    target_client_id: clientId,
                    external_m365_id,
                    field_name: diff.field_name,
                    old_value: diff.old_value,
                    new_value: diff.new_value,
                    approval_status: 'Pending',
                    requested_by: 'M365 Webhook Delta API'
                })
                insertedCount++
            }
        }

        return NextResponse.json({ success: true, differencesFound: differences.length, queued: insertedCount })
    } catch (err: any) {
        console.error('Webhook error:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
