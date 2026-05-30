"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Trash2, Info } from "lucide-react"

interface ConfirmationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void
    loading?: boolean
    variant?: 'danger' | 'warning' | 'info'
}

export function ConfirmationDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmText = "Confirmer",
    cancelText = "Annuler",
    onConfirm,
    loading = false,
    variant = 'info'
}: ConfirmationDialogProps) {
    
    // Choose icon and color based on variant
    const getVariantConfig = () => {
        switch (variant) {
            case 'danger':
                return {
                    icon: <Trash2 className="h-6 w-6 text-rose-400" />,
                    iconBg: "bg-rose-950/30 border-rose-800/50",
                    confirmBtnClass: "bg-rose-600 hover:bg-rose-700 text-white border-rose-800"
                }
            case 'warning':
                return {
                    icon: <AlertTriangle className="h-6 w-6 text-amber-400" />,
                    iconBg: "bg-amber-950/30 border-amber-800/50",
                    confirmBtnClass: "bg-amber-600 hover:bg-amber-700 text-white border-amber-800"
                }
            case 'info':
            default:
                return {
                    icon: <Info className="h-6 w-6 text-blue-400" />,
                    iconBg: "bg-blue-950/30 border-blue-800/50",
                    confirmBtnClass: "bg-purple-600 hover:bg-purple-700 text-white border-purple-800"
                }
        }
    }

    const config = getVariantConfig()

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-[#16171e]/95 border border-zinc-800/80 backdrop-blur-md rounded-2xl shadow-2xl p-6 text-white overflow-hidden">
                <div className="flex gap-4 items-start pt-2">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center border shrink-0 ${config.iconBg}`}>
                        {config.icon}
                    </div>
                    <div className="space-y-1.5 flex-1">
                        <DialogTitle className="text-sm font-bold text-white uppercase tracking-wider">
                            {title}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400 text-xxs leading-relaxed font-normal">
                            {description}
                        </DialogDescription>
                    </div>
                </div>

                <DialogFooter className="mt-6 flex flex-row justify-end gap-3 border-t border-zinc-900/60 pt-4 -mx-6 -mb-6 bg-zinc-950/20 px-6 pb-6">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                        className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 text-xxs h-8 px-4 rounded-lg font-semibold"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        type="button"
                        onClick={() => {
                            onConfirm()
                        }}
                        disabled={loading}
                        className={`text-xxs h-8 px-4 rounded-lg font-bold shadow-md transition-all border ${config.confirmBtnClass}`}
                    >
                        {loading ? "Chargement..." : confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
