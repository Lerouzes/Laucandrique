'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
    createDepartmentAction, 
    updateDepartmentAction, 
    deleteDepartmentAction,
    createEmployeeAction,
    updateEmployeeAction,
    deleteEmployeeAction
} from '@/actions/hr'
import { 
    PlusCircle, 
    Trash2, 
    Edit3, 
    Check, 
    X, 
    Save, 
    Loader2, 
    Users, 
    Network, 
    UserPlus,
    Calendar,
    Settings,
    CheckCircle2
} from 'lucide-react'
import { OrgChartVisualizer } from './OrgChartVisualizer'
import { toast } from 'sonner'

interface Manager {
    id: string
    first_name: string
    last_name: string
    email: string | null
}

interface Employee {
    id: string
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
    department_id: string | null
    supervisor_id: string | null
    is_active: boolean
    hire_date: string | null
    departure_date: string | null
    department?: Department | null
    supervisor_name?: string | null
}

interface Department {
    id: string
    name: string
    parent_department_id: string | null
    manager_id: string | null
    team_leader_id: string | null
    settings?: any
    parent?: Department | null
    manager?: Manager | null
    team_leader?: Employee | null
}

interface HRManagementProps {
    initialDepartments: Department[]
    initialEmployees: Employee[]
    managers: Manager[]
}

interface SearchSelectOption {
    id: string
    label: string
}

interface SearchSelectProps {
    options: SearchSelectOption[]
    value: string
    onChange: (val: string) => void
    placeholder?: string
    className?: string
}

function SearchSelect({ options, value, onChange, placeholder = "-- Choisir --", className = "" }: SearchSelectProps) {
    const [search, setSearch] = useState('')
    const [isOpen, setIsOpen] = useState(false)

    const selectedOption = options.find(opt => opt.id === value)

    useEffect(() => {
        if (selectedOption) {
            setSearch(selectedOption.label)
        } else {
            setSearch('')
        }
    }, [selectedOption])

    const filteredOptions = useMemo(() => {
        if (!search || (selectedOption && search === selectedOption.label)) {
            return options
        }
        const query = search.toLowerCase()
        return options.filter(opt => opt.label.toLowerCase().includes(query))
    }, [options, search, selectedOption])

    return (
        <div className="relative w-full">
            <div className="relative">
                <input
                    type="text"
                    placeholder={placeholder}
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value)
                        setIsOpen(true)
                        if (!e.target.value) {
                            onChange('')
                        }
                    }}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                    className={`w-full bg-[#121318] border border-zinc-800 rounded-lg px-3 text-zinc-150 text-xs placeholder:text-zinc-500 focus:ring-1 focus:ring-purple-500 outline-none ${className}`}
                />
                {value && (
                    <button
                        type="button"
                        onClick={() => {
                            onChange('')
                            setSearch('')
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                        <X className="h-3 w-3" />
                    </button>
                )}
            </div>
            {isOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[#16171e] border border-zinc-800 rounded-lg shadow-xl scrollbar-thin">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt) => (
                            <div
                                key={opt.id}
                                onClick={() => {
                                    onChange(opt.id)
                                    setSearch(opt.label)
                                    setIsOpen(false)
                                }}
                                className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-purple-600 hover:text-white transition-colors ${
                                    value === opt.id ? 'bg-purple-950/60 text-purple-300 font-bold' : 'text-zinc-300'
                                }`}
                            >
                                {opt.label}
                            </div>
                        ))
                    ) : (
                        <div className="px-3 py-1.5 text-xs text-zinc-500 italic">Aucun résultat trouvé</div>
                    )}
                </div>
            )}
        </div>
    )
}

export function HRManagement({ initialDepartments, initialEmployees, managers }: HRManagementProps) {
    const [activeTab, setActiveTab] = useState<'departments' | 'employees' | 'organigram'>('departments')
    const [orgMode, setOrgMode] = useState<'departments' | 'employees'>('departments')

    // Data States
    const [departments, setDepartments] = useState<Department[]>(initialDepartments)
    const [employees, setEmployees] = useState<Employee[]>(initialEmployees)

    // Loading indicators
    const [loadingAction, setLoadingAction] = useState<string | null>(null)

    // Department Form States
    const [newDeptName, setNewDeptName] = useState('')
    const [newDeptParentId, setNewDeptParentId] = useState('')
    const [newDeptManagerId, setNewDeptManagerId] = useState('')
    
    // Department Editing States
    const [editingDeptId, setEditingDeptId] = useState<string | null>(null)
    const [editDeptName, setEditDeptName] = useState('')
    const [editDeptParentId, setEditDeptParentId] = useState('')
    const [editDeptManagerId, setEditDeptManagerId] = useState('')
    const [editDeptLeaderId, setEditDeptLeaderId] = useState('')

    // Employee Form States
    const [newEmpFirstName, setNewEmpFirstName] = useState('')
    const [newEmpLastName, setNewEmpLastName] = useState('')
    const [newEmpEmail, setNewEmpEmail] = useState('')
    const [newEmpPhone, setNewEmpPhone] = useState('')
    const [newEmpDeptId, setNewEmpDeptId] = useState('')
    const [newEmpSupervisorId, setNewEmpSupervisorId] = useState('')
    const [newEmpHireDate, setNewEmpHireDate] = useState('')
    const [newEmpDepartureDate, setNewEmpDepartureDate] = useState('')
    const [newEmpActive, setNewEmpActive] = useState(true)

    // Employee Editing States
    const [editingEmpId, setEditingEmpId] = useState<string | null>(null)
    const [editEmpFirstName, setEditEmpFirstName] = useState('')
    const [editEmpLastName, setEditEmpLastName] = useState('')
    const [editEmpEmail, setEditEmpEmail] = useState('')
    const [editEmpPhone, setEditEmpPhone] = useState('')
    const [editEmpDeptId, setEditEmpDeptId] = useState('')
    const [editEmpSupervisorId, setEditEmpSupervisorId] = useState('')
    const [editEmpHireDate, setEditEmpHireDate] = useState('')
    const [editEmpDepartureDate, setEditEmpDepartureDate] = useState('')
    const [editEmpActive, setEditEmpActive] = useState(true)

    // ==========================================
    // DEPARTMENT HANDLERS
    // ==========================================

    const handleCreateDept = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newDeptName.trim()) return

        setLoadingAction('create-dept')
        try {
            const formData = new FormData()
            formData.append('name', newDeptName.trim())
            formData.append('parent_department_id', newDeptParentId)
            formData.append('manager_id', newDeptManagerId)

            const res = await createDepartmentAction(formData)
            if (res.success && res.department) {
                toast.success(`Département "${newDeptName}" créé !`)
                setNewDeptName('')
                setNewDeptParentId('')
                setNewDeptManagerId('')
                
                // Refresh local list
                const deptData = res.department as any
                const newDept: Department = {
                    id: deptData.id,
                    name: deptData.name,
                    parent_department_id: deptData.parent_department_id,
                    manager_id: deptData.manager_id,
                    team_leader_id: deptData.team_leader_id,
                    settings: deptData.settings,
                    parent: deptData.parent_department_id ? departments.find(d => d.id === deptData.parent_department_id) ?? null : null,
                    manager: deptData.manager_id ? managers.find(m => m.id === deptData.manager_id) ?? null : null,
                    team_leader: null
                }
                const updated = [...departments, newDept].sort((a, b) => a.name.localeCompare(b.name))
                setDepartments(updated)
            }
        } catch (err: any) {
            toast.error(err.message || 'Impossible de créer le département')
        } finally {
            setLoadingAction(null)
        }
    }

    const handleUpdateDept = async (id: string) => {
        if (!editDeptName.trim()) return

        setLoadingAction(`update-dept-${id}`)
        try {
            const formData = new FormData()
            formData.append('name', editDeptName.trim())
            formData.append('parent_department_id', editDeptParentId)
            formData.append('manager_id', editDeptManagerId)
            formData.append('team_leader_id', editDeptLeaderId)

            const res = await updateDepartmentAction(id, formData)
            if (res.success) {
                toast.success('Département mis à jour !')
                setEditingDeptId(null)
                
                // Refresh local states
                setDepartments(prev => prev.map(d => {
                    if (d.id === id) {
                        return {
                            ...d,
                            name: editDeptName.trim(),
                            parent_department_id: editDeptParentId || null,
                            manager_id: editDeptManagerId || null,
                            team_leader_id: editDeptLeaderId || null,
                            parent: editDeptParentId ? departments.find(p => p.id === editDeptParentId) ?? null : null,
                            manager: editDeptManagerId ? managers.find(m => m.id === editDeptManagerId) ?? null : null,
                            team_leader: editDeptLeaderId ? employees.find(e => e.id === editDeptLeaderId) ?? null : null
                        }
                    }
                    return d
                }))
            }
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la modification')
        } finally {
            setLoadingAction(null)
        }
    }

    const handleDeleteDept = async (id: string) => {
        if (!confirm('Voulez-vous vraiment supprimer ce département ?')) return

        try {
            const res = await deleteDepartmentAction(id)
            if (res.success) {
                toast.success('Département supprimé.')
                setDepartments(prev => prev.filter(d => d.id !== id))
            }
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la suppression')
        }
    }

    // ==========================================
    // EMPLOYEE HANDLERS
    // ==========================================

    const handleCreateEmployee = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newEmpFirstName.trim() || !newEmpLastName.trim()) return

        setLoadingAction('create-emp')
        try {
            const formData = new FormData()
            formData.append('first_name', newEmpFirstName.trim())
            formData.append('last_name', newEmpLastName.trim())
            formData.append('email', newEmpEmail.trim())
            formData.append('phone', newEmpPhone.trim())
            formData.append('department_id', newEmpDeptId)
            formData.append('supervisor_id', newEmpSupervisorId)
            formData.append('is_active', String(newEmpActive))
            formData.append('hire_date', newEmpHireDate)
            formData.append('departure_date', newEmpDepartureDate)

            const res = await createEmployeeAction(formData)
            if (res.success && res.employee) {
                toast.success(`Employé "${newEmpFirstName} ${newEmpLastName}" enregistré !`)
                setNewEmpFirstName('')
                setNewEmpLastName('')
                setNewEmpEmail('')
                setNewEmpPhone('')
                setNewEmpDeptId('')
                setNewEmpSupervisorId('')
                setNewEmpHireDate('')
                setNewEmpDepartureDate('')
                setNewEmpActive(true)

                // Refresh state
                const empData = res.employee as any
                const newEmp: Employee = {
                    id: empData.id,
                    first_name: empData.first_name,
                    last_name: empData.last_name,
                    email: empData.email,
                    phone: empData.phone,
                    department_id: empData.department_id,
                    supervisor_id: empData.supervisor_id,
                    is_active: empData.is_active,
                    hire_date: empData.hire_date,
                    departure_date: empData.departure_date,
                    department: empData.department_id ? departments.find(d => d.id === empData.department_id) ?? null : null,
                    supervisor_name: empData.supervisor_id 
                        ? (() => {
                            const sup = employees.find(e => e.id === empData.supervisor_id)
                            return sup ? `${sup.first_name} ${sup.last_name}` : null
                        })()
                        : null
                }
                setEmployees(prev => [...prev, newEmp].sort((a, b) => a.last_name.localeCompare(b.last_name)))
            }
        } catch (err: any) {
            toast.error(err.message || "Erreur lors de la création de la fiche d'employé")
        } finally {
            setLoadingAction(null)
        }
    }

    const handleUpdateEmployee = async (id: string) => {
        if (!editEmpFirstName.trim() || !editEmpLastName.trim()) return

        setLoadingAction(`update-emp-${id}`)
        try {
            const formData = new FormData()
            formData.append('first_name', editEmpFirstName.trim())
            formData.append('last_name', editEmpLastName.trim())
            formData.append('email', editEmpEmail.trim())
            formData.append('phone', editEmpPhone.trim())
            formData.append('department_id', editEmpDeptId)
            formData.append('supervisor_id', editEmpSupervisorId)
            formData.append('is_active', String(editEmpActive))
            formData.append('hire_date', editEmpHireDate)
            formData.append('departure_date', editEmpActive ? '' : editEmpDepartureDate)

            const res = await updateEmployeeAction(id, formData)
            if (res.success) {
                toast.success('Fiche employé mise à jour !')
                setEditingEmpId(null)

                // Refresh state
                setEmployees(prev => prev.map(emp => {
                    if (emp.id === id) {
                        return {
                            ...emp,
                            first_name: editEmpFirstName.trim(),
                            last_name: editEmpLastName.trim(),
                            email: editEmpEmail.trim() || null,
                            phone: editEmpPhone.trim() || null,
                            department_id: editEmpDeptId || null,
                            supervisor_id: editEmpSupervisorId || null,
                            is_active: editEmpActive,
                            hire_date: editEmpHireDate || null,
                            departure_date: editEmpActive ? null : editEmpDepartureDate || null,
                            department: editEmpDeptId ? departments.find(d => d.id === editEmpDeptId) ?? null : null,
                            supervisor_name: editEmpSupervisorId 
                                ? (() => {
                                    const sup = employees.find(e => e.id === editEmpSupervisorId)
                                    return sup ? `${sup.first_name} ${sup.last_name}` : null
                                })()
                                : null
                        }
                    }
                    return emp
                }).sort((a, b) => a.last_name.localeCompare(b.last_name)))
            }
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la modification')
        } finally {
            setLoadingAction(null)
        }
    }

    const handleDeleteEmployee = async (id: string) => {
        if (!confirm("Voulez-vous vraiment supprimer cet employé ? Cela réinitialisera les liens de subordination dont il fait l'objet.")) return

        try {
            const res = await deleteEmployeeAction(id)
            if (res.success) {
                toast.success('Employé supprimé.')
                setEmployees(prev => prev.filter(e => e.id !== id))
            }
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la suppression')
        }
    }

    return (
        <div className="space-y-6">
            {/* Custom Tab Navigation */}
            <div className="flex border-b border-zinc-800 gap-4 flex-wrap">
                <button
                    onClick={() => setActiveTab('departments')}
                    className={`pb-2.5 text-sm font-bold transition-all relative flex items-center gap-1.5 ${
                        activeTab === 'departments' 
                            ? 'text-purple-400 font-extrabold' 
                            : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    <Network className="h-4 w-4" />
                    Structure des Départements (Services)
                    {activeTab === 'departments' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('employees')}
                    className={`pb-2.5 text-sm font-bold transition-all relative flex items-center gap-1.5 ${
                        activeTab === 'employees' 
                            ? 'text-purple-400 font-extrabold' 
                            : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    <Users className="h-4 w-4" />
                    Gestion des Employés & Affectations
                    {activeTab === 'employees' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('organigram')}
                    className={`pb-2.5 text-sm font-bold transition-all relative flex items-center gap-1.5 ${
                        activeTab === 'organigram' 
                            ? 'text-purple-400 font-extrabold' 
                            : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    <Check className="h-4 w-4 text-purple-400" />
                    Organigramme Interactif
                    {activeTab === 'organigram' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                    )}
                </button>
            </div>

            {/* TAB CONTENT: DEPARTMENTS */}
            {activeTab === 'departments' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Add Department form */}
                    <div>
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader className="pb-3 bg-zinc-950/20">
                                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                                    <PlusCircle className="h-4 w-4 text-purple-400" />
                                    Créer un Département
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-400">
                                    Ajouter un nouveau service interne à la structure organisationnelle.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <form onSubmit={handleCreateDept} className="space-y-4 text-xs">
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500">Nom du Département</Label>
                                        <Input 
                                            type="text" 
                                            value={newDeptName}
                                            onChange={(e) => setNewDeptName(e.target.value)}
                                            required 
                                            placeholder="ex: Comptabilité..." 
                                            className="bg-[#121318] border-zinc-800 h-9 text-white text-[16px] md:text-xs" 
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-zinc-500">Service Parent (Rattachement)</Label>
                                        <SearchSelect
                                            options={departments.map(d => ({ id: d.id, label: d.name }))}
                                            value={newDeptParentId}
                                            onChange={setNewDeptParentId}
                                            placeholder="-- Aucun (Service Principal) --"
                                            className="h-9"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-zinc-500">Gestionnaire responsable</Label>
                                        <SearchSelect
                                            options={managers.map(m => ({ id: m.id, label: `${m.first_name} ${m.last_name}` }))}
                                            value={newDeptManagerId}
                                            onChange={setNewDeptManagerId}
                                            placeholder="-- Aucun gestionnaire --"
                                            className="h-9"
                                        />
                                    </div>

                                    <Button 
                                        type="submit" 
                                        disabled={loadingAction === 'create-dept'}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold h-9 rounded-lg flex items-center justify-center gap-1 shadow-md"
                                    >
                                        {loadingAction === 'create-dept' ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <PlusCircle className="h-4 w-4" />
                                        )}
                                        Créer le Service
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Department list */}
                    <div className="lg:col-span-2">
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader>
                                <CardTitle className="text-base font-bold text-white">Départements internes</CardTitle>
                                <CardDescription className="text-xs text-zinc-400">
                                    Configurez les liens hiérarchiques de vos services, désignez les chefs d'équipe, et liez les directeurs.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {departments.length === 0 ? (
                                    <p className="text-xs text-zinc-500 italic py-6 text-center">Aucun département défini.</p>
                                ) : (
                                    departments.map((d) => {
                                        const isEditing = editingDeptId === d.id
                                        const isUpdating = loadingAction === `update-dept-${d.id}`

                                        return (
                                            <div 
                                                key={d.id} 
                                                className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-3 text-xs"
                                            >
                                                {isEditing ? (
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div className="space-y-1">
                                                                <Label className="text-zinc-500 text-[10px]">Nom du Service</Label>
                                                                <Input 
                                                                    type="text" 
                                                                    value={editDeptName} 
                                                                    onChange={(e) => setEditDeptName(e.target.value)}
                                                                    className="bg-[#121318] border-zinc-700 h-8 text-[16px] md:text-xs text-white"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-zinc-500 text-[10px]">Rattaché à (Parent)</Label>
                                                                <SearchSelect
                                                                    options={departments.filter(p => p.id !== d.id).map(p => ({ id: p.id, label: p.name }))}
                                                                    value={editDeptParentId}
                                                                    onChange={setEditDeptParentId}
                                                                    placeholder="-- Aucun (Racine) --"
                                                                    className="h-8"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-zinc-500 text-[10px]">Chef d'équipe (Leader)</Label>
                                                                <SearchSelect
                                                                    options={employees.filter(emp => emp.is_active).map(emp => ({ id: emp.id, label: `${emp.first_name} ${emp.last_name}` }))}
                                                                    value={editDeptLeaderId}
                                                                    onChange={setEditDeptLeaderId}
                                                                    placeholder="-- Aucun leader --"
                                                                    className="h-8"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-zinc-500 text-[10px]">Directeur de Service (Manager)</Label>
                                                                <SearchSelect
                                                                    options={managers.map(mgr => ({ id: mgr.id, label: `${mgr.first_name} ${mgr.last_name}` }))}
                                                                    value={editDeptManagerId}
                                                                    onChange={setEditDeptManagerId}
                                                                    placeholder="-- Aucun --"
                                                                    className="h-8"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 justify-end pt-1">
                                                            <Button 
                                                                size="sm"
                                                                disabled={isUpdating}
                                                                onClick={() => handleUpdateDept(d.id)}
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-3 rounded-md flex items-center gap-1"
                                                            >
                                                                {isUpdating ? (
                                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                                ) : (
                                                                    <Check className="h-3.5 w-3.5" />
                                                                )}
                                                                Enregistrer
                                                            </Button>
                                                            <Button 
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setEditingDeptId(null)}
                                                                className="border-zinc-800 text-zinc-400 hover:text-white h-7 px-3 rounded-md flex items-center gap-1"
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                                Annuler
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-white text-sm">{d.name}</span>
                                                                {d.parent && (
                                                                    <Badge className="bg-zinc-800 hover:bg-zinc-800 text-zinc-400 border border-zinc-750 text-[9px] py-0">
                                                                        Sous-service de: {d.parent.name}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-zinc-450 mt-1.5">
                                                                <span>Leader : <strong className="text-zinc-350">{d.team_leader ? `${d.team_leader.first_name} ${d.team_leader.last_name}` : 'aucun'}</strong></span>
                                                                <span>Manager : <strong className="text-zinc-350">{d.manager ? `${d.manager.first_name} ${d.manager.last_name}` : 'aucun'}</strong></span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <Button 
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setEditingDeptId(d.id)
                                                                    setEditDeptName(d.name)
                                                                    setEditDeptParentId(d.parent_department_id || '')
                                                                    setEditDeptManagerId(d.manager_id || '')
                                                                    setEditDeptLeaderId(d.team_leader_id || '')
                                                                }}
                                                                className="border-zinc-850 hover:bg-zinc-800 text-zinc-450 hover:text-zinc-200 h-8 px-2.5 rounded-lg flex items-center gap-1"
                                                            >
                                                                <Edit3 className="h-3.5 w-3.5" />
                                                                Modifier
                                                            </Button>
                                                            <Button 
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleDeleteDept(d.id)}
                                                                className="border-zinc-850 hover:bg-rose-950/20 border-rose-950/10 hover:border-rose-900 text-zinc-450 hover:text-rose-450 h-8 px-2.5 rounded-lg flex items-center gap-1"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                Supprimer
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: EMPLOYEES */}
            {activeTab === 'employees' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Onboard Employee Form */}
                    <div>
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader className="pb-3 bg-zinc-950/20">
                                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                                    <UserPlus className="h-4 w-4 text-purple-400" />
                                    Enregistrer un Employé
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-400">
                                    Créer la fiche signalétique et affecter le supérieur direct d'un employé.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <form onSubmit={handleCreateEmployee} className="space-y-3.5 text-xs">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-zinc-500">Prénom</Label>
                                            <Input 
                                                type="text" 
                                                value={newEmpFirstName}
                                                onChange={(e) => setNewEmpFirstName(e.target.value)}
                                                required
                                                className="bg-[#121318] border-zinc-800 h-9 text-white text-[16px] md:text-xs" 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-zinc-500">Nom de famille</Label>
                                            <Input 
                                                type="text" 
                                                value={newEmpLastName}
                                                onChange={(e) => setNewEmpLastName(e.target.value)}
                                                required
                                                className="bg-[#121318] border-zinc-800 h-9 text-white text-[16px] md:text-xs" 
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-zinc-500">Adresse courriel</Label>
                                        <Input 
                                            type="email" 
                                            value={newEmpEmail}
                                            onChange={(e) => setNewEmpEmail(e.target.value)}
                                            placeholder="employe@laucandrique.com"
                                            className="bg-[#121318] border-zinc-800 h-9 text-white text-[16px] md:text-xs" 
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-zinc-500">Téléphone professionnel</Label>
                                        <Input 
                                            type="tel" 
                                            value={newEmpPhone}
                                            onChange={(e) => setNewEmpPhone(e.target.value)}
                                            placeholder="514-xxx-xxxx"
                                            className="bg-[#121318] border-zinc-800 h-9 text-white text-[16px] md:text-xs" 
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-zinc-500">Département d'Affectation</Label>
                                        <SearchSelect
                                            options={departments.map(d => ({ id: d.id, label: d.name }))}
                                            value={newEmpDeptId}
                                            onChange={setNewEmpDeptId}
                                            placeholder="-- Aucun --"
                                            className="h-9"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-zinc-500">Supérieur direct</Label>
                                        <SearchSelect
                                            options={employees.filter(emp => emp.is_active).map(emp => ({ id: emp.id, label: `${emp.first_name} ${emp.last_name}` }))}
                                            value={newEmpSupervisorId}
                                            onChange={setNewEmpSupervisorId}
                                            placeholder="-- Aucun --"
                                            className="h-9"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-zinc-500">Date d'embauche</Label>
                                            <Input 
                                                type="date" 
                                                value={newEmpHireDate}
                                                onChange={(e) => setNewEmpHireDate(e.target.value)}
                                                className="bg-[#121318] border-zinc-800 h-9 text-white text-[16px] md:text-xs" 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-zinc-500">Date de départ (si inactif)</Label>
                                            <Input 
                                                type="date" 
                                                value={newEmpDepartureDate}
                                                disabled={newEmpActive}
                                                onChange={(e) => setNewEmpDepartureDate(e.target.value)}
                                                className="bg-[#121318] border-zinc-800 h-9 text-white text-[16px] md:text-xs disabled:opacity-40" 
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 py-1 select-none">
                                        <input
                                            type="checkbox"
                                            id="new-emp-active"
                                            checked={newEmpActive}
                                            onChange={(e) => {
                                                setNewEmpActive(e.target.checked)
                                                if (e.target.checked) setNewEmpDepartureDate('')
                                            }}
                                            className="rounded border-zinc-800 text-purple-600 focus:ring-purple-500 h-4 w-4 bg-[#121318]"
                                        />
                                        <Label htmlFor="new-emp-active" className="text-zinc-400 cursor-pointer">Employé actif (en poste)</Label>
                                    </div>

                                    <Button 
                                        type="submit" 
                                        disabled={loadingAction === 'create-emp'}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold h-9 rounded-lg flex items-center justify-center gap-1 shadow-md"
                                    >
                                        {loadingAction === 'create-emp' ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <UserPlus className="h-4 w-4" />
                                        )}
                                        Enregistrer l'Employé
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Employee List / assignment cards */}
                    <div className="lg:col-span-2">
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader>
                                <CardTitle className="text-base font-bold text-white">Répertoire des employés</CardTitle>
                                <CardDescription className="text-xs text-zinc-400">
                                    Consultez les informations de contact, modifiez le service ou changez de superviseur direct.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {employees.length === 0 ? (
                                    <p className="text-xs text-zinc-500 italic py-6 text-center">Aucun employé enregistré.</p>
                                ) : (
                                    employees.map((emp) => {
                                        const isEditing = editingEmpId === emp.id
                                        const isUpdating = loadingAction === `update-emp-${emp.id}`

                                        return (
                                            <div 
                                                key={emp.id} 
                                                className={`p-4 border rounded-xl space-y-3 text-xs transition-all ${
                                                    emp.is_active 
                                                        ? 'bg-zinc-900/40 border-zinc-850' 
                                                        : 'bg-zinc-950/20 border-zinc-950/40 opacity-70'
                                                }`}
                                            >
                                                {isEditing ? (
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div className="space-y-1">
                                                                <Label className="text-zinc-500 text-[10px]">Prénom</Label>
                                                                <Input 
                                                                    type="text" 
                                                                    value={editEmpFirstName} 
                                                                    onChange={(e) => setEditEmpFirstName(e.target.value)}
                                                                    className="bg-[#121318] border-zinc-705 h-8 text-[16px] md:text-xs text-white"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-zinc-500 text-[10px]">Nom de famille</Label>
                                                                <Input 
                                                                    type="text" 
                                                                    value={editEmpLastName} 
                                                                    onChange={(e) => setEditEmpLastName(e.target.value)}
                                                                    className="bg-[#121318] border-zinc-705 h-8 text-[16px] md:text-xs text-white"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-zinc-500 text-[10px]">Adresse courriel</Label>
                                                                <Input 
                                                                    type="email" 
                                                                    value={editEmpEmail} 
                                                                    onChange={(e) => setEditEmpEmail(e.target.value)}
                                                                    className="bg-[#121318] border-zinc-705 h-8 text-[16px] md:text-xs text-white"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-zinc-500 text-[10px]">Téléphone</Label>
                                                                <Input 
                                                                    type="text" 
                                                                    value={editEmpPhone} 
                                                                    onChange={(e) => setEditEmpPhone(e.target.value)}
                                                                    className="bg-[#121318] border-zinc-705 h-8 text-[16px] md:text-xs text-white"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-zinc-500 text-[10px]">Département</Label>
                                                                <SearchSelect
                                                                    options={departments.map(dep => ({ id: dep.id, label: dep.name }))}
                                                                    value={editEmpDeptId}
                                                                    onChange={setEditEmpDeptId}
                                                                    placeholder="-- Aucun --"
                                                                    className="h-8"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-zinc-500 text-[10px]">Supérieur direct</Label>
                                                                <SearchSelect
                                                                    options={employees.filter(el => el.id !== emp.id && el.is_active).map(el => ({ id: el.id, label: `${el.first_name} ${el.last_name}` }))}
                                                                    value={editEmpSupervisorId}
                                                                    onChange={setEditEmpSupervisorId}
                                                                    placeholder="-- Aucun --"
                                                                    className="h-8"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-zinc-500 text-[10px]">Date d'embauche</Label>
                                                                <Input 
                                                                    type="date" 
                                                                    value={editEmpHireDate} 
                                                                    onChange={(e) => setEditEmpHireDate(e.target.value)}
                                                                    className="bg-[#121318] border-zinc-705 h-8 text-[16px] md:text-xs text-white"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-zinc-500 text-[10px]">Date de départ (si inactif)</Label>
                                                                <Input 
                                                                    type="date" 
                                                                    value={editEmpDepartureDate} 
                                                                    disabled={editEmpActive}
                                                                    onChange={(e) => setEditEmpDepartureDate(e.target.value)}
                                                                    className="bg-[#121318] border-zinc-705 h-8 text-[16px] md:text-xs text-white disabled:opacity-40"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-4 py-1 select-none">
                                                            <input
                                                                type="checkbox"
                                                                id={`edit-active-${emp.id}`}
                                                                checked={editEmpActive}
                                                                onChange={(e) => {
                                                                    setEditEmpActive(e.target.checked)
                                                                    if (e.target.checked) setEditEmpDepartureDate('')
                                                                }}
                                                                className="rounded border-zinc-800 text-purple-600 focus:ring-purple-500 h-4 w-4 bg-[#121318]"
                                                            />
                                                            <Label htmlFor={`edit-active-${emp.id}`} className="text-zinc-400 cursor-pointer text-xxs">Employé en poste (Actif)</Label>
                                                        </div>

                                                        <div className="flex items-center gap-2 justify-end pt-1">
                                                            <Button 
                                                                size="sm"
                                                                disabled={isUpdating}
                                                                onClick={() => handleUpdateEmployee(emp.id)}
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-3 rounded-md flex items-center gap-1"
                                                            >
                                                                {isUpdating ? (
                                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                                ) : (
                                                                    <Check className="h-3.5 w-3.5" />
                                                                )}
                                                                Enregistrer
                                                            </Button>
                                                            <Button 
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setEditingEmpId(null)}
                                                                className="border-zinc-800 text-zinc-400 hover:text-white h-7 px-3 rounded-md flex items-center gap-1"
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                                Annuler
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-white text-sm">{emp.first_name} {emp.last_name}</span>
                                                                <Badge className={
                                                                    emp.is_active 
                                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] py-0' 
                                                                        : 'bg-rose-500/10 text-rose-450 text-rose-400 border border-rose-500/20 text-[9px] py-0'
                                                                }>
                                                                    {emp.is_active ? 'Actif' : 'Inactif'}
                                                                </Badge>
                                                                {emp.department && (
                                                                    <Badge className="bg-purple-950/40 text-purple-400 border border-purple-800/40 text-[9px] py-0">
                                                                        {emp.department.name}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-zinc-450 mt-1.5">
                                                                {emp.email && <span>Email : <strong className="text-zinc-350">{emp.email}</strong></span>}
                                                                {emp.phone && <span>Tél : <strong className="text-zinc-350">{emp.phone}</strong></span>}
                                                                <span>Supérieur : <strong className="text-zinc-350">{emp.supervisor_name || 'aucun'}</strong></span>
                                                            </div>
                                                            <div className="flex items-center gap-1 mt-1 font-mono text-[8px] text-zinc-550">
                                                                <Calendar className="h-3 w-3" />
                                                                <span>Embauche : {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('fr-CA') : 'n/a'}</span>
                                                                {!emp.is_active && emp.departure_date && (
                                                                    <span className="text-rose-400 font-bold ml-2">Départ : {new Date(emp.departure_date).toLocaleDateString('fr-CA')}</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <Button 
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setEditingEmpId(emp.id)
                                                                    setEditEmpFirstName(emp.first_name)
                                                                    setEditEmpLastName(emp.last_name)
                                                                    setEditEmpEmail(emp.email || '')
                                                                    setEditEmpPhone(emp.phone || '')
                                                                    setEditEmpDeptId(emp.department_id || '')
                                                                    setEditEmpSupervisorId(emp.supervisor_id || '')
                                                                    setEditEmpHireDate(emp.hire_date || '')
                                                                    setEditEmpDepartureDate(emp.departure_date || '')
                                                                    setEditEmpActive(emp.is_active)
                                                                }}
                                                                className="border-zinc-850 hover:bg-zinc-800 text-zinc-450 hover:text-zinc-200 h-8 px-2.5 rounded-lg flex items-center gap-1"
                                                            >
                                                                <Edit3 className="h-3.5 w-3.5" />
                                                                Modifier
                                                            </Button>
                                                            <Button 
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleDeleteEmployee(emp.id)}
                                                                className="border-zinc-850 hover:bg-rose-950/20 border-rose-950/10 hover:border-rose-900 text-zinc-450 hover:text-rose-450 h-8 px-2.5 rounded-lg flex items-center gap-1"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                Supprimer
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: ORGANIGRAM */}
            {activeTab === 'organigram' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-zinc-950 border border-zinc-850 p-1 flex w-fit rounded-xl">
                        <button
                            onClick={() => setOrgMode('departments')}
                            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                                orgMode === 'departments' 
                                    ? 'bg-zinc-900 text-white font-extrabold shadow' 
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            Structure des Services (Départements)
                        </button>
                        <button
                            onClick={() => setOrgMode('employees')}
                            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                                orgMode === 'employees' 
                                    ? 'bg-zinc-900 text-white font-extrabold shadow' 
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            Hiérarchie des Personnes (Employés actifs)
                        </button>
                    </div>

                    <OrgChartVisualizer 
                        departments={departments}
                        employees={employees}
                        mode={orgMode}
                    />
                </div>
            )}
        </div>
    )
}
