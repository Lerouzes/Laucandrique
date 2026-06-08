// @ts-nocheck
// src/actions/maintenance.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// ==========================================
// 1. SERVICE LIBRARY ACTIONS
// ==========================================

export async function getServicesAction() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('maintenance_services')
        .select('*, contractors(full_name)')
        .order('category')
        .order('name')

    if (error) {
        console.error("Error fetching services:", error.message)
        return []
    }
    return data || []
}

export async function saveServiceAction(data: {
    id?: string
    name: string
    description?: string | null
    duration: number
    price?: number | null
    photos_required?: boolean
    report_required?: boolean
    default_contractor_id?: string | null
    category: string
}) {
    const supabase = await createClient()
    const payload = {
        name: data.name,
        description: data.description || null,
        duration: data.duration,
        price: data.price || 0,
        photos_required: !!data.photos_required,
        report_required: !!data.report_required,
        default_contractor_id: data.default_contractor_id || null,
        category: data.category,
        updated_at: new Date().toISOString()
    }

    if (data.id) {
        const { data: res, error } = await supabase
            .from('maintenance_services')
            .update(payload)
            .eq('id', data.id)
            .select()
            .single()
        if (error) throw new Error(error.message)
        revalidatePath('/maintenance-hub/services')
        return res
    } else {
        const { data: res, error } = await supabase
            .from('maintenance_services')
            .insert(payload)
            .select()
            .single()
        if (error) throw new Error(error.message)
        revalidatePath('/maintenance-hub/services')
        return res
    }
}

export async function deleteServiceAction(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('maintenance_services')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)
    revalidatePath('/maintenance-hub/services')
    return { success: true }
}

// ==========================================
// 2. MAINTENANCE CAMPAIGNS ACTIONS
// ==========================================

export async function getCampaignsAction() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('maintenance_campaigns')
        .select('*, clients(company_name, full_name), contractors(full_name)')
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching campaigns:", error.message)
        return []
    }
    return data || []
}

export async function createCampaignAction(data: {
    client_id: string
    name: string
    description?: string | null
    start_date?: string | null
    end_date?: string | null
    contractor_id?: string | null
    min_participation?: number
    is_mandatory?: boolean
    pricing_type?: 'hidden' | 'visible' | 'free'
    services: string[] // Array of service IDs
    availability_settings?: any
    survey_required?: boolean
}) {
    const supabase = await createClient()

    // 1. Insert Campaign
    const { data: campaign, error: campaignErr } = await supabase
        .from('maintenance_campaigns')
        .insert({
            client_id: data.client_id,
            name: data.name,
            description: data.description || null,
            start_date: data.survey_required ? (data.start_date || new Date().toISOString().substring(0, 10)) : data.start_date,
            end_date: data.survey_required ? (data.end_date || new Date().toISOString().substring(0, 10)) : data.end_date,
            contractor_id: data.contractor_id || null,
            min_participation: data.min_participation || 0,
            is_mandatory: data.is_mandatory !== false,
            pricing_type: data.pricing_type || 'free',
            availability_settings: data.availability_settings || {
                workingHours: { start: '08:00', end: '17:00' },
                techniciansCount: 1,
                bufferMinutes: 10,
                breakPeriods: [{ start: '12:00', end: '13:00' }]
            },
            status: 'draft',
            survey_required: !!data.survey_required,
            current_phase: data.survey_required ? 'survey' : 'scheduling'
        })
        .select()
        .single()

    if (campaignErr) throw new Error(campaignErr.message)

    // 2. Associate Services
    if (data.services.length > 0) {
        const servicesPayload = data.services.map(sid => ({
            campaign_id: campaign.id,
            service_id: sid
        }))
        const { error: servicesErr } = await supabase
            .from('maintenance_campaign_services')
            .insert(servicesPayload)
        
        if (servicesErr) {
            console.error("Error inserting campaign services:", servicesErr.message)
        }
    }

    // 3. Enroll all units (doors) of the selected syndicate
    const { data: doors, error: doorsErr } = await supabase
        .from('doors')
        .select('id')
        .eq('client_id', data.client_id)

    if (doorsErr) {
        console.error("Error fetching doors for campaign enrollment:", doorsErr.message)
    } else if (doors && doors.length > 0) {
        const crypto = require('crypto')
        const enrollPayload = doors.map(d => ({
            campaign_id: campaign.id,
            door_id: d.id,
            participation: 'pending',
            invite_token: crypto.randomBytes(16).toString('hex')
        }))

        const { error: enrollErr } = await supabase
            .from('maintenance_campaign_units')
            .insert(enrollPayload)
        
        if (enrollErr) {
            console.error("Error enrolling units to campaign:", enrollErr.message)
        }
    }

    revalidatePath('/maintenance-hub')
    return campaign
}

export async function updateCampaignStatusAction(id: string, status: 'draft' | 'active' | 'completed' | 'cancelled') {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('maintenance_campaigns')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    revalidatePath(`/maintenance-hub/campaigns/${id}`)
    revalidatePath('/maintenance-hub')
    return data
}

export async function deleteCampaignAction(id: string) {
    const supabase = await createClient()

    // 1. Verify MASTER role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Non authentifié.")

    const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profileErr || profile?.role !== 'Master') {
        throw new Error("Permission refusée. Seul le rôle Master peut supprimer une campagne.")
    }

    // 2. Delete Campaign (cascade will delete associated units, appointments, services)
    const { error: deleteErr } = await supabase
        .from('maintenance_campaigns')
        .delete()
        .eq('id', id)

    if (deleteErr) throw new Error(deleteErr.message)

    revalidatePath('/maintenance-hub')
    return { success: true }
}


export async function getCampaignDetailsAction(id: string) {
    const supabase = await createClient()
    
    const [campaignRes, servicesRes, unitsRes, appointmentsRes] = await Promise.all([
        (supabase as any)
            .from('maintenance_campaigns')
            .select('*, clients(*), contractors(*)')
            .eq('id', id)
            .single(),
        (supabase as any)
            .from('maintenance_campaign_services')
            .select('*, service:maintenance_services(*)')
            .eq('campaign_id', id),
        (supabase as any)
            .from('maintenance_campaign_units')
            .select('*, door:doors(*)')
            .eq('campaign_id', id),
        (supabase as any)
            .from('maintenance_appointments')
            .select('*, door:doors(*)')
            .eq('campaign_id', id)
    ])

    if (campaignRes.error) throw new Error(campaignRes.error.message)

    // Fetch current residents for these doors
    const doorIds = (unitsRes.data || []).map(u => u.door_id)
    let residents: any[] = []
    if (doorIds.length > 0) {
        const { data: resData } = await supabase
            .from('maintenance_residents')
            .select('*')
            .in('door_id', doorIds)
        residents = resData || []
    }

    return {
        campaign: campaignRes.data,
        services: (servicesRes.data || []).map(s => s.service),
        units: (unitsRes.data || []).map(unit => {
            const resident = residents.find(r => r.door_id === unit.door_id)
            const appointment = (appointmentsRes.data || []).find(a => a.door_id === unit.door_id)
            return {
                ...unit,
                resident,
                appointment
            }
        }),
        appointments: appointmentsRes.data || []
    }
}

// ==========================================
// 3. RESIDENT IMPORT ACTION
// ==========================================

export async function importResidentsAction(
    clientId: string,
    rows: Array<{ door_number: string; full_name: string; email?: string; phone?: string }>
) {
    const supabase = await createClient()

    // 1. Fetch all existing doors for this syndicate
    const { data: doors, error: doorsErr } = await supabase
        .from('doors')
        .select('*')
        .eq('client_id', clientId)

    if (doorsErr) throw new Error(doorsErr.message)

    const conflicts: string[] = []
    const missingUnits: string[] = []
    let importedCount = 0

    for (const row of rows) {
        const doorNum = String(row.door_number).trim()
        const matchedDoor = (doors || []).find(d => String(d.door_number).trim().toLowerCase() === doorNum.toLowerCase())

        if (!matchedDoor) {
            missingUnits.push(doorNum)
            continue
        }

        try {
            // Upsert resident details for that door (unit)
            // Uses door_id unique constraint
            const { error: upsertErr } = await supabase
                .from('maintenance_residents')
                .upsert({
                    door_id: matchedDoor.id,
                    full_name: row.full_name,
                    email: row.email || null,
                    phone: row.phone || null,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'door_id' })

            if (upsertErr) {
                conflicts.push(`${doorNum}: ${upsertErr.message}`)
            } else {
                importedCount++
            }
        } catch (err) {
            conflicts.push(`${doorNum}: ${(err as Error).message}`)
        }
    }

    return {
        success: true,
        importedCount,
        missingUnits,
        conflicts
    }
}

// ==========================================
// 4. CAPACITY-BASED SCHEDULING ENGINE
// ==========================================

export async function getAvailableTimeSlotsAction(campaignId: string, durationMinutes: number) {
    const supabase = await createClient()
    
    // Fetch campaign details
    const { data: campaign, error: campaignErr } = await supabase
        .from('maintenance_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()

    if (campaignErr) throw new Error(campaignErr.message)

    if (!campaign.start_date || !campaign.end_date || campaign.current_phase === 'survey') {
        return {}
    }

    // Fetch existing appointments
    const { data: appointments, error: apptsErr } = await supabase
        .from('maintenance_appointments')
        .select('*')
        .eq('campaign_id', campaignId)
        .neq('status', 'cancelled') // Ignore cancelled

    if (apptsErr) throw new Error(apptsErr.message)

    const settings = campaign.availability_settings || {}
    const workingHours = settings.workingHours || { start: '08:00', end: '17:00' }
    const techniciansCount = settings.techniciansCount || 1
    const bufferMinutes = settings.bufferMinutes || 10
    const breakPeriods = settings.breakPeriods || [{ start: '12:00', end: '13:00' }]
    const slotStepMinutes = 15 // Check slots in 15 minute increments

    const startDate = new Date(campaign.start_date)
    const endDate = new Date(campaign.end_date)
    const availableSlots: Record<string, string[]> = {}

    // Loop through each day from start_date to end_date
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().substring(0, 10)
        
        // Skip Sundays or Saturdays if not enabled in settings
        const dayOfWeek = d.getDay()
        if (dayOfWeek === 0) continue // Skip Sundays

        const slots: string[] = []
        const [startHour, startMin] = workingHours.start.split(':').map(Number)
        const [endHour, endMin] = workingHours.end.split(':').map(Number)

        const startMinutes = startHour * 60 + startMin
        const endMinutes = endHour * 60 + endMin

        // Generate time slots
        for (let m = startMinutes; m + durationMinutes <= endMinutes; m += slotStepMinutes) {
            const slotStartHour = Math.floor(m / 60)
            const slotStartMin = m % 60
            const slotEndHour = Math.floor((m + durationMinutes) / 60)
            const slotEndMin = (m + durationMinutes) % 60

            const slotStartStr = `${String(slotStartHour).padStart(2, '0')}:${String(slotStartMin).padStart(2, '0')}`
            const slotEndStr = `${String(slotEndHour).padStart(2, '0')}:${String(slotEndMin).padStart(2, '0')}`

            // Check if slot falls in break periods
            let inBreak = false
            for (const brk of breakPeriods) {
                const [brkStartH, brkStartM] = brk.start.split(':').map(Number)
                const [brkEndH, brkEndM] = brk.end.split(':').map(Number)
                const brkStartMin = brkStartH * 60 + brkStartM
                const brkEndMin = brkEndH * 60 + brkEndM

                // If appointment overlaps with break
                const apptStart = m
                const apptEnd = m + durationMinutes
                if (apptStart < brkEndMin && apptEnd > brkStartMin) {
                    inBreak = true
                    break
                }
            }

            if (inBreak) continue

            // Count concurrent scheduled appointments during this slot
            const concurrentCount = (appointments || []).filter(a => {
                if (a.appointment_date !== dateStr) return false
                
                const [aStartH, aStartM] = a.start_time.split(':').map(Number)
                const [aEndH, aEndM] = a.end_time.split(':').map(Number)
                const aStartMin = aStartH * 60 + aStartM
                const aEndMin = aEndH * 60 + aEndM

                const apptStart = m
                const apptEnd = m + durationMinutes + bufferMinutes // include buffer

                return apptStart < aEndMin && apptEnd > aStartMin
            }).length

            if (concurrentCount < techniciansCount) {
                slots.push(slotStartStr)
            }
        }

        if (slots.length > 0) {
            availableSlots[dateStr] = slots
        }
    }

    return availableSlots
}

// ==========================================
// 5. RESIDENT PORTAL ACTIONS
// ==========================================

export async function getResidentInviteAction(token: string) {
    const supabase = await createClient()

    // 1. Fetch campaign unit enrollment
    const { data: unit, error: unitErr } = await supabase
        .from('maintenance_campaign_units')
        .select('*, door:doors(*), campaign:maintenance_campaigns(*)')
        .eq('invite_token', token)
        .single()

    if (unitErr) throw new Error(unitErr.message)

    // Check expiry for cancelled campaigns (30 days past campaign end_date)
    if (unit.campaign?.status === 'cancelled' && unit.campaign?.end_date) {
        const endDate = new Date(unit.campaign.end_date)
        const expiryTime = endDate.getTime() + 30 * 24 * 60 * 60 * 1000
        const now = new Date().getTime()
        if (now > expiryTime) {
            throw new Error("Ce lien d'invitation a expiré.")
        }
    }

    // 2. Fetch current resident contact info
    const { data: resident } = await supabase
        .from('maintenance_residents')
        .select('*')
        .eq('door_id', unit.door_id)
        .maybeSingle()

    // 3. Fetch scheduled appointment (if any)
    const { data: appointment } = await supabase
        .from('maintenance_appointments')
        .select('*')
        .eq('campaign_id', unit.campaign_id)
        .eq('door_id', unit.door_id)
        .maybeSingle()

    // 4. Fetch campaign services
    const { data: campaignServices } = await supabase
        .from('maintenance_campaign_services')
        .select('*, service:maintenance_services(*)')
        .eq('campaign_id', unit.campaign_id)

    // 5. Fetch syndicate (client) details
    const { data: clientObj } = await supabase
        .from('clients')
        .select('company_name, full_name, email, phone')
        .eq('id', unit.campaign.client_id)
        .single()

    // 6. Fetch contractor details
    let contractorObj = null
    if (unit.campaign?.contractor_id) {
        const { data: contractor } = await supabase
            .from('contractors')
            .select('company_name, full_name, website, phone, email')
            .eq('id', unit.campaign.contractor_id)
            .maybeSingle()
        contractorObj = contractor
    }

    // 7. Fetch contractor progress records for this campaign
    const { data: progressRecords } = await supabase
        .from('maintenance_contractor_progress')
        .select('*')
        .eq('campaign_id', unit.campaign_id)

    // 8. Fetch daily appointments for queue tracking if scheduled
    let dailyAppointments: any[] = []
    if (appointment) {
        const { data: appts } = await supabase
            .from('maintenance_appointments')
            .select('*')
            .eq('campaign_id', unit.campaign_id)
            .eq('appointment_date', appointment.appointment_date)
            .neq('status', 'cancelled')
            .order('start_time')
        dailyAppointments = appts || []
    }

    return {
        unit,
        resident,
        appointment,
        client: clientObj,
        contractor: contractorObj,
        services: (campaignServices || []).map(cs => cs.service),
        progress: progressRecords || [],
        dailyAppointments
    }
}

export async function submitParticipationAction(
    token: string,
    participation: 'pending' | 'interested' | 'not_interested' | 'completed_elsewhere' | 'more_info',
    contactInfo: {
        contact_name: string
        contact_email: string
        contact_phone: string
        resident_notes?: string
    }
) {
    const supabase = await createClient()
    const { data: unit, error: unitErr } = await supabase
        .from('maintenance_campaign_units')
        .update({
            participation,
            contact_name: contactInfo.contact_name,
            contact_email: contactInfo.contact_email,
            contact_phone: contactInfo.contact_phone,
            resident_notes: contactInfo.resident_notes || null,
            updated_at: new Date().toISOString()
        })
        .eq('invite_token', token)
        .select()
        .single()

    if (unitErr) throw new Error(unitErr.message)

    // Delete existing scheduled appointment if they opt-out
    if (participation === 'not_interested' || participation === 'completed_elsewhere') {
        await supabase
            .from('maintenance_appointments')
            .delete()
            .eq('campaign_id', unit.campaign_id)
            .eq('door_id', unit.door_id)
    }

    revalidatePath(`/maintenance-hub/campaigns/${unit.campaign_id}`)
    return unit
}

export async function scheduleAppointmentAction(
    token: string,
    appointmentDate: string,
    startTime: string,
    durationMinutes: number
) {
    const supabase = await createClient()

    // 1. Fetch unit
    const { data: unit, error: unitErr } = await supabase
        .from('maintenance_campaign_units')
        .select('*')
        .eq('invite_token', token)
        .single()

    if (unitErr) throw new Error(unitErr.message)

    // 2. Fetch campaign contractor info
    const { data: campaign } = await supabase
        .from('maintenance_campaigns')
        .select('contractor_id')
        .eq('id', unit.campaign_id)
        .single()

    // 3. Compute end time
    const [startH, startM] = startTime.split(':').map(Number)
    const endMinutesTotal = startH * 60 + startM + durationMinutes
    const endH = Math.floor(endMinutesTotal / 60)
    const endM = endMinutesTotal % 60
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`

    // 4. Check if rescheduled
    const { data: existingAppt } = await supabase
        .from('maintenance_appointments')
        .select('*')
        .eq('campaign_id', unit.campaign_id)
        .eq('door_id', unit.door_id)
        .maybeSingle()

    const rescheduledCount = existingAppt ? (existingAppt.rescheduled_count + 1) : 0

    const payload = {
        campaign_id: unit.campaign_id,
        door_id: unit.door_id,
        contractor_id: campaign?.contractor_id || null,
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: endTime,
        duration: durationMinutes,
        status: 'scheduled',
        rescheduled_count: rescheduledCount,
        updated_at: new Date().toISOString()
    }

    let result
    if (existingAppt) {
        const { data: updated, error } = await supabase
            .from('maintenance_appointments')
            .update(payload)
            .eq('id', existingAppt.id)
            .select()
            .single()
        if (error) throw new Error(error.message)
        result = updated
    } else {
        const { data: inserted, error } = await supabase
            .from('maintenance_appointments')
            .insert(payload)
            .select()
            .single()
        if (error) throw new Error(error.message)
        result = inserted
    }

    // Mark participation as interested automatically
    await supabase
        .from('maintenance_campaign_units')
        .update({ participation: 'interested' })
        .eq('id', unit.id)

    revalidatePath(`/maintenance-hub/campaigns/${unit.campaign_id}`)
    return result
}

export async function cancelAppointmentAction(token: string) {
    const supabase = await createClient()

    const { data: unit, error: unitErr } = await supabase
        .from('maintenance_campaign_units')
        .select('*')
        .eq('invite_token', token)
        .single()

    if (unitErr) throw new Error(unitErr.message)

    const { error: cancelErr } = await supabase
        .from('maintenance_appointments')
        .delete()
        .eq('campaign_id', unit.campaign_id)
        .eq('door_id', unit.door_id)

    if (cancelErr) throw new Error(cancelErr.message)

    revalidatePath(`/maintenance-hub/campaigns/${unit.campaign_id}`)
    return { success: true }
}

// ==========================================
// 6. CONTRACTOR PORTAL ACTIONS
// ==========================================

export async function getContractorDashboardAction(token: string) {
    const supabase = await createClient()

    // 1. Verify token
    const { data: tokenObj, error: tokenErr } = await supabase
        .from('maintenance_contractor_tokens')
        .select('*, contractor:contractors(*)')
        .eq('token', token)
        .single()

    if (tokenErr) throw new Error("Jeton d'accès invalide ou expiré.")

    // 2. Fetch assigned campaigns
    const { data: campaigns } = await supabase
        .from('maintenance_campaigns')
        .select('*, clients(company_name, full_name)')
        .eq('contractor_id', tokenObj.contractor_id)
        .in('status', ['active', 'completed'])

    const campaignIds = (campaigns || []).map(c => c.id)

    // 3. Fetch all appointments for these campaigns
    let appointments: any[] = []
    let units: any[] = []
    let reports: any[] = []

    if (campaignIds.length > 0) {
        const [apptsRes, unitsRes, reportsRes] = await Promise.all([
            supabase
                .from('maintenance_appointments')
                .select('*, door:doors(*)')
                .in('campaign_id', campaignIds)
                .order('appointment_date')
                .order('start_time'),
            supabase
                .from('maintenance_campaign_units')
                .select('*')
                .in('campaign_id', campaignIds),
            supabase
                .from('maintenance_reports')
                .select('*, photos:maintenance_photos(*)')
                .in('campaign_id', campaignIds)
        ])

        appointments = apptsRes.data || []
        units = unitsRes.data || []
        reports = reportsRes.data || []
    }

    // Fetch residents contact details
    const doorIds = appointments.map(a => a.door_id)
    let residents: any[] = []
    if (doorIds.length > 0) {
        const { data: resData } = await supabase
            .from('maintenance_residents')
            .select('*')
            .in('door_id', doorIds)
        residents = resData || []
    }

    // Map appointments to details
    const appointmentsDetails = appointments.map(appt => {
        const campaign = (campaigns || []).find(c => c.id === appt.campaign_id)
        const campaignUnit = units.find(u => u.campaign_id === appt.campaign_id && u.door_id === appt.door_id)
        const resident = residents.find(r => r.door_id === appt.door_id)
        const report = reports.find(r => r.appointment_id === appt.id)

        return {
            ...appt,
            campaign_name: campaign?.name,
            client_name: campaign?.clients?.company_name || campaign?.clients?.full_name,
            contact_name: campaignUnit?.contact_name || resident?.full_name || 'Inconnu',
            contact_email: campaignUnit?.contact_email || resident?.email || '',
            contact_phone: campaignUnit?.contact_phone || resident?.phone || '',
            resident_notes: campaignUnit?.resident_notes || '',
            report
        }
    })

    // Fetch contractor progress records for these campaigns
    let progress: any[] = []
    if (campaignIds.length > 0) {
        const { data: progData } = await supabase
            .from('maintenance_contractor_progress')
            .select('*')
            .in('campaign_id', campaignIds)
        progress = progData || []
    }

    return {
        contractor: tokenObj.contractor,
        campaigns: campaigns || [],
        appointments: appointmentsDetails,
        progress: progress
    }
}

export async function saveMaintenanceReportAction(
    token: string,
    appointmentId: string,
    status: 'completed' | 'absent' | 'refused_access' | 'follow_up',
    reportData: {
        notes?: string
        observations?: string
        recommendations?: string
        photoUrls?: string[]
    }
) {
    const supabase = await createClient()

    // 1. Verify token
    const { data: tokenObj, error: tokenErr } = await supabase
        .from('maintenance_contractor_tokens')
        .select('*')
        .eq('token', token)
        .single()

    if (tokenErr) throw new Error("Jeton de sécurité invalide.")

    // 2. Fetch appointment details
    const { data: appt, error: apptErr } = await supabase
        .from('maintenance_appointments')
        .select('*')
        .eq('id', appointmentId)
        .single()

    if (apptErr) throw new Error(apptErr.message)

    // 3. Update appointment status
    const { error: statusErr } = await supabase
        .from('maintenance_appointments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', appointmentId)

    if (statusErr) throw new Error(statusErr.message)

    // 4. Save/update inspection report
    const reportPayload = {
        appointment_id: appointmentId,
        door_id: appt.door_id,
        campaign_id: appt.campaign_id,
        contractor_id: tokenObj.contractor_id,
        notes: reportData.notes || null,
        observations: reportData.observations || null,
        recommendations: reportData.recommendations || null,
        updated_at: new Date().toISOString()
    }

    const { data: existingReport } = await supabase
        .from('maintenance_reports')
        .select('id')
        .eq('appointment_id', appointmentId)
        .maybeSingle()

    let reportId
    if (existingReport) {
        const { data: updatedReport, error: repErr } = await supabase
            .from('maintenance_reports')
            .update(reportPayload)
            .eq('id', existingReport.id)
            .select()
            .single()
        if (repErr) throw new Error(repErr.message)
        reportId = updatedReport.id
    } else {
        const { data: insertedReport, error: repErr } = await supabase
            .from('maintenance_reports')
            .insert(reportPayload)
            .select()
            .single()
        if (repErr) throw new Error(repErr.message)
        reportId = insertedReport.id
    }

    // 5. Save report photos
    if (reportData.photoUrls && reportData.photoUrls.length > 0) {
        // Delete old photos for this report first (if rewriting)
        await supabase.from('maintenance_photos').delete().eq('report_id', reportId)

        const photosPayload = reportData.photoUrls.map(url => ({
            report_id: reportId,
            appointment_id: appointmentId,
            door_id: appt.door_id,
            campaign_id: appt.campaign_id,
            photo_url: url
        }))

        const { error: photoErr } = await supabase
            .from('maintenance_photos')
            .insert(photosPayload)

        if (photoErr) {
            console.error("Error inserting photos:", photoErr.message)
        }
    }

    // Set campaign unit participation to 'completed' if appointment is marked completed
    if (status === 'completed') {
        await supabase
            .from('maintenance_campaign_units')
            .update({ participation: 'completed' })
            .eq('campaign_id', appt.campaign_id)
            .eq('door_id', appt.door_id)
    }

    revalidatePath(`/maintenance-hub/campaigns/${appt.campaign_id}`)
    return { success: true, reportId }
}

// ==========================================
// 7. STATISTICS AND DASHBOARD ENGINE
// ==========================================

export async function getMaintenanceDashboardStatsAction() {
    const supabase = await createClient()
    
    // Fetch campaigns
    const { data: campaigns } = await supabase
        .from('maintenance_campaigns')
        .select('*')

    // Fetch appointments
    const { data: appointments } = await supabase
        .from('maintenance_appointments')
        .select('*')

    // Fetch units enrollment
    const { data: units } = await supabase
        .from('maintenance_campaign_units')
        .select('*')

    // Count statistics
    const totalCampaigns = campaigns?.length || 0
    const activeCampaigns = (campaigns || []).filter(c => c.status === 'active').length
    const completedCampaigns = (campaigns || []).filter(c => c.status === 'completed').length

    const totalUnitsCount = units?.length || 0
    const completedUnits = (units || []).filter(u => u.participation === 'completed').length
    const interestedUnits = (units || []).filter(u => u.participation === 'interested').length
    const declinedUnits = (units || []).filter(u => u.participation === 'not_interested').length
    const pendingUnits = (units || []).filter(u => u.participation === 'pending').length

    const participationRate = totalUnitsCount > 0 
        ? Math.round(((completedUnits + interestedUnits) / totalUnitsCount) * 100) 
        : 0
    
    const completionRate = totalUnitsCount > 0 
        ? Math.round((completedUnits / totalUnitsCount) * 100) 
        : 0

    // Group stats by manager
    // Track campaigns, participation, units per manager
    // Each campaign has created_by profiles(full_name)
    const { data: managersCampaigns } = await supabase
        .from('maintenance_campaigns')
        .select('*, creator:profiles(full_name)')

    const managerStatsMap: Record<string, { name: string; campaigns: number; units: number; completed: number }> = {}
    ;(managersCampaigns || []).forEach(c => {
        const creatorName = c.creator?.full_name || 'Équipe Gustav'
        const campaignUnits = (units || []).filter(u => u.campaign_id === c.id)
        const campaignCompleted = campaignUnits.filter(u => u.participation === 'completed').length

        if (!managerStatsMap[creatorName]) {
            managerStatsMap[creatorName] = {
                name: creatorName,
                campaigns: 0,
                units: 0,
                completed: 0
            }
        }
        managerStatsMap[creatorName].campaigns += 1
        managerStatsMap[creatorName].units += campaignUnits.length
        managerStatsMap[creatorName].completed += campaignCompleted
    })

    const teamStats = Object.values(managerStatsMap).map(m => {
        const rate = m.units > 0 ? Math.round((m.completed / m.units) * 100) : 0
        return {
            managerName: m.name,
            campaignsCreated: m.campaigns,
            unitsProcessed: m.units,
            completionRate: rate
        }
    })

    return {
        totalCampaigns,
        activeCampaigns,
        completedCampaigns,
        totalUnitsCount,
        completedUnits,
        interestedUnits,
        declinedUnits,
        pendingUnits,
        participationRate,
        completionRate,
        teamStats
    }
}

// ==========================================
// 8. UNIT HISTORY ACTION
// ==========================================

export async function getUnitMaintenanceHistoryAction(doorId: string) {
    const supabase = await createClient()

    // 1. Fetch door details
    const { data: door, error: doorErr } = await supabase
        .from('doors')
        .select('*, client:clients(company_name, full_name)')
        .eq('id', doorId)
        .single()

    if (doorErr) throw new Error(doorErr.message)

    // 2. Fetch all appointments and reports for this unit
    const { data: appointments } = await supabase
        .from('maintenance_appointments')
        .select('*, campaign:maintenance_campaigns(*), contractor:contractors(full_name)')
        .eq('door_id', doorId)
        .order('appointment_date', { ascending: false })

    const { data: reports } = await supabase
        .from('maintenance_reports')
        .select('*')
        .eq('door_id', doorId)

    const { data: photos } = await supabase
        .from('maintenance_photos')
        .select('*')
        .eq('door_id', doorId)

    // Match history
    const history = (appointments || []).map(appt => {
        const report = (reports || []).find(r => r.appointment_id === appt.id)
        const reportPhotos = (photos || []).filter(p => p.report_id === report?.id || p.appointment_id === appt.id)

        return {
            id: appt.id,
            date: appt.appointment_date,
            campaign_name: appt.campaign?.name,
            contractor_name: appt.contractor?.full_name || 'Non assigné',
            status: appt.status,
            report,
            photos: reportPhotos
        }
    })

    return {
        door,
        history
    }
}

export async function advanceCampaignPhaseAction(
    campaignId: string,
    schedulingData?: {
        start_date: string
        end_date: string
        availability_settings?: any
    }
) {
    const supabase = await createClient()

    const updatePayload: any = {
        current_phase: 'scheduling',
        updated_at: new Date().toISOString()
    }

    if (schedulingData) {
        updatePayload.start_date = schedulingData.start_date
        updatePayload.end_date = schedulingData.end_date
        if (schedulingData.availability_settings) {
            updatePayload.availability_settings = schedulingData.availability_settings
        }
    }

    const { data, error } = await supabase
        .from('maintenance_campaigns')
        .update(updatePayload)
        .eq('id', campaignId)
        .select()
        .single()

    if (error) throw new Error(error.message)
    revalidatePath(`/maintenance-hub/campaigns/${campaignId}`)
    revalidatePath('/maintenance-hub')
    return data
}

export async function updateCampaignSettingsAction(
    campaignId: string,
    settings: {
        allow_reschedule: boolean
        reschedule_cutoff_hours: number
        response_deadline_date: string | null
        availability_settings?: any
    }
) {
    const supabase = await createClient()
    const updatePayload: any = {
        allow_reschedule: settings.allow_reschedule,
        reschedule_cutoff_hours: settings.reschedule_cutoff_hours,
        response_deadline_date: settings.response_deadline_date ? new Date(settings.response_deadline_date).toISOString() : null,
        updated_at: new Date().toISOString()
    }

    if (settings.availability_settings) {
        updatePayload.availability_settings = settings.availability_settings
    }

    const { data, error } = await supabase
        .from('maintenance_campaigns')
        .update(updatePayload)
        .eq('id', campaignId)
        .select()
        .single()

    if (error) throw new Error(error.message)
    revalidatePath(`/maintenance-hub/campaigns/${campaignId}`)
    revalidatePath('/maintenance-hub')
    return data
}

export async function setContractorDayStatusAction(
    token: string,
    campaignId: string,
    date: string,
    status: 'not_started' | 'started' | 'finished'
) {
    const supabase = await createClient()

    // 1. Verify token
    const { data: tokenObj, error: tokenErr } = await supabase
        .from('maintenance_contractor_tokens')
        .select('*')
        .eq('token', token)
        .single()

    if (tokenErr) throw new Error("Jeton d'accès invalide.")

    // 2. Upsert progress
    const { error } = await supabase
        .from('maintenance_contractor_progress')
        .upsert({
            campaign_id: campaignId,
            date: date,
            status: status,
            started_at: status === 'started' ? new Date().toISOString() : undefined,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'campaign_id,date'
        })

    if (error) throw new Error(error.message)
    return { success: true }
}


export async function saveCoOwnerAction(data: {
    id?: string
    clientId: string
    door_number: string
    full_name: string
    email?: string | null
    phone?: string | null
}) {
    const supabase = await createClient()
    
    if (data.id) {
        // Update door
        const { error: doorErr } = await supabase
            .from('doors')
            .update({ door_number: data.door_number })
            .eq('id', data.id)
        if (doorErr) throw new Error(doorErr.message)

        // Upsert resident using door_id unique constraint
        const { error: resErr } = await supabase
            .from('maintenance_residents')
            .upsert({
                door_id: data.id,
                full_name: data.full_name,
                email: data.email || null,
                phone: data.phone || null,
                updated_at: new Date().toISOString()
            }, { onConflict: 'door_id' })
        if (resErr) throw new Error(resErr.message)
        
        revalidatePath(`/clients/${data.clientId}`)
        return { success: true }
    } else {
        // Insert door
        const { data: door, error: doorErr } = await supabase
            .from('doors')
            .insert({ client_id: data.clientId, door_number: data.door_number })
            .select()
            .single()
        if (doorErr) throw new Error(doorErr.message)

        // Insert resident
        const { error: resErr } = await supabase
            .from('maintenance_residents')
            .insert({
                door_id: door.id,
                full_name: data.full_name,
                email: data.email || null,
                phone: data.phone || null
            })
        if (resErr) throw new Error(resErr.message)
        
        revalidatePath(`/clients/${data.clientId}`)
        return { success: true }
    }
}

export async function deleteCoOwnerAction(doorId: string, clientId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('doors')
        .delete()
        .eq('id', doorId)
    if (error) throw new Error(error.message)
    revalidatePath(`/clients/${clientId}`)
    return { success: true }
}

export async function importCoOwnersAction(
    clientId: string,
    rows: Array<{ door_number: string; full_name: string; email?: string; phone?: string }>
) {
    const supabase = await createClient()
    
    // Fetch all existing doors
    const { data: doors, error: doorsErr } = await supabase
        .from('doors')
        .select('*')
        .eq('client_id', clientId)
    if (doorsErr) throw new Error(doorsErr.message)

    const conflicts: string[] = []
    let importedCount = 0

    for (const row of rows) {
        const doorNum = String(row.door_number).trim()
        if (!doorNum) continue

        let matchedDoor = (doors || []).find(d => String(d.door_number).trim().toLowerCase() === doorNum.toLowerCase())
        
        try {
            let doorId = matchedDoor?.id
            if (!doorId) {
                // Create new door
                const { data: newDoor, error: doorErr } = await supabase
                    .from('doors')
                    .insert({ client_id: clientId, door_number: doorNum })
                    .select()
                    .single()
                if (doorErr) {
                    conflicts.push(`${doorNum}: ${doorErr.message}`)
                    continue
                }
                doorId = newDoor.id
            }

            // Upsert resident details for that door
            const { error: upsertErr } = await supabase
                .from('maintenance_residents')
                .upsert({
                    door_id: doorId,
                    full_name: row.full_name,
                    email: row.email || null,
                    phone: row.phone || null,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'door_id' })

            if (upsertErr) {
                conflicts.push(`${doorNum}: ${upsertErr.message}`)
            } else {
                importedCount++
            }
        } catch (err) {
            conflicts.push(`${doorNum}: ${(err as Error).message}`)
        }
    }

    revalidatePath(`/clients/${clientId}`)
    return {
        success: true,
        importedCount,
        conflicts
    }
}

// ==========================================
// 10. CONTRACTOR HUB: SERVICES + PRICING
// ==========================================

/**
 * Returns only services LINKED to this contractor (entries in contractor_service_pricing).
 * Each row includes pricing overrides. Global services without an entry are NOT returned.
 */
export async function getContractorServicesAction(contractorId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('contractor_service_pricing')
        .select('*, service:maintenance_services(*)')
        .eq('contractor_id', contractorId)
        .order('created_at')
    if (error) return []
    return (data || []).map((row: any) => ({
        ...row.service,
        custom_price: row.price ?? null,
        pricing_note: row.note ?? null,
        has_custom: row.price !== null,
        pricing_id: row.id,
    }))
}

/**
 * Returns global services NOT yet linked to this contractor — for the import picker.
 */
export async function getUnlinkedServicesAction(contractorId: string) {
    const supabase = await createClient()
    const { data: linked } = await supabase
        .from('contractor_service_pricing')
        .select('service_id')
        .eq('contractor_id', contractorId)
    const linkedIds = (linked || []).map((r: any) => r.service_id)

    let query = supabase
        .from('maintenance_services')
        .select('*')
        .order('category')
        .order('name')
    if (linkedIds.length > 0) {
        query = query.not('id', 'in', `(${linkedIds.join(',')})`)
    }
    const { data, error } = await query
    if (error) return []
    return data || []
}

/**
 * Creates a brand-new global service AND immediately links it to this contractor.
 */
export async function createAndLinkServiceAction(contractorId: string, serviceData: {
    name: string
    description?: string | null
    duration: number
    price?: number | null
    category: string
    photos_required?: boolean
    report_required?: boolean
}) {
    const supabase = await createClient()
    // 1. Create global service
    const { data: svc, error: svcErr } = await supabase
        .from('maintenance_services')
        .insert({
            name: serviceData.name,
            description: serviceData.description || null,
            duration: serviceData.duration,
            price: serviceData.price || 0,
            category: serviceData.category,
            photos_required: !!serviceData.photos_required,
            report_required: !!serviceData.report_required,
            default_contractor_id: contractorId,
        })
        .select()
        .single()
    if (svcErr) throw new Error(svcErr.message)

    // 2. Link to contractor with base price
    const { error: linkErr } = await supabase
        .from('contractor_service_pricing')
        .insert({ contractor_id: contractorId, service_id: svc.id, price: serviceData.price || null })
    if (linkErr) throw new Error(linkErr.message)

    revalidatePath(`/maintenance-hub/contractors/${contractorId}`)
    revalidatePath('/maintenance-hub/services')
    return svc
}

/**
 * Links existing global services to a contractor (import from library).
 */
export async function linkExistingServicesAction(contractorId: string, serviceIds: string[]) {
    const supabase = await createClient()
    const rows = serviceIds.map(sid => ({ contractor_id: contractorId, service_id: sid }))
    const { error } = await supabase
        .from('contractor_service_pricing')
        .upsert(rows, { onConflict: 'contractor_id,service_id', ignoreDuplicates: true })
    if (error) throw new Error(error.message)
    revalidatePath(`/maintenance-hub/contractors/${contractorId}`)
    return { success: true }
}

/** Update the contractor's custom price/note for a service (service stays linked). */
export async function upsertContractorServicePricingAction(contractorId: string, serviceId: string, price: number | null, note: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('contractor_service_pricing')
        .upsert({ contractor_id: contractorId, service_id: serviceId, price, note: note || null }, { onConflict: 'contractor_id,service_id' })
    if (error) throw new Error(error.message)
    revalidatePath(`/maintenance-hub/contractors/${contractorId}`)
    return { success: true }
}

/** Unlink a service from this contractor only — global service is NOT deleted. */
export async function unlinkContractorServiceAction(contractorId: string, serviceId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('contractor_service_pricing')
        .delete()
        .eq('contractor_id', contractorId)
        .eq('service_id', serviceId)
    if (error) throw new Error(error.message)
    revalidatePath(`/maintenance-hub/contractors/${contractorId}`)
    return { success: true }
}

// Keep old name as alias for backward compatibility
export const removeContractorServicePricingAction = unlinkContractorServiceAction

// ==========================================
// 11. CONTRACTOR HUB: CHECKLIST
// ==========================================

export async function getContractorChecklistAction(contractorId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('contractor_checklist')
        .select('*')
        .eq('contractor_id', contractorId)
        .order('created_at')
    if (error) return []
    return data || []
}

export async function addContractorChecklistItemAction(contractorId: string, label: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('contractor_checklist')
        .insert({ contractor_id: contractorId, label, done: false })
        .select()
        .single()
    if (error) throw new Error(error.message)
    revalidatePath(`/maintenance-hub/contractors/${contractorId}`)
    return data
}

export async function toggleContractorChecklistItemAction(id: string, done: boolean) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('contractor_checklist')
        .update({ done })
        .eq('id', id)
    if (error) throw new Error(error.message)
    return { success: true }
}

export async function deleteContractorChecklistItemAction(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('contractor_checklist')
        .delete()
        .eq('id', id)
    if (error) throw new Error(error.message)
    return { success: true }
}

// ==========================================
// 12. CONTRACTOR HUB: CAMPAIGNS LOOKUP
// ==========================================

export async function getCampaignsByContractorAction(contractorId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('maintenance_campaigns')
        .select('id, name, status, start_date, end_date, clients(company_name, full_name)')
        .eq('contractor_id', contractorId)
        .order('start_date', { ascending: false })
    if (error) return []
    return data || []
}

// ==========================================
// 13. CONTRACTOR HUB: PORTAL TOKEN
// ==========================================

export async function getOrCreateContractorTokenAction(contractorId: string) {
    const supabase = await createClient()
    // Try to find existing token
    const { data: existing } = await supabase
        .from('maintenance_contractor_tokens')
        .select('token')
        .eq('contractor_id', contractorId)
        .maybeSingle()
    if (existing?.token) return existing.token

    // Create new token
    const crypto = require('crypto')
    const token = crypto.randomBytes(24).toString('hex')
    const { error } = await supabase
        .from('maintenance_contractor_tokens')
        .insert({ contractor_id: contractorId, token })
    if (error) throw new Error(error.message)
    return token
}
