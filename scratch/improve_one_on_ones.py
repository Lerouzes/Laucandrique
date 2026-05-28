import re

def scale_up_font_sizes(content):
    # Scale up tailwind font sizes by 1 level
    pattern = r'\btext-(xxs|xs|sm|md|lg|xl|2xl|\[8px\]|\[9px\]|\[10px\]|\[11px\])\b'
    
    mapping = {
        'xxs': 'xs',
        '[8px]': '[10px]',
        '[9px]': 'xs',
        '[10px]': 'xs',
        '[11px]': 'xs',
        'xs': 'sm',
        'sm': 'base',
        'md': 'lg',
        'lg': 'xl',
        'xl': '2xl',
        '2xl': '3xl'
    }
    
    def repl(match):
        val = match.group(1)
        return 'text-' + mapping.get(val, val)
        
    return re.sub(pattern, repl, content)

# 1. Update NewOneOnOneForm.tsx
with open('src/components/features/team-management/NewOneOnOneForm.tsx', 'r', encoding='utf-8') as f:
    form_content = f.read()

# Replace commitment input with textarea
target_input = """                        <Input 
                            value={newCommitmentText} 
                            onChange={(e) => setNewCommitmentText(e.target.value)}
                            placeholder="Saisir un nouvel engagement pour la prochaine rencontre..." 
                            className="bg-[#121318] border-zinc-800 h-9 text-xxs text-white flex-1" 
                        />"""

replacement_textarea = """                        <Textarea 
                            value={newCommitmentText} 
                            onChange={(e) => setNewCommitmentText(e.target.value)}
                            placeholder="Saisir un nouvel engagement pour la prochaine rencontre..." 
                            rows={3}
                            className="bg-[#121318] border-zinc-800 text-xs text-white flex-1 p-2" 
                        />"""

form_content = form_content.replace(target_input, replacement_textarea)
form_content = scale_up_font_sizes(form_content)

with open('src/components/features/team-management/NewOneOnOneForm.tsx', 'w', encoding='utf-8') as f:
    f.write(form_content)
print("Updated NewOneOnOneForm.tsx")

# 2. Update OneOnOneDetailView.tsx
with open('src/components/features/team-management/OneOnOneDetailView.tsx', 'r', encoding='utf-8') as f:
    detail_content = f.read()

# Replace commitment input with textarea
target_input_detail = """                        <Input 
                            value={newCommitmentText} 
                            onChange={(e) => setNewCommitmentText(e.target.value)}
                            placeholder="Saisir un nouvel engagement..." 
                            className="bg-[#121318] border-zinc-800 h-9 text-xxs text-white flex-1" 
                        />"""

replacement_textarea_detail = """                        <Textarea 
                            value={newCommitmentText} 
                            onChange={(e) => setNewCommitmentText(e.target.value)}
                            placeholder="Saisir un nouvel engagement..." 
                            rows={3}
                            className="bg-[#121318] border-zinc-800 text-xs text-white flex-1 p-2" 
                        />"""

detail_content = detail_content.replace(target_input_detail, replacement_textarea_detail)

# Add deleteOneOnOneAction to import
detail_content = detail_content.replace(
    "import { updateOneOnOneAction, getOneOnOneSnapshotAction } from '@/actions/team-management'",
    "import { updateOneOnOneAction, getOneOnOneSnapshotAction, deleteOneOnOneAction } from '@/actions/team-management'"
)

# Add delete and revert methods
methods_target = "    const handleSave = async (status: 'draft' | 'completed') => {"
methods_replacement = """    const handleRevertToDraft = async () => {
        setLoading(true)
        try {
            const finalComplaints = Object.entries(complaintDiscussions)
                .filter(([_, data]) => data.checked)
                .map(([id, data]) => ({
                    complaint_id: id,
                    discussion_notes: data.discussion_notes,
                    resolution_plan: data.resolution_plan,
                    resolved_in_meeting: data.resolved_in_meeting
                }))

            await updateOneOnOneAction(oneOnOne.id, {
                meeting_date: meetingDate,
                status: 'draft',
                emails_over_48h: Number(emailsOver48h),
                late_tasks: Number(lateTasks),
                calls_total: Number(callsTotal),
                calls_answered: Number(callsAnswered),
                bills_no_notes_over_7d: Number(billsNoNotes),
                op_reports_closed: Number(opReportsClosed),
                agenda_templates_used: 0,
                assemblies_on_time: 0,
                syndicates_lost: Number(syndicatesLost),
                package_changes: Number(packageChanges),
                current_issues: currentIssues,
                main_objectives: mainObjectives,
                recent_wins: recentWins,
                difficult_situations: difficultSituations,
                priority_1: priority1,
                priority_2: priority2,
                priority_3: priority3,
                training_requested: trainingRequested,
                escalation_needed: escalationNeeded,
                operational_blockers: operationalBlockers,
                conflict_resolution: conflictResolution,
                commitments: meetingCommitments,
                complaints: finalComplaints
            })
            setIsEditing(true)
            router.refresh()
        } catch (err) {
            alert('Erreur lors de la remise en brouillon : ' + (err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteMeeting = async () => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette rencontre ? Cette action est irréversible.")) {
            return
        }
        setLoading(true)
        try {
            await deleteOneOnOneAction(oneOnOne.id)
            router.push('/team-management/one-on-ones')
        } catch (err) {
            alert('Erreur lors de la suppression : ' + (err as Error).message)
            setLoading(false)
        }
    }

    const handleSave = async (status: 'draft' | 'completed') => {"""

detail_content = detail_content.replace(methods_target, methods_replacement)

# Update header controls layout to add delete / revert buttons
header_target = """                <div className="flex gap-3">
                    {oneOnOne.status === 'draft' && !isEditing && (
                        <Button 
                            onClick={() => setIsEditing(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-xxs h-8 px-4 rounded-lg font-bold"
                        >
                            Modifier le Brouillon
                        </Button>
                    )}

                    {isEditing && (
                        <>
                            <Button 
                                onClick={() => handleSave('draft')}
                                disabled={loading}
                                variant="outline" 
                                className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-xxs h-8 px-4 rounded-lg font-bold"
                            >
                                Sauvegarder Brouillon
                            </Button>
                            <Button 
                                onClick={() => handleSave('completed')}
                                disabled={loading}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xxs h-8 px-4 rounded-lg font-bold"
                            >
                                Finaliser & Verrouiller
                            </Button>
                        </>
                    )}
                </div>"""

header_replacement = """                <div className="flex flex-wrap gap-2.5">
                    {oneOnOne.status === 'completed' && (
                        <Button 
                            onClick={handleRevertToDraft}
                            disabled={loading}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-4 rounded-lg font-bold flex items-center gap-1.5"
                        >
                            Remettre en Brouillon
                        </Button>
                    )}

                    {oneOnOne.status === 'draft' && !isEditing && (
                        <Button 
                            onClick={() => setIsEditing(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 px-4 rounded-lg font-bold"
                        >
                            Modifier le Brouillon
                        </Button>
                    )}

                    {isEditing && (
                        <>
                            <Button 
                                onClick={() => handleSave('draft')}
                                disabled={loading}
                                variant="outline" 
                                className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-xs h-8 px-4 rounded-lg font-bold"
                            >
                                Sauvegarder Brouillon
                            </Button>
                            <Button 
                                onClick={() => handleSave('completed')}
                                disabled={loading}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 px-4 rounded-lg font-bold"
                            >
                                Finaliser & Verrouiller
                            </Button>
                        </>
                    )}

                    <Button 
                        onClick={handleDeleteMeeting}
                        disabled={loading}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-8 px-4 rounded-lg font-bold flex items-center gap-1.5"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Supprimer
                    </Button>
                </div>"""

detail_content = detail_content.replace(header_target, header_replacement)
detail_content = scale_up_font_sizes(detail_content)

with open('src/components/features/team-management/OneOnOneDetailView.tsx', 'w', encoding='utf-8') as f:
    f.write(detail_content)
print("Updated OneOnOneDetailView.tsx")

# 3. Update ComplaintsClientPage.tsx
with open('src/components/features/team-management/ComplaintsClientPage.tsx', 'r', encoding='utf-8') as f:
    comp_content = f.read()
comp_content = scale_up_font_sizes(comp_content)
with open('src/components/features/team-management/ComplaintsClientPage.tsx', 'w', encoding='utf-8') as f:
    f.write(comp_content)
print("Updated ComplaintsClientPage.tsx")

# 4. Update SettingsClientPage.tsx
with open('src/components/features/team-management/SettingsClientPage.tsx', 'r', encoding='utf-8') as f:
    settings_content = f.read()
settings_content = scale_up_font_sizes(settings_content)
with open('src/components/features/team-management/SettingsClientPage.tsx', 'w', encoding='utf-8') as f:
    f.write(settings_content)
print("Updated SettingsClientPage.tsx")
