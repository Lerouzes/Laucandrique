'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// ==========================================
// DEPARTMENTS CRUD ACTIONS
// ==========================================

export async function getDepartments(): Promise<any[]> {
    const supabase = await createClient()

    const { data: departments, error } = await (supabase
        .from('departments' as any)
        .select(`
            *,
            parent:parent_department_id (id, name),
            manager:manager_id (id, first_name, last_name, email)
        `)
        .order('name') as any)

    if (error) {
        console.error('Error fetching departments:', error)
        return []
    }

    const { data: employees } = await (supabase
        .from('employees' as any)
        .select('id, first_name, last_name') as any)

    const employeeMap = new Map((employees || []).map((emp: any) => [emp.id, emp]))

    return (departments || []).map((dept: any) => {
        const teamLeader = dept.team_leader_id ? (employeeMap.get(dept.team_leader_id) as any) || null : null
        return {
            ...dept,
            team_leader: teamLeader ? {
                id: teamLeader.id,
                first_name: teamLeader.first_name,
                last_name: teamLeader.last_name
            } : null
        }
    })
}

export async function createDepartmentAction(formData: FormData): Promise<any> {
    const supabase = await createClient()
    const name = String(formData.get('name') || '').trim()
    const parent_department_id = String(formData.get('parent_department_id') || '') || null
    const manager_id = String(formData.get('manager_id') || '') || null
    const settingsStr = String(formData.get('settings') || '{}')

    if (!name) throw new Error('Le nom du département est requis')

    let settings = {}
    try {
        settings = JSON.parse(settingsStr)
    } catch {
        settings = {}
    }

    const { data, error } = await (supabase
        .from('departments' as any)
        .insert({
            name,
            parent_department_id,
            manager_id,
            settings
        })
        .select('*')
        .single() as any)

    if (error) throw new Error(error.message)
    
    revalidatePath('/team-management/hr')
    return { success: true, department: data }
}

export async function updateDepartmentAction(id: string, formData: FormData): Promise<any> {
    const supabase = await createClient()
    const name = String(formData.get('name') || '').trim()
    const parent_department_id = String(formData.get('parent_department_id') || '') || null
    const manager_id = String(formData.get('manager_id') || '') || null
    const team_leader_id = String(formData.get('team_leader_id') || '') || null
    const settingsStr = String(formData.get('settings') || '{}')

    if (!name) throw new Error('Le nom du département est requis')

    let settings = {}
    try {
        settings = JSON.parse(settingsStr)
    } catch {
        settings = {}
    }

    const { error } = await (supabase
        .from('departments' as any)
        .update({
            name,
            parent_department_id,
            manager_id,
            team_leader_id,
            settings
        })
        .eq('id', id) as any)

    if (error) throw new Error(error.message)

    revalidatePath('/team-management/hr')
    return { success: true }
}

export async function deleteDepartmentAction(id: string): Promise<any> {
    const supabase = await createClient()

    const { error } = await (supabase
        .from('departments' as any)
        .delete()
        .eq('id', id) as any)

    if (error) throw new Error(error.message)

    revalidatePath('/team-management/hr')
    return { success: true }
}

// ==========================================
// EMPLOYEES CRUD ACTIONS
// ==========================================

export async function getEmployees(): Promise<any[]> {
    const supabase = await createClient()

    const { data: employees, error } = await (supabase
        .from('employees' as any)
        .select(`
            *,
            department:department_id (id, name)
        `)
        .order('last_name') as any)

    if (error) {
        console.error('Error fetching employees:', error)
        return []
    }

    const supervisorMap = new Map((employees || []).map((emp: any) => [emp.id, `${emp.first_name} ${emp.last_name}`]))

    return (employees || []).map((emp: any) => ({
        ...emp,
        supervisor_name: emp.supervisor_id ? supervisorMap.get(emp.supervisor_id) || 'Inconnu' : null
    }))
}

export async function createEmployeeAction(formData: FormData): Promise<any> {
    const supabase = await createClient()

    const first_name = String(formData.get('first_name') || '').trim()
    const last_name = String(formData.get('last_name') || '').trim()
    const email = String(formData.get('email') || '').trim() || null
    const phone = String(formData.get('phone') || '').trim() || null
    const department_id = String(formData.get('department_id') || '') || null
    const supervisor_id = String(formData.get('supervisor_id') || '') || null
    const is_active = formData.get('is_active') === 'true'
    const hire_date = String(formData.get('hire_date') || '') || null
    const departure_date = String(formData.get('departure_date') || '') || null

    if (!first_name || !last_name) {
        throw new Error('Le prénom et le nom sont requis')
    }

    const { data, error } = await (supabase
        .from('employees' as any)
        .insert({
            first_name,
            last_name,
            email,
            phone,
            department_id,
            supervisor_id,
            is_active,
            hire_date,
            departure_date
        })
        .select('*')
        .single() as any)

    if (error) throw new Error(error.message)

    revalidatePath('/team-management/hr')
    return { success: true, employee: data }
}

export async function updateEmployeeAction(id: string, formData: FormData): Promise<any> {
    const supabase = await createClient()

    const first_name = String(formData.get('first_name') || '').trim()
    const last_name = String(formData.get('last_name') || '').trim()
    const email = String(formData.get('email') || '').trim() || null
    const phone = String(formData.get('phone') || '').trim() || null
    const department_id = String(formData.get('department_id') || '') || null
    const supervisor_id = String(formData.get('supervisor_id') || '') || null
    const is_active = formData.get('is_active') === 'true'
    const hire_date = String(formData.get('hire_date') || '') || null
    const departure_date = String(formData.get('departure_date') || '') || null

    if (!first_name || !last_name) {
        throw new Error('Le prénom et le nom sont requis')
    }

    if (supervisor_id === id) {
        throw new Error("Un employé ne peut pas être son propre supérieur direct")
    }

    const { error } = await (supabase
        .from('employees' as any)
        .update({
            first_name,
            last_name,
            email,
            phone,
            department_id,
            supervisor_id,
            is_active,
            hire_date,
            departure_date
        })
        .eq('id', id) as any)

    if (error) throw new Error(error.message)

    revalidatePath('/team-management/hr')
    return { success: true }
}

export async function deleteEmployeeAction(id: string): Promise<any> {
    const supabase = await createClient()

    await supabase
        .from('departments' as any)
        .update({ team_leader_id: null })
        .eq('team_leader_id', id)

    await supabase
        .from('employees' as any)
        .update({ supervisor_id: null })
        .eq('supervisor_id', id)

    const { error } = await (supabase
        .from('employees' as any)
        .delete()
        .eq('id', id) as any)

    if (error) throw new Error(error.message)

    revalidatePath('/team-management/hr')
    return { success: true }
}
