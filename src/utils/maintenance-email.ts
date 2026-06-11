// @ts-nocheck
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

interface SendEmailParams {
    recipientEmail: string
    templateKey: 'new_campaign' | 'participation_reminder' | 'scheduling_invite' | 'scheduling_reminder' | 'service_incoming' | 'booking_confirmation'
    variables: Record<string, string>
    attachments?: { name: string; url: string }[]
}

export async function sendMaintenanceEmail({
    recipientEmail,
    templateKey,
    variables,
    attachments
}: SendEmailParams): Promise<{ success: boolean; message: string }> {
    const supabase = await createClient()

    // 1. Fetch settings
    const { data: settings, error: settingsErr } = await supabase
        .from('maintenance_email_settings')
        .select('*')
        .single()

    if (settingsErr || !settings) {
        console.error("Maintenance Email Settings error:", settingsErr)
        return { success: false, message: "Settings not configured in database." }
    }

    if (!settings.is_enabled) {
        console.log("Email sending is disabled globally in Maintenance Hub.")
        return { success: false, message: "Email sending is disabled globally." }
    }

    if (!settings.resend_api_key) {
        console.warn("Resend API key is missing in Maintenance Hub settings.")
        return { success: false, message: "Resend API key is missing." }
    }

    // 2. Fetch template id from mapping
    const templateId = settings.mapping?.[templateKey]
    if (!templateId) {
        return { success: false, message: `No template mapped for function: ${templateKey}.` }
    }

    // 3. Fetch template details
    const { data: template, error: templateErr } = await supabase
        .from('maintenance_email_templates')
        .select('*')
        .eq('id', templateId)
        .single()

    if (templateErr || !template) {
        return { success: false, message: `Mapped template not found: ${templateId}` }
    }

    // 4. Resolve dynamic invite link if invite_token is provided
    let baseUrl = 'https://laucandrique.com'
    try {
        const headersList = await headers()
        const host = headersList.get('host')
        if (host) {
            const protocol = host.includes('localhost') ? 'http' : 'https'
            baseUrl = `${protocol}://${host}`
        }
    } catch (e) {
        // fallback to standard domain
    }

    const allVariables = { ...variables }
    if (variables.invite_token && !variables.invite_link) {
        allVariables.invite_link = `${baseUrl}/maintenance/invite/${variables.invite_token}`
    }

    // 5. Replace variables in subject and HTML body
    let subject = template.subject
    let htmlContent = template.html_content

    Object.entries(allVariables).forEach(([key, val]) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
        const replacement = val || ''
        subject = subject.replace(regex, replacement)
        htmlContent = htmlContent.replace(regex, replacement)
    })

    // Handle conditional {{#notes}} ... {{/notes}} blocks for service_incoming
    if (templateKey === 'service_incoming') {
        const hasNotes = !!variables.notes && variables.notes.trim() !== ''
        const notesRegex = /{{#notes}}([\s\S]*?){{\/notes}}/g
        if (hasNotes) {
            htmlContent = htmlContent.replace(notesRegex, '$1')
        } else {
            htmlContent = htmlContent.replace(notesRegex, '')
        }
    }

    // 6. Execute POST request to Resend API
    try {
        const sender = settings.sender_email || 'notifications@laucandrique.com'
        const payload: any = {
            from: sender,
            to: recipientEmail,
            subject: subject,
            html: htmlContent
        }

        if (attachments && attachments.length > 0) {
            payload.attachments = attachments.map(att => ({
                filename: att.name,
                path: att.url
            }))
        }

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.resend_api_key}`
            },
            body: JSON.stringify(payload)
        })

        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}))
            return { 
                success: false, 
                message: errBody?.message || errBody?.error?.message || `HTTP error ${res.status}` 
            }
        }

        const data = await res.json().catch(() => ({}))
        return { success: true, message: data.id || "Email sent." }
    } catch (err) {
        console.error("Resend API fetch error:", err)
        return { success: false, message: (err as Error).message }
    }
}
