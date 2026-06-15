'use client'

import React, { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, User, Users, Calendar, ArrowRight } from 'lucide-react'

interface DepartmentNode {
    id: string
    name: string
    parent_department_id: string | null
    manager_id: string | null
    team_leader_id: string | null
    settings?: any
    parent?: DepartmentNode | null
    manager?: { id: string; first_name: string; last_name: string; email: string | null } | null
    team_leader?: { id: string; first_name: string; last_name: string } | null
}

interface EmployeeNode {
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
    department?: { id: string; name: string } | null
    supervisor_name?: string | null
}

interface OrgChartVisualizerProps {
    departments: DepartmentNode[]
    employees: EmployeeNode[]
    mode: 'departments' | 'employees'
}

export function OrgChartVisualizer({ departments, employees, mode }: OrgChartVisualizerProps) {
    // 1. Helper to render initials for avatars
    const getInitials = (first: string, last: string) => {
        return `${first.substring(0, 1)}${last.substring(0, 1)}`.toUpperCase()
    }

    // 2. Build Department Tree Structure
    const departmentTree = useMemo(() => {
        if (mode !== 'departments') return []

        const nodesMap: Record<string, { node: DepartmentNode; children: any[] }> = {}
        departments.forEach(dept => {
            nodesMap[dept.id] = { node: dept, children: [] }
        })

        const roots: any[] = []
        departments.forEach(dept => {
            const current = nodesMap[dept.id]
            if (dept.parent_department_id && nodesMap[dept.parent_department_id]) {
                nodesMap[dept.parent_department_id].children.push(current)
            } else {
                roots.push(current)
            }
        })

        return roots
    }, [departments, mode])

    // 3. Build Employee Tree Structure
    const employeeTree = useMemo(() => {
        if (mode !== 'employees') return []

        const activeEmployees = employees.filter(e => e.is_active)
        const nodesMap: Record<string, { node: EmployeeNode; children: any[] }> = {}
        activeEmployees.forEach(emp => {
            nodesMap[emp.id] = { node: emp, children: [] }
        })

        // Map department id to department node for fast lookup
        const deptMap = new Map(departments.map(d => [d.id, d]))

        // Helper to find parent department leader
        const getParentDeptLeader = (deptId: string | null): string | null => {
            if (!deptId) return null
            let curr = deptMap.get(deptId)
            while (curr && curr.parent_department_id) {
                const parent = deptMap.get(curr.parent_department_id)
                if (parent && parent.team_leader_id) {
                    return parent.team_leader_id
                }
                curr = parent
            }
            return null
        }

        const roots: any[] = []
        activeEmployees.forEach(emp => {
            const current = nodesMap[emp.id]
            let resolvedSupervisorId = emp.supervisor_id

            if (!resolvedSupervisorId && emp.department_id) {
                const dept = deptMap.get(emp.department_id)
                if (dept) {
                    if (dept.team_leader_id && dept.team_leader_id !== emp.id) {
                        resolvedSupervisorId = dept.team_leader_id
                    } else if (dept.team_leader_id === emp.id) {
                        // This employee is the team leader of this department.
                        // They report to the parent department's team leader.
                        resolvedSupervisorId = getParentDeptLeader(dept.parent_department_id)
                    }
                }
            }

            // Verify the supervisor exists and is active, and is not a self-reference
            if (resolvedSupervisorId && resolvedSupervisorId !== emp.id && nodesMap[resolvedSupervisorId]) {
                nodesMap[resolvedSupervisorId].children.push(current)
            } else {
                roots.push(current)
            }
        })

        return roots
    }, [employees, departments, mode])

    // Recursively render Department Node
    const renderDeptNode = (treeNode: { node: DepartmentNode; children: any[] }) => {
        const { node, children } = treeNode

        return (
            <div key={node.id} className="flex flex-col items-center">
                {/* Department Node Card */}
                <Card className="bg-[#16171e]/90 border border-zinc-800 p-4 rounded-xl shadow-xl w-60 text-center hover:border-purple-650 transition-all relative z-10 shrink-0">
                    <div className="text-xs font-bold text-white uppercase tracking-wider">{node.name}</div>
                    
                    <div className="mt-3 pt-3 border-t border-zinc-900 text-[10px] space-y-1.5 text-left text-zinc-400">
                        {node.team_leader ? (
                            <div className="flex items-center gap-1.5">
                                <User className="h-3 w-3 text-purple-400" />
                                <span>Leader: <strong>{node.team_leader.first_name} {node.team_leader.last_name}</strong></span>
                            </div>
                        ) : (
                            <span className="text-zinc-650 italic">Aucun chef d'équipe</span>
                        )}

                        {node.manager ? (
                            <div className="flex items-center gap-1.5">
                                <Shield className="h-3 w-3 text-indigo-400" />
                                <span>Directeur/Gestionnaire: <strong>{node.manager.first_name} {node.manager.last_name}</strong></span>
                            </div>
                        ) : (
                            <span className="text-zinc-650 italic">Aucun gestionnaire</span>
                        )}
                    </div>
                </Card>

                {/* Connection lines and children */}
                {children.length > 0 && (
                    <div className="flex flex-col items-center w-full mt-8 relative">
                        {/* Vertical line going down from parent */}
                        <div className="w-0.5 h-8 bg-zinc-800 absolute -top-8 left-1/2 -translate-x-1/2"></div>
                        
                        {/* Horizontal connecting line between sibling nodes */}
                        <div className="absolute top-0 h-0.5 bg-zinc-800" style={{
                            left: children.length > 1 ? `calc(${100 / children.length / 2}% )` : '50%',
                            right: children.length > 1 ? `calc(${100 / children.length / 2}% )` : '50%',
                        }}></div>

                        {/* Children nodes container */}
                        <div className="flex justify-around gap-6 w-full pt-8">
                            {children.map(child => {
                                return (
                                    <div key={child.node.id} className="relative flex flex-col items-center">
                                        {/* Vertical line going down to child */}
                                        <div className="w-0.5 h-8 bg-zinc-800 absolute -top-8 left-1/2 -translate-x-1/2"></div>
                                        {renderDeptNode(child)}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // Recursively render Employee Node
    const renderEmployeeNode = (treeNode: { node: EmployeeNode; children: any[] }) => {
        const { node, children } = treeNode

        return (
            <div key={node.id} className="flex flex-col items-center">
                {/* Employee Node Card */}
                <Card className="bg-[#16171e]/90 border border-zinc-800 p-4 rounded-xl shadow-xl w-60 text-center hover:border-cyan-550 transition-all relative z-10 shrink-0">
                    <div className="flex items-center gap-3 text-left">
                        {/* Initials Avatar */}
                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center font-black text-xs text-white shadow-md">
                            {getInitials(node.first_name, node.last_name)}
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{node.first_name} {node.last_name}</div>
                            {node.department ? (
                                <Badge className="mt-1 bg-cyan-950/40 text-cyan-400 border border-cyan-900/65 text-[8px] font-bold uppercase py-0.5">
                                    {node.department.name}
                                </Badge>
                            ) : (
                                <span className="text-[9px] text-zinc-650 italic">Aucun département</span>
                            )}
                        </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-zinc-900 text-[9px] space-y-1 text-left text-zinc-550">
                        {node.email && <div className="truncate text-zinc-400">Email: {node.email}</div>}
                        {node.phone && <div>Tél: {node.phone}</div>}
                        {node.hire_date && (
                            <div className="flex items-center gap-1 mt-1 font-mono text-[8px]">
                                <Calendar className="h-2.5 w-2.5 text-zinc-500" />
                                <span>Embauche: {new Date(node.hire_date).toLocaleDateString('fr-CA')}</span>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Connection lines and children */}
                {children.length > 0 && (
                    <div className="flex flex-col items-center w-full mt-8 relative">
                        {/* Vertical line going down from parent */}
                        <div className="w-0.5 h-8 bg-zinc-800 absolute -top-8 left-1/2 -translate-x-1/2"></div>
                        
                        {/* Horizontal connecting line between sibling nodes */}
                        <div className="absolute top-0 h-0.5 bg-zinc-800" style={{
                            left: children.length > 1 ? `calc(${100 / children.length / 2}% )` : '50%',
                            right: children.length > 1 ? `calc(${100 / children.length / 2}% )` : '50%',
                        }}></div>

                        {/* Children nodes container */}
                        <div className="flex justify-around gap-6 w-full pt-8">
                            {children.map(child => {
                                return (
                                    <div key={child.node.id} className="relative flex flex-col items-center">
                                        {/* Vertical line going down to child */}
                                        <div className="w-0.5 h-8 bg-zinc-800 absolute -top-8 left-1/2 -translate-x-1/2"></div>
                                        {renderEmployeeNode(child)}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="w-full overflow-x-auto p-12 bg-zinc-950/20 border border-zinc-900 rounded-2xl flex justify-center min-h-[600px] scrollbar-thin">
            <div className="h-fit">
                {mode === 'departments' ? (
                    departmentTree.length === 0 ? (
                        <div className="text-center text-zinc-500 italic py-24">Aucune hiérarchie de département configurée.</div>
                    ) : (
                        <div className="flex justify-center gap-12">
                            {departmentTree.map(root => renderDeptNode(root))}
                        </div>
                    )
                ) : (
                    employeeTree.length === 0 ? (
                        <div className="text-center text-zinc-500 italic py-24">Aucune hiérarchie d'employés configurée.</div>
                    ) : (
                        <div className="flex justify-center gap-12">
                            {employeeTree.map(root => renderEmployeeNode(root))}
                        </div>
                    )
                )}
            </div>
        </div>
    )
}
