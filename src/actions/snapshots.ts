// @ts-nocheck
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { addManagerFromImportAction } from '@/actions/managers'

// Enforce Master/Direction profiles for snapshots
async function authorizeUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Utilisateur non authentifié.")
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || (profile.role !== 'Master' && profile.role !== 'Direction')) {
        throw new Error("Sécurité : Rôle insuffisant pour effectuer cette action.")
    }
    return { user, profile }
}

// 1. Get all snapshots
export async function getSnapshotsAction() {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('client_snapshots')
            .select('*, uploaded_by_profile:profiles!client_snapshots_uploaded_by_fkey(full_name), applied_by_profile:profiles!client_snapshots_applied_by_fkey(full_name)')
            .order('uploaded_at', { ascending: false })

        if (error) {
            console.error("Error fetching snapshots:", error)
            return []
        }
        return data || []
    } catch (err) {
        console.error("Exception in getSnapshotsAction:", err)
        return []
    }
}

// Helper: safe date parsing
function parseDateSafe(val: any): string | null {
    if (!val) return null
    const str = String(val).trim()
    if (str === '') return null
    // Accept YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (isoMatch) return isoMatch[0]
    // Accept DD/MM/YYYY
    const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (slashMatch) {
        const d = slashMatch[1].padStart(2, '0')
        const m = slashMatch[2].padStart(2, '0')
        const y = slashMatch[3]
        return `${y}-${m}-${d}`
    }
    // Accept year only
    const yearMatch = str.match(/^(\d{4})$/)
    if (yearMatch) return `${yearMatch[1]}-01-01`

    // Try standard JS Date
    const dObj = new Date(str)
    if (!isNaN(dObj.getTime())) {
        return dObj.toISOString().split('T')[0]
    }
    return null
}

// 2. Upload and process a snapshot (Draft status)
export async function uploadSnapshotAction(
    name: string,
    fileName: string,
    fileUrl: string,
    rawData: any[],
    fieldMappings: Record<string, string>
) {
    try {
        const { user } = await authorizeUser()
        const supabase = await createClient()

        // Fetch database context
        const { data: dbClients } = await supabase
            .from('clients')
            .select('*, contracts(*), doors(id)')
        
        const { data: dbManagers } = await supabase
            .from('managers')
            .select('id, first_name, last_name, email')

        const dbClientsList = dbClients || []
        const dbManagersList = dbManagers || []

        const processedRows: any[] = []
        let newCount = 0
        let modifiedCount = 0
        let inactiveCount = 0

        // Track matched DB client IDs
        const matchedDbClientIds = new Set<string>()

        // 1. Process rows in Excel rawData
        rawData.forEach((row: any, index: number) => {
            const tempId = `excel-row-${index}`
            
            // Map columns using user mapping
            const ms_list_item_id = row[fieldMappings.ms_list_item_id]?.toString()?.trim() || null
            const id = row[fieldMappings.id]?.toString()?.trim() || null
            const syndicate_code = row[fieldMappings.syndicate_code]?.toString()?.trim() || null
            const legal_name = row[fieldMappings.legal_name]?.toString()?.trim() || null
            const full_name = row[fieldMappings.full_name]?.toString()?.trim() || null
            const manager = row[fieldMappings.manager]?.toString()?.trim() || null
            const doors_count = row[fieldMappings.doors_count] != null ? parseInt(row[fieldMappings.doors_count]) : null
            const package_name_raw = row[fieldMappings.package_name]?.toString()?.trim() || null
            const package_name = (() => {
                if (!package_name_raw) return null
                const lower = package_name_raw.toLowerCase()
                if (lower.includes('platine') || lower === 'platinum') return 'Platinum'
                if (lower === 'argent +' || lower === 'argent+') return 'Argent+'
                if (lower === 'or' || lower === 'gold') return 'Or'
                if (lower === 'argent' || lower === 'silver') return 'Argent'
                if (lower === 'bronze') return 'Bronze'
                return package_name_raw // keep as-is if unrecognized
            })()
            const monthly_fee = row[fieldMappings.monthly_fee] != null 
                ? parseFloat(row[fieldMappings.monthly_fee]) 
                : (row[fieldMappings.package_pricing] != null ? parseFloat(row[fieldMappings.package_pricing]) : null)
            const financial_year = row[fieldMappings.financial_year] ? parseDateSafe(row[fieldMappings.financial_year]) : null
            const status = row[fieldMappings.status]?.toString()?.trim()?.toLowerCase() || 'active'
            const departure_date = row[fieldMappings.departure_date] ? parseDateSafe(row[fieldMappings.departure_date]) : null

            // New fields:
            const email = row[fieldMappings.email]?.toString()?.trim() || null
            const address = row[fieldMappings.address]?.toString()?.trim() || null
            const city = row[fieldMappings.city]?.toString()?.trim() || null
            const postal_code = row[fieldMappings.postal_code]?.toString()?.trim() || null
            const renewal_date = row[fieldMappings.renewal_date] ? parseDateSafe(row[fieldMappings.renewal_date]) : null
            const amount_of_meetings = row[fieldMappings.amount_of_meetings] != null ? parseInt(row[fieldMappings.amount_of_meetings]) : null
            const package_pricing = row[fieldMappings.package_pricing] != null ? parseFloat(row[fieldMappings.package_pricing]) : null
            const project_status = row[fieldMappings.project_status]?.toString()?.trim() || null
            const operations_lead_raw = row[fieldMappings.operations_lead]?.toString()?.trim() || null
            const operations_lead = (operations_lead_raw && operations_lead_raw.toLowerCase() !== 'aucun') ? operations_lead_raw : null

            // Map Team using master list naming system (G001: Classique, G002: Essentiel, G003: Tremblant)
            let team = row[fieldMappings.team]?.toString()?.trim() || null
            if (team) {
                const teamLower = team.toLowerCase()
                if (teamLower.includes('g001') || teamLower.includes('classique')) {
                    team = 'Classique'
                } else if (teamLower.includes('g002') || teamLower.includes('essentiel')) {
                    team = 'Essentiel'
                } else if (teamLower.includes('g003') || teamLower.includes('tremblant')) {
                    team = 'Tremblant'
                }
            }

            // Determine if active (Projet actif vs Projet quitté)
            let isInactive = false
            if (project_status) {
                const psLower = project_status.toLowerCase()
                if (psLower.includes('quitté') || psLower.includes('quitte') || psLower.includes('inactive')) {
                    isInactive = true
                }
            } else {
                // Fallback to original status or departure_date
                const isActiveVal = status === 'active' || status === 'actif' || status === '1' || status === 'true'
                isInactive = !isActiveVal || departure_date != null
            }

            // Find match
            let matchedClient: any = null
            let matchConfidence: 'High' | 'Medium' | 'Low' | 'None' = 'None'
            let matchReason = ""

            // Match by MS list item ID
            if (ms_list_item_id) {
                matchedClient = dbClientsList.find(c => c.ms_list_item_id === ms_list_item_id)
                if (matchedClient) {
                    matchConfidence = 'High'
                    matchReason = `ID de l'élément Microsoft List correspond (${ms_list_item_id})`
                }
            }

            // Match by Gustav ID
            if (!matchedClient && id) {
                matchedClient = dbClientsList.find(c => c.id === id)
                if (matchedClient) {
                    matchConfidence = 'High'
                    matchReason = `ID Gustav correspond (${id})`
                }
            }

            // Match by Alias / Email of the syndicate
            if (!matchedClient && email) {
                matchedClient = dbClientsList.find(c => c.email && c.email.toLowerCase() === email.toLowerCase())
                if (matchedClient) {
                    matchConfidence = 'High'
                    matchReason = `Alias / Courriel de syndicat correspond (${email})`
                }
            }

            // Match by exact Syndicate Code
            if (!matchedClient && syndicate_code) {
                matchedClient = dbClientsList.find(c => c.syndicate_code && c.syndicate_code.toLowerCase() === syndicate_code.toLowerCase())
                if (matchedClient) {
                    matchConfidence = 'High'
                    matchReason = `Code de syndicat correspond (${syndicate_code})`
                }
            }

            // Match by exact Legal Name or Display Name
            if (!matchedClient) {
                if (legal_name) {
                    matchedClient = dbClientsList.find(c => c.legal_name && c.legal_name.toLowerCase() === legal_name.toLowerCase())
                    if (!matchedClient) {
                        matchedClient = dbClientsList.find(c => c.company_name && c.company_name.toLowerCase() === legal_name.toLowerCase())
                    }
                    if (matchedClient) {
                        matchConfidence = 'Medium'
                        matchReason = `Nom légal ou entreprise correspond (${legal_name})`
                    }
                }
                if (!matchedClient && full_name) {
                    matchedClient = dbClientsList.find(c => c.company_name && c.company_name.toLowerCase() === full_name.toLowerCase())
                    if (!matchedClient) {
                        matchedClient = dbClientsList.find(c => c.full_name && c.full_name.toLowerCase() === full_name.toLowerCase())
                    }
                    if (matchedClient) {
                        matchConfidence = 'Medium'
                        matchReason = `Nom d'affichage correspond (${full_name})`
                    }
                }
            }

            // If matched, let's see if we have duplicates or other potential matches that would flag uncertainty
            let needsManualReview = false
            if (matchedClient) {
                matchedDbClientIds.add(matchedClient.id)
                // Check if other clients might match legal_name or full_name
                const alternativeMatches = dbClientsList.filter(c => 
                    c.id !== matchedClient.id && (
                        (legal_name && c.legal_name && c.legal_name.toLowerCase() === legal_name.toLowerCase()) ||
                        (full_name && c.full_name && c.full_name.toLowerCase() === full_name.toLowerCase())
                    )
                )
                if (alternativeMatches.length > 0) {
                    needsManualReview = true
                    matchConfidence = 'Low'
                    matchReason = `Ambigüité : Plusieurs clients correspondent au nom (${alternativeMatches.length + 1} trouvés)`
                }
            } else {
                matchConfidence = 'None'
            }

            // Match Manager (with null email protection)
            let matchedManagerId: string | null = null
            if (manager) {
                const mgrLower = manager.toLowerCase()
                const dbMgr = dbManagersList.find(m => 
                    (m.email && m.email.toLowerCase() === mgrLower) ||
                    `${m.first_name} ${m.last_name}`.toLowerCase() === mgrLower ||
                    m.last_name.toLowerCase() === mgrLower ||
                    m.id === manager
                )
                if (dbMgr) {
                    matchedManagerId = dbMgr.id
                } else {
                    needsManualReview = true // Highlight row if manager specified in Excel cannot be matched
                }
            }

            // Build Row Diffs if matched
            const diffs: Record<string, { db: any; excel: any }> = {}
            let hasChanges = false

            if (matchedClient) {
                const contract = Array.isArray(matchedClient.contracts) ? matchedClient.contracts[0] : matchedClient.contracts
                const dbDoorsCount = matchedClient.doors ? matchedClient.doors.length : 0

                // Field differences
                if (legal_name && matchedClient.legal_name !== legal_name && matchedClient.company_name !== legal_name) {
                    diffs.legal_name = { db: matchedClient.legal_name || matchedClient.company_name || 'N/A', excel: legal_name }
                    hasChanges = true
                }
                if (full_name && matchedClient.full_name !== full_name) {
                    diffs.full_name = { db: matchedClient.full_name || 'N/A', excel: full_name }
                    hasChanges = true
                }
                if (syndicate_code && matchedClient.syndicate_code !== syndicate_code) {
                    diffs.syndicate_code = { db: matchedClient.syndicate_code || 'N/A', excel: syndicate_code }
                    hasChanges = true
                }
                if (email && matchedClient.email !== email) {
                    diffs.email = { db: matchedClient.email || 'N/A', excel: email }
                    hasChanges = true
                }
                if (address && matchedClient.address !== address) {
                    diffs.address = { db: matchedClient.address || 'N/A', excel: address }
                    hasChanges = true
                }
                if (city && matchedClient.city !== city) {
                    diffs.city = { db: matchedClient.city || 'N/A', excel: city }
                    hasChanges = true
                }
                if (postal_code && matchedClient.postal_code !== postal_code) {
                    diffs.postal_code = { db: matchedClient.postal_code || 'N/A', excel: postal_code }
                    hasChanges = true
                }
                if (amount_of_meetings != null && matchedClient.amount_of_meetings !== amount_of_meetings) {
                    diffs.amount_of_meetings = { db: matchedClient.amount_of_meetings || '0', excel: amount_of_meetings }
                    hasChanges = true
                }
                if (renewal_date && matchedClient.renewal_date !== renewal_date) {
                    diffs.renewal_date = { db: matchedClient.renewal_date || 'N/A', excel: renewal_date }
                    hasChanges = true
                }
                if (team && matchedClient.team !== team) {
                    diffs.team = { db: matchedClient.team || 'N/A', excel: team }
                    hasChanges = true
                }
                if (operations_lead && matchedClient.operations_lead !== operations_lead) {
                    diffs.operations_lead = { db: matchedClient.operations_lead || 'Aucun', excel: operations_lead }
                    hasChanges = true
                }
                if (package_pricing != null && Number(matchedClient.package_pricing || 0) !== package_pricing) {
                    diffs.package_pricing = { db: Number(matchedClient.package_pricing || 0), excel: package_pricing }
                    hasChanges = true
                }
                if (matchedManagerId && matchedClient.manager_id !== matchedManagerId) {
                    const oldMgr = dbManagersList.find(m => m.id === matchedClient.manager_id)
                    const newMgr = dbManagersList.find(m => m.id === matchedManagerId)
                    diffs.manager_id = { 
                        db: oldMgr ? `${oldMgr.first_name} ${oldMgr.last_name}` : 'Aucun', 
                        excel: newMgr ? `${newMgr.first_name} ${newMgr.last_name}` : manager 
                    }
                    hasChanges = true
                }
                if (doors_count != null && dbDoorsCount !== doors_count) {
                    diffs.doors_count = { db: dbDoorsCount, excel: doors_count }
                    hasChanges = true
                }
                if (package_name && contract?.package_name !== package_name) {
                    diffs.package_name = { db: contract?.package_name || 'Aucun', excel: package_name }
                    hasChanges = true
                }
                if (monthly_fee != null && Number(contract?.monthly_fee || 0) !== monthly_fee) {
                    diffs.monthly_fee = { db: Number(contract?.monthly_fee || 0), excel: monthly_fee }
                    hasChanges = true
                }
                if (financial_year && contract?.start_date !== financial_year) {
                    diffs.financial_year = { db: contract?.start_date || 'N/A', excel: financial_year }
                    hasChanges = true
                }
                // Status mapping (active vs inactive)
                const dbStatus = matchedClient.status || 'active'
                const excelStatus = isInactive ? 'inactive' : 'active'
                if (dbStatus !== excelStatus) {
                    diffs.status = { db: dbStatus, excel: excelStatus }
                    hasChanges = true
                }
                if (departure_date && matchedClient.departure_date !== departure_date) {
                    diffs.departure_date = { db: matchedClient.departure_date || 'N/A', excel: departure_date }
                    hasChanges = true
                }

                if (hasChanges) {
                    modifiedCount++
                }
            } else {
                newCount++
            }

            if (isInactive) {
                inactiveCount++
            }

            processedRows.push({
                tempId,
                rawDataIndex: index,
                originalRow: row,
                ms_list_item_id,
                id,
                syndicate_code,
                legal_name,
                full_name,
                manager_name: manager,
                manager_id: matchedManagerId,
                doors_count,
                package_name,
                monthly_fee,
                financial_year,
                status: isInactive ? 'inactive' : 'active',
                departure_date,
                email,
                address,
                city,
                postal_code,
                renewal_date,
                amount_of_meetings,
                team,
                package_pricing,
                project_status,
                operations_lead,
                matchedClientId: matchedClient?.id || null,
                matchConfidence,
                matchReason,
                needsManualReview,
                diffs,
                hasChanges,
                statusCategory: matchedClient ? (hasChanges ? 'Modified' : 'Unchanged') : 'New'
            })
        })

        // Identify missing clients (clients in database, but not matched by Excel row)
        const missingClients = dbClientsList.filter(c => !matchedDbClientIds.has(c.id)).map(c => {
            const contract = Array.isArray(c.contracts) ? c.contracts[0] : c.contracts
            return {
                id: c.id,
                full_name: c.full_name,
                legal_name: c.legal_name || c.company_name,
                syndicate_code: c.syndicate_code,
                manager_id: c.manager_id,
                doors_count: c.doors ? c.doors.length : 0,
                package_name: contract?.package_name || null,
                monthly_fee: contract?.monthly_fee || 0,
                status: c.status || 'active'
            }
        })

        // Save snapshot as draft
        const changeSummary = {
            new_count: newCount,
            modified_count: modifiedCount,
            inactive_count: inactiveCount,
            missing_count: missingClients.length,
            detected_count: rawData.length
        }

        const { data: snapshot, error: insertError } = await supabase
            .from('client_snapshots')
            .insert({
                name,
                file_name: fileName,
                file_url: fileUrl,
                uploaded_by: user.id,
                detected_count: rawData.length,
                new_count: newCount,
                modified_count: modifiedCount,
                inactive_count: inactiveCount,
                status: 'Draft',
                field_mappings: fieldMappings,
                raw_data: rawData,
                processed_rows: processedRows,
                change_summary: {
                    ...changeSummary,
                    missing_clients: missingClients
                }
            })
            .select('*')
            .single()

        if (insertError) {
            console.error("Database insert error for snapshot:", insertError)
            return { success: false, error: insertError.message }
        }

        revalidatePath('/settings')
        return { success: true, snapshotId: snapshot.id }
    } catch (err: any) {
        console.error("Exception in uploadSnapshotAction:", err)
        return { success: false, error: err.message }
    }
}

// 3. Apply a snapshot
export async function applySnapshotAction(
    snapshotId: string,
    approvedRowTempIds: string[],
    ignoredRowTempIds: string[],
    manualMatches: Record<string, string>, // maps row tempId -> client ID from DB
    manualManagerMatches: Record<string, string> = {} // maps manager_name -> manager_id
) {
    try {
        const { user } = await authorizeUser()
        const supabase = await createClient()

        // 1. Fetch snapshot details
        const { data: snapshot, error: snapErr } = await supabase
            .from('client_snapshots')
            .select('*')
            .eq('id', snapshotId)
            .single()

        if (snapErr || !snapshot) {
            return { success: false, error: "Snapshot introuvable." }
        }

        if (snapshot.status !== 'Draft' && snapshot.status !== 'Pending Review') {
            return { success: false, error: "Ce snapshot a déjà été appliqué ou rejeté." }
        }

        const processedRows: any[] = snapshot.processed_rows || []
        const approvedSet = new Set(approvedRowTempIds)
        const ignoredSet = new Set(ignoredRowTempIds)

        // Seed packages just in case
        try {
            const knownPackages = ['Bronze', 'Argent', 'Argent+', 'Or', 'Platinum', 'Non spécifié']
            await supabase.from('packages').upsert(
                knownPackages.map(name => ({ name })),
                { onConflict: 'name' }
            )
        } catch (e) {
            console.error("Error seeding packages:", e)
        }

        let appliedNewCount = 0
        let appliedModCount = 0
        let appliedInactiveCount = 0

        for (const row of processedRows) {
            const tempId = row.tempId

            // Skip if ignored
            if (ignoredSet.has(tempId)) {
                continue
            }

            // Check manual match override
            let targetClientId = row.matchedClientId
            if (manualMatches[tempId]) {
                targetClientId = manualMatches[tempId]
            }

            const shouldApprove = approvedSet.has(tempId) || (!ignoredSet.has(tempId) && !row.needsManualReview)
            if (!shouldApprove) {
                continue // Needs manual review and was not approved
            }

            // Prepare client payloads
            let resolvedMgrId = row.manager_id
            if (!resolvedMgrId && row.manager_name) {
                if (manualManagerMatches && manualManagerMatches[row.manager_name]) {
                    resolvedMgrId = manualManagerMatches[row.manager_name]
                } else {
                    const mgrLower = row.manager_name.toLowerCase()
                    const { data: dbMgrs } = await supabase.from('managers').select('id, first_name, last_name')
                    const match = dbMgrs?.find(m => 
                        `${m.first_name} ${m.last_name}`.toLowerCase() === mgrLower ||
                        m.last_name.toLowerCase() === mgrLower
                    )
                    if (match) {
                        resolvedMgrId = match.id
                    } else {
                        // Automatically create manager from import
                        const createRes = await addManagerFromImportAction(row.manager_name, true)
                        if (createRes.success && createRes.managerId) {
                            resolvedMgrId = createRes.managerId
                        }
                    }
                }
            }

            const clientPayload: Record<string, any> = {
                // SDC # is stored in database full_name column
                full_name: row.syndicate_code || row.full_name || 'SDC-Importé',
                // Syndicate display name is stored in company_name
                company_name: row.full_name || null,
                legal_name: row.legal_name || row.full_name || null,
                display_name: row.full_name || null,
                syndicate_code: row.syndicate_code || null,
                ms_list_item_id: row.ms_list_item_id || null,
                manager_id: resolvedMgrId || null,
                operations_lead: row.operations_lead || null,
                status: row.status || 'active',
                departure_date: row.departure_date || null,
                email: row.email || null,
                address: row.address || null,
                city: row.city || null,
                postal_code: row.postal_code || null,
                renewal_date: row.renewal_date || null,
                amount_of_meetings: row.amount_of_meetings || null,
                team: row.team || null,
                package_pricing: row.package_pricing || row.monthly_fee || null
            }

            let finalClientId = targetClientId

            if (targetClientId) {
                // UPDATE
                // 1. Fetch current client for diff history
                const { data: currentClient } = await supabase
                    .from('clients')
                    .select('*, contracts(*)')
                    .eq('id', targetClientId)
                    .single()

                if (currentClient) {
                    const contract = Array.isArray(currentClient.contracts) ? currentClient.contracts[0] : currentClient.contracts

                    // 2. Perform updates
                    const { error: updateClientErr } = await supabase
                        .from('clients')
                        .update(clientPayload)
                        .eq('id', targetClientId)

                    if (updateClientErr) {
                        console.error(`Error updating client ${targetClientId}:`, updateClientErr)
                        continue
                    }

                    // 3. Update contract details
                    const contractPayload = {
                        client_id: targetClientId,
                        package_name: row.package_name || 'Non spécifié',
                        monthly_fee: row.monthly_fee || row.package_pricing || 0,
                        start_date: row.financial_year || null,
                        renewal_date: row.renewal_date || null,
                        active: row.status !== 'inactive'
                    }

                    await supabase
                        .from('contracts')
                        .upsert(contractPayload, { onConflict: 'client_id' })

                    // 4. Update doors count
                    if (row.doors_count != null) {
                        const { data: currentDoors } = await supabase.from('doors').select('id').eq('client_id', targetClientId)
                        const currentCount = currentDoors ? currentDoors.length : 0
                        const newCount = row.doors_count

                        if (newCount > currentCount) {
                            const doorsToInsert = Array.from({ length: newCount - currentCount }, (_, i) => ({
                                client_id: targetClientId,
                                door_number: `Porte ${currentCount + i + 1}`
                            }))
                            await supabase.from('doors').insert(doorsToInsert)
                        } else if (newCount < currentCount && newCount >= 0) {
                            const doorsToDelete = currentDoors.slice(newCount).map(d => d.id)
                            await supabase.from('doors').delete().in('id', doorsToDelete)
                        }
                    }

                    // 5. Write client field history
                    const historyRecords: any[] = []
                    const compareAndLog = (field: string, oldVal: any, newVal: any) => {
                        const ov = oldVal != null ? String(oldVal) : null
                        const nv = newVal != null ? String(newVal) : null
                        if (ov !== nv) {
                            historyRecords.push({
                                client_id: targetClientId,
                                snapshot_id: snapshotId,
                                field_name: field,
                                old_value: ov,
                                new_value: nv,
                                changed_by: user.id
                            })
                        }
                    }

                    compareAndLog('legal_name', currentClient.legal_name, row.legal_name || row.full_name)
                    compareAndLog('full_name', currentClient.full_name, row.syndicate_code || row.full_name)
                    compareAndLog('company_name', currentClient.company_name, row.full_name)
                    compareAndLog('syndicate_code', currentClient.syndicate_code, row.syndicate_code)
                    compareAndLog('email', currentClient.email, row.email)
                    compareAndLog('address', currentClient.address, row.address)
                    compareAndLog('city', currentClient.city, row.city)
                    compareAndLog('postal_code', currentClient.postal_code, row.postal_code)
                    compareAndLog('renewal_date', currentClient.renewal_date, row.renewal_date)
                    compareAndLog('contract_renewal_date', contract?.renewal_date, row.renewal_date)
                    compareAndLog('amount_of_meetings', currentClient.amount_of_meetings, row.amount_of_meetings)
                    compareAndLog('team', currentClient.team, row.team)
                    compareAndLog('package_pricing', currentClient.package_pricing, row.package_pricing)
                    compareAndLog('manager_id', currentClient.manager_id, row.manager_id)
                    compareAndLog('doors_count', currentClient.doors ? currentClient.doors.length : 0, row.doors_count)
                    compareAndLog('package_name', contract?.package_name, row.package_name)
                    compareAndLog('monthly_fee', contract?.monthly_fee, row.monthly_fee || row.package_pricing)
                    compareAndLog('status', currentClient.status || 'active', row.status)
                    compareAndLog('departure_date', currentClient.departure_date, row.departure_date)
                    compareAndLog('operations_lead', currentClient.operations_lead, row.operations_lead)

                    if (historyRecords.length > 0) {
                        await supabase.from('client_field_history').insert(historyRecords)
                    }

                    appliedModCount++
                }
            } else {
                // INSERT
                const { data: newClient, error: insertClientErr } = await supabase
                    .from('clients')
                    .insert(clientPayload)
                    .select('id')
                    .single()

                if (insertClientErr || !newClient) {
                    console.error("Error inserting client:", insertClientErr)
                    continue
                }

                finalClientId = newClient.id

                // Create contract
                const contractPayload = {
                    client_id: finalClientId,
                    package_name: row.package_name || 'Non spécifié',
                    monthly_fee: row.monthly_fee || row.package_pricing || 0,
                    start_date: row.financial_year || null,
                    renewal_date: row.renewal_date || null,
                    active: row.status !== 'inactive'
                }

                await supabase.from('contracts').insert(contractPayload)

                // Create doors
                if (row.doors_count && row.doors_count > 0) {
                    const doorsToInsert = Array.from({ length: row.doors_count }, (_, i) => ({
                        client_id: finalClientId,
                        door_number: `Porte ${i + 1}`
                    }))
                    await supabase.from('doors').insert(doorsToInsert)
                }

                appliedNewCount++
            }

            // 6. Handle Lost Syndicate Ticket
            if (row.status === 'inactive' || row.departure_date) {
                // Check if already in lost syndicates
                const { data: existingLost } = await supabase
                    .from('lost_syndicates')
                    .select('id')
                    .eq('client_id', finalClientId)
                    .maybeSingle()

                if (!existingLost) {
                    await supabase.from('lost_syndicates').insert({
                        client_id: finalClientId,
                        manager_id: row.manager_id,
                        departure_date: row.departure_date || new Date().toISOString().split('T')[0],
                        reason_category: 'Import de Snapshot',
                        reason_details: `Syndicat marqué inactif ou départ spécifié dans le snapshot '${snapshot.name}'.`,
                        preventable: true,
                        board_relationship_score: 3,
                        operational_score_before: 80,
                        financial_issues: false
                    })
                }
                appliedInactiveCount++
            }

            // 7. Verify / Create Operational Risk Ticket for Date of Leaving
            if (row.departure_date) {
                // Check if an active risk already exists for this client
                const { data: existingRisk } = await supabase
                    .from('manager_operational_risks')
                    .select('id')
                    .eq('client_id', finalClientId)
                    .eq('status', 'active')
                    .maybeSingle()

                if (!existingRisk && row.manager_id) {
                    await supabase.from('manager_operational_risks').insert({
                        manager_id: row.manager_id,
                        client_id: finalClientId,
                        description: `Non-renouvellement de contrat / départ planifié le ${row.departure_date}. À analyser lors du 1v1.`,
                        severity: 'critical',
                        status: 'active'
                    })
                }
            }
        }

        // Update snapshot status
        await supabase
            .from('client_snapshots')
            .update({
                status: 'Applied',
                applied_at: new Date().toISOString(),
                applied_by: user.id,
                // Update final processed rows to note approved/ignored
                processed_rows: processedRows.map(row => ({
                    ...row,
                    applied: approvedSet.has(row.tempId) || (!ignoredSet.has(row.tempId) && !row.needsManualReview),
                    ignored: ignoredSet.has(row.tempId)
                }))
            })
            .eq('id', snapshotId)

        revalidatePath('/settings')
        revalidatePath('/team-management/dashboard')
        return { 
            success: true, 
            summary: {
                appliedNewCount,
                appliedModCount,
                appliedInactiveCount
            }
        }
    } catch (err: any) {
        console.error("Exception in applySnapshotAction:", err)
        return { success: false, error: err.message }
    }
}

// 4. Reject and delete a snapshot
export async function rejectSnapshotAction(snapshotId: string) {
    try {
        await authorizeUser()
        const supabase = await createClient()

        const { error } = await supabase
            .from('client_snapshots')
            .delete()
            .eq('id', snapshotId)

        if (error) {
            console.error("Error deleting rejected snapshot:", error)
            return { success: false, error: error.message }
        }

        revalidatePath('/settings')
        return { success: true }
    } catch (err: any) {
        console.error("Exception in rejectSnapshotAction:", err)
        return { success: false, error: err.message }
    }
}

// 5. Replace a snapshot
export async function replaceSnapshotAction(
    snapshotId: string,
    name: string,
    fileName: string,
    fileUrl: string,
    rawData: any[],
    fieldMappings: Record<string, string>
) {
    try {
        const { user } = await authorizeUser()
        const supabase = await createClient()

        // 1. Mark old snapshot as replaced
        const { error: updateOldErr } = await supabase
            .from('client_snapshots')
            .update({
                status: 'Replaced',
                replaced_at: new Date().toISOString(),
                replaced_by: user.id
            })
            .eq('id', snapshotId)

        if (updateOldErr) {
            console.error("Error updating old snapshot to replaced:", updateOldErr)
            return { success: false, error: updateOldErr.message }
        }

        // 2. Create the replacement snapshot
        // We run the mapping engine comparing new data vs current DB.
        const uploadResult = await uploadSnapshotAction(name, fileName, fileUrl, rawData, fieldMappings)
        if (!uploadResult.success) {
            return uploadResult
        }

        const newSnapshotId = uploadResult.snapshotId

        // 3. Link replacement snapshot
        await supabase
            .from('client_snapshots')
            .update({
                replacement_snapshot_id: newSnapshotId
            })
            .eq('id', snapshotId)

        revalidatePath('/settings')
        return { success: true, newSnapshotId }
    } catch (err: any) {
        console.error("Exception in replaceSnapshotAction:", err)
        return { success: false, error: err.message }
    }
}
