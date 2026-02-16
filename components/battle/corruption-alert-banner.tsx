"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { useCorruptionHandler } from "@/lib/hooks/tree-corruption/use-corruption-handler"
import { AlertTriangle } from "lucide-react"

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
      pendingModification 
  } = useCorruptionHandler()
  
  if (!isCorrupted || !pendingModification) return null

  // Determine severity or type for styling if needed
  const isDestructive = pendingModification.type === 'DELETE_POKEMON'

  return (
    <Card className="border-red-400 bg-red-50 dark:bg-red-950/20 mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
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
        <Button variant="outline" onClick={cancelModification}>
           Cancel
        </Button>
        <Button variant="default" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => confirmModification('prune')}>
           Confirm & Prune
        </Button>
        <Button variant="destructive" onClick={() => confirmModification('reset')}>
           Reset All
        </Button>
      </CardFooter>
    </Card>
  )
}
