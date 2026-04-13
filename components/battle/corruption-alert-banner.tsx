"use client"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { useCorruptionHandler } from "@/lib/hooks/tree-corruption/use-corruption-handler"
import { THEME } from "@/lib/constants/color-constants"
import { AlertTriangle, Info } from "lucide-react"
import { useMemo, useState } from "react"

interface CorruptionAlertBannerProps {
  // onCommit and onCancel are no longer needed as props, handled by context
  onCommit?: any 
  onCancel?: any
}

export function CorruptionAlertBanner({ }: CorruptionAlertBannerProps) {
  const { 
      isCorrupted, 
      corruptionMessage, 
      confirmModification, 
      cancelModification,
      pendingModification,
      corruptedNodeIds,
      originalSession
  } = useCorruptionHandler()
  
  const [confirmMode, setConfirmMode] = useState<'prune' | 'reset' | null>(null)
  
  const turnsToDeleteCount = useMemo(() => {
    if (!confirmMode) return 0
    if (confirmMode === 'reset') return originalSession.nodes.length
    return corruptedNodeIds.length
  }, [confirmMode, corruptedNodeIds.length, originalSession.nodes.length])
  
  if (!isCorrupted || !pendingModification) return null

  // Determine severity or type for styling if needed
  const isDestructive = pendingModification.type === 'DELETE_POKEMON'

  return (
    <>
      <Card 
      className="mb-4 shadow-sm border transition-colors duration-200"
      style={{ 
          backgroundColor: THEME.common.opponent_bg, 
          borderColor: THEME.common.opponent_bg_tint,
      }}
    >
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2" style={{ color: THEME.common.opponent_text }}>
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold tracking-tight">
                Conflict Detected
            </h3>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            {corruptionMessage}
          </p>
          <div className="flex gap-2 mt-2">
              {isDestructive && <Badge variant="destructive">Destructive Action</Badge>}
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline" size="sm" onClick={cancelModification}>
            Cancel
          </Button>
          <Button variant="default" size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setConfirmMode('prune')}>
            Confirm & Prune
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setConfirmMode('reset')}>
            Reset All
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={!!confirmMode} onOpenChange={(open) => !open && setConfirmMode(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-xl">
              {confirmMode === 'reset' ? 'Reset Entire Tree?' : 'Prune Conflicting Turns?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              {confirmMode === 'reset' ? (
                <>
                  This action will <strong>delete all {turnsToDeleteCount} turns</strong> currently in the battle tree. 
                  The simulation will be completely reset to the initial state.
                </>
              ) : (
                <>
                  This will <strong>delete {turnsToDeleteCount} descendant turn(s)</strong> that are no longer consistent with the new state.
                </>
              )}
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg flex gap-2 border border-slate-100 dark:border-slate-800">
                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-500">This action is irreversible. Make sure you want to proceed.</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (confirmMode) confirmModification(confirmMode)
                setConfirmMode(null)
              }}
              className={confirmMode === 'reset' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {confirmMode === 'reset' ? 'Delete Everything' : 'Confirm Pruning'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
