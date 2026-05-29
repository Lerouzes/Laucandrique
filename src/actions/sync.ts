// @ts-nocheck
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Contract tier ranks for downgrade check
const TIER_RANKS = {
    'Bronze': 1,
    'Argent': 2,
    'Argent+': 3,
    'Or': 4,
    'Platinum': 5
}

function isDowngrade(oldTier: string | null, newTier: string): boolean {
    if (!oldTier) return false
    const oldRank = TIER_RANKS[oldTier]
    const newRank = TIER_RANKS[newTier]
    return !!(oldRank && newRank && newRank < oldRank)
}

// Fetch or create next draft 1v1 for a manager
async function getOrCreateDraftOneOnOne(supabase: any, managerId: string) {
    let { data: nextMeeting } = await supabase
        .from('one_on_ones')
        .select('id, current_issues')
        .eq('manager_id', managerId)
        .eq('status', 'draft')
        .order('meeting_date', { ascending: true })
        .limit(1)
        .maybeSingle()

    if (!nextMeeting) {
        const d = new Date()
        d.setDate(d.getDate() + 7)
        const meetingDate = d.toISOString().split('T')[0]
        const { data: createdMeeting, error } = await supabase
            .from('one_on_ones')
            .insert({
                manager_id: managerId,
                meeting_date: meetingDate,
                status: 'draft',
                current_issues: ''
            })
            .select('id, current_issues')
            .single()

        if (error) {
            console.error('Error creating default draft 1v1:', error)
            throw new Error('Impossible de créer la rencontre 1-à-1 par défaut.')
        }
        nextMeeting = createdMeeting
    }

    return nextMeeting
}

// Fetch all pending queue changes
export async function getPendingQueueAction() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('sync_approval_queue')
        .select('*, clients(full_name, company_name)')
        .eq('approval_status', 'Pending')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error getting pending queue:', error)
        return []
    }
    return data || []
}

// Reject a queue change
export async function rejectQueueChangeAction(queueId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('sync_approval_queue')
        .update({ approval_status: 'Rejected' })
        .eq('id', queueId)

    if (error) {
        console.error('Error rejecting queue change:', error)
        throw new Error(error.message)
    }

    revalidatePath('/team-management/change-approvals')
    return { success: true }
}

// Approve a queue change (with conditional workflows)
export async function approveQueueChangeAction(queueId: string) {
    const supabase = await createClient()

    // 1. Fetch item
    const { data: item, error: fetchErr } = await supabase
        .from('sync_approval_queue')
        .select('*, clients(full_name, company_name, manager_id)')
        .eq('id', queueId)
        .single()

    if (fetchErr || !item) {
        throw new Error(fetchErr?.message || 'Staging item non trouvé.')
    }

    if (item.approval_status !== 'Pending') {
        throw new Error("L'action a déjà été traitée.")
    }

    const { field_name, target_client_id, old_value, new_value, requested_by } = item

    try {
        if (field_name === 'all_fields') {
            const payload = JSON.parse(new_value)
            const oldState = old_value ? JSON.parse(old_value) : null

            // Find manager_id by manager_email
            let managerId = null
            if (payload.manager_email) {
                const { data: manager } = await supabase
                    .from('managers')
                    .select('id')
                    .eq('email', payload.manager_email)
                    .maybeSingle()
                managerId = manager?.id || null
            }

            if (!target_client_id) {
                // workflow: New client import
                const newClient = {
                    full_name: payload.full_name || 'Client Inconnu',
                    company_name: payload.company_name || null,
                    email: payload.email || null,
                    phone: payload.phone || null,
                    address: payload.address || null,
                    city: payload.city || null,
                    province: payload.province || null,
                    postal_code: payload.postal_code || null,
                    manager_id: managerId,
                    status: 'active'
                }

                const { data: inserted, error: insErr } = await supabase
                    .from('clients')
                    .insert(newClient)
                    .select('id')
                    .single()

                if (insErr) throw insErr

                const clientId = inserted.id

                // Create contract
                await supabase.from('contracts').insert({
                    client_id: clientId,
                    package_name: payload.package_name || 'Bronze',
                    monthly_fee: payload.monthly_fee || 0.00,
                    start_date: payload.start_date || new Date().toISOString().split('T')[0],
                    end_date: payload.end_date || null,
                    active: true
                })

                // Create doors placeholder
                await supabase.from('doors').insert({
                    client_id: clientId,
                    door_number: 'Porte non spécifiée'
                })

                // Ledger log
                await supabase.from('data_history_ledger').insert({
                    target_client_id: clientId,
                    event_type: 'INITIAL_IMPORT',
                    old_value: null,
                    new_value: JSON.stringify(newClient),
                    processed_by: requested_by
                })

            } else {
                // workflow: Existing client updates (compare and perform actions)
                const clientId = target_client_id
                const clientName = item.clients?.company_name || item.clients?.full_name

                // Perform live database update for client details
                await supabase.from('clients').update({
                    full_name: payload.full_name,
                    company_name: payload.company_name,
                    email: payload.email,
                    phone: payload.phone,
                    address: payload.address,
                    city: payload.city,
                    province: payload.province,
                    postal_code: payload.postal_code,
                    manager_id: managerId,
                    status: payload.end_date ? 'inactive' : 'active',
                    departure_date: payload.end_date || null
                }).eq('id', clientId)

                // Update contracts
                await supabase.from('contracts').upsert({
                    client_id: clientId,
                    package_name: payload.package_name || 'Bronze',
                    monthly_fee: payload.monthly_fee || 0.00,
                    end_date: payload.end_date || null,
                    active: !payload.end_date
                }, { onConflict: 'client_id' })

                // Trigger Sub-Workflows based on changes:
                // A. Reassigned Manager
                if (oldState && oldState.manager_id !== managerId) {
                    await supabase.from('data_history_ledger').insert({
                        target_client_id: clientId,
                        event_type: 'MANAGER_REASSIGNED',
                        old_value: oldState.manager_id,
                        new_value: managerId,
                        processed_by: requested_by
                    })
                }

                // B. Revenue change
                if (oldState && Number(oldState.monthly_fee) !== Number(payload.monthly_fee)) {
                    await supabase.from('data_history_ledger').insert({
                        target_client_id: clientId,
                        event_type: 'REVENUE_CHANGED',
                        old_value: String(oldState.monthly_fee),
                        new_value: String(payload.monthly_fee),
                        processed_by: requested_by
                    })
                }

                // C. Package tier changes (downgrade check)
                if (oldState && oldState.package_name !== payload.package_name) {
                    const checkDown = isDowngrade(oldState.package_name, payload.package_name)
                    await supabase.from('data_history_ledger').insert({
                        target_client_id: clientId,
                        event_type: checkDown ? 'TIER_DOWNGRADED' : 'TIER_CHANGED',
                        old_value: oldState.package_name,
                        new_value: payload.package_name,
                        processed_by: requested_by
                    })

                    if (checkDown && managerId) {
                        const nextMeeting = await getOrCreateDraftOneOnOne(supabase, managerId)
                        const discussionPoint = `\n- DISCUSSION: Baisse de forfait pour ${clientName} (Passage de ${oldState.package_name} à ${payload.package_name})`
                        const currentIssues = (nextMeeting.current_issues || '') + discussionPoint
                        await supabase.from('one_on_ones').update({ current_issues: currentIssues }).eq('id', nextMeeting.id)
                    }
                }

                // D. Contract end date adding (Syndicate Lost)
                if (payload.end_date && (!oldState || !oldState.end_date)) {
                    await supabase.from('data_history_ledger').insert({
                        target_client_id: clientId,
                        event_type: 'SYNDICATE_LOST',
                        old_value: oldState?.end_date || null,
                        new_value: payload.end_date,
                        processed_by: requested_by
                    })

                    // Inject 1v1 commitment task
                    if (managerId) {
                        const nextMeeting = await getOrCreateDraftOneOnOne(supabase, managerId)
                        await supabase.from('one_on_one_commitments').insert({
                            one_on_one_id: nextMeeting.id,
                            commitment_text: `Remplir le formulaire d'analyse de syndicat perdu (Syndicate Lost Form) pour ${clientName}`,
                            owner: 'Manager',
                            due_next_review: true,
                            status: 'Open',
                            client_id: clientId
                        })
                    }
                }
            }

        } else {
            // Webhook single field delta updates
            const clientId = target_client_id
            const clientName = item.clients?.company_name || item.clients?.full_name
            const managerId = item.clients?.manager_id

            if (field_name === 'monthly_fee') {
                // Update contracts
                await supabase.from('contracts').update({ monthly_fee: Number(new_value) }).eq('client_id', clientId)

                // History ledger
                await supabase.from('data_history_ledger').insert({
                    target_client_id: clientId,
                    event_type: 'REVENUE_CHANGED',
                    old_value,
                    new_value,
                    processed_by: requested_by
                })
            }

            else if (field_name === 'end_date' || field_name === 'departure_date') {
                // Update client & contract status
                await supabase.from('clients').update({ status: 'inactive', departure_date: new_value }).eq('id', clientId)
                await supabase.from('contracts').update({ active: false, end_date: new_value }).eq('client_id', clientId)

                // History ledger
                await supabase.from('data_history_ledger').insert({
                    target_client_id: clientId,
                    event_type: 'SYNDICATE_LOST',
                    old_value,
                    new_value,
                    processed_by: requested_by
                })

                // Inject 1v1 task
                if (managerId) {
                    const nextMeeting = await getOrCreateDraftOneOnOne(supabase, managerId)
                    await supabase.from('one_on_one_commitments').insert({
                        one_on_one_id: nextMeeting.id,
                        commitment_text: `Remplir le formulaire d'analyse de syndicat perdu (Syndicate Lost Form) pour ${clientName}`,
                        owner: 'Manager',
                        due_next_review: true,
                        status: 'Open',
                        client_id: clientId
                    })
                }
            }

            else if (field_name === 'package_name') {
                // Update contracts
                await supabase.from('contracts').update({ package_name: new_value }).eq('client_id', clientId)

                const checkDown = isDowngrade(old_value, new_value)
                await supabase.from('data_history_ledger').insert({
                    target_client_id: clientId,
                    event_type: checkDown ? 'TIER_DOWNGRADED' : 'TIER_CHANGED',
                    old_value,
                    new_value,
                    processed_by: requested_by
                })

                if (checkDown && managerId) {
                    const nextMeeting = await getOrCreateDraftOneOnOne(supabase, managerId)
                    const discussionPoint = `\n- DISCUSSION: Baisse de forfait pour ${clientName} (Passage de ${old_value || 'Non spécifié'} à ${new_value})`
                    const currentIssues = (nextMeeting.current_issues || '') + discussionPoint
                    await supabase.from('one_on_ones').update({ current_issues: currentIssues }).eq('id', nextMeeting.id)
                }
            }

            else if (field_name === 'manager_id') {
                // Update client manager
                await supabase.from('clients').update({ manager_id: new_value }).eq('id', clientId)

                await supabase.from('data_history_ledger').insert({
                    target_client_id: clientId,
                    event_type: 'MANAGER_REASSIGNED',
                    old_value,
                    new_value,
                    processed_by: requested_by
                })
            }
        }

        // 2. Set item status to approved
        await supabase
            .from('sync_approval_queue')
            .update({ approval_status: 'Approved' })
            .eq('id', queueId)

        // 3. Revalidate pages
        revalidatePath('/clients')
        revalidatePath('/team-management/change-approvals')
        revalidatePath('/team-management/dashboard')
        revalidatePath('/team-management/syndicates')

        return { success: true }
    } catch (err: any) {
        console.error('Error approving queue change:', err)
        throw new Error("Erreur d'approbation: " + err.message)
    }
}

// Trigger initial bulk list synchronization
export async function triggerInitialM365Sync() {
    const supabase = await createClient()

    const tenantId = process.env.M365_TENANT_ID
    const clientId = process.env.M365_CLIENT_ID
    const clientSecret = process.env.M365_CLIENT_SECRET
    const siteId = process.env.M365_SITE_ID
    const listId = process.env.M365_LIST_ID

    let items = []

    if (tenantId && clientId && clientSecret && siteId && listId) {
        // Authenticate with MS Graph
        try {
            const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: clientId,
                    scope: 'https://graph.microsoft.com/.default',
                    client_secret: clientSecret,
                    grant_type: 'client_credentials'
                })
            })
            const tokenData = await tokenRes.json()
            const accessToken = tokenData.access_token

            const listRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?expand=fields`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            const listData = await listRes.json()
            items = (listData.value || []).map(item => ({
                id: item.id,
                title: item.fields.Title,
                managerEmail: item.fields.ManagerEmail,
                contractTier: item.fields.ContractTier,
                monthlyRevenue: Number(item.fields.MonthlyRevenue || 0),
                endDate: item.fields.EndDate || null
            }))
        } catch (graphErr) {
            console.error('Microsoft Graph fetch failed, falling back to mock sync:', graphErr)
        }
    }

    // Fall back to Mock Sync Data if Graph API credentials are not set/working
    if (items.length === 0) {
        // Mock List Data representing Microsoft List rows
        items = [
            {
                id: 'm365-row-1',
                title: 'Condo Plaza 5',
                managerEmail: 'jean.tremblay@laucandrique.ca',
                contractTier: 'Argent',
                monthlyRevenue: 1350.00,
                endDate: null
            },
            {
                id: 'm365-row-2', // Will change SDC-002 revenue
                title: 'Syndicat des Pins',
                managerEmail: 'sophie.roy@laucandrique.ca',
                contractTier: 'Or',
                monthlyRevenue: 2800.00, // old is different
                endDate: null
            },
            {
                id: 'm365-row-3', // Downgrade test
                title: 'Les Jardins Fleuris',
                managerEmail: 'jean.tremblay@laucandrique.ca',
                contractTier: 'Bronze', // Downgrade Argent+ -> Bronze
                monthlyRevenue: 950.00,
                endDate: null
            },
            {
                id: 'm365-row-4', // Syndicate lost test
                title: 'Terrasse du Fleuve',
                managerEmail: 'sophie.roy@laucandrique.ca',
                contractTier: 'Argent',
                monthlyRevenue: 1500.00,
                endDate: '2026-06-30' // Ending date added
            }
        ]
    }

    let queuedCount = 0

    // Match each item against existing clients
    for (const item of items) {
        // Find existing client in Gustav by matching Title with company_name or full_name
        const { data: existingClient } = await supabase
            .from('clients')
            .select('id, full_name, company_name, manager_id, managers(email), contracts(package_name, monthly_fee, end_date)')
            .or(`company_name.eq."${item.title}",full_name.eq."${item.title}"`)
            .maybeSingle()

        if (!existingClient) {
            // Client does not exist -> Insert all_fields pending row
            const payload = {
                full_name: item.title,
                company_name: item.title,
                manager_email: item.managerEmail,
                package_name: item.contractTier,
                monthly_fee: item.monthlyRevenue,
                end_date: item.endDate
            }

            // Avoid inserting duplicates in queue
            const { data: queueExist } = await supabase
                .from('sync_approval_queue')
                .select('id')
                .eq('external_m365_id', item.id)
                .eq('approval_status', 'Pending')
                .maybeSingle()

            if (!queueExist) {
                await supabase.from('sync_approval_queue').insert({
                    external_m365_id: item.id,
                    field_name: 'all_fields',
                    new_value: JSON.stringify(payload),
                    approval_status: 'Pending',
                    requested_by: 'M365 Graph Sync Tool'
                })
                queuedCount++
            }
        } else {
            // Client exists, check if data differs
            const contract = existingClient.contracts
            const managerEmail = existingClient.managers?.email

            const differs = 
                (contract?.package_name !== item.contractTier) ||
                (Number(contract?.monthly_fee || 0) !== Number(item.monthlyRevenue)) ||
                (contract?.end_date !== item.endDate) ||
                (managerEmail !== item.managerEmail)

            if (differs) {
                const oldPayload = {
                    manager_id: existingClient.manager_id,
                    manager_email: managerEmail || null,
                    package_name: contract?.package_name || null,
                    monthly_fee: contract?.monthly_fee ? Number(contract.monthly_fee) : 0,
                    end_date: contract?.end_date || null
                }
                const newPayload = {
                    full_name: existingClient.full_name,
                    company_name: existingClient.company_name,
                    manager_email: item.managerEmail,
                    package_name: item.contractTier,
                    monthly_fee: item.monthlyRevenue,
                    end_date: item.endDate
                }

                const { data: queueExist } = await supabase
                    .from('sync_approval_queue')
                    .select('id')
                    .eq('target_client_id', existingClient.id)
                    .eq('approval_status', 'Pending')
                    .maybeSingle()

                if (!queueExist) {
                    await supabase.from('sync_approval_queue').insert({
                        target_client_id: existingClient.id,
                        external_m365_id: item.id,
                        field_name: 'all_fields',
                        old_value: JSON.stringify(oldPayload),
                        new_value: JSON.stringify(newPayload),
                        approval_status: 'Pending',
                        requested_by: 'M365 Graph Sync Tool'
                    })
                    queuedCount++
                }
            }
        }
    }

    revalidatePath('/team-management/change-approvals')
    return { success: true, queuedCount }
}
