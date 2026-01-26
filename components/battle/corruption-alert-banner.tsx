"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useCorruptionHandler } from "@/lib/hooks/tree-corruption/use-corruption-handler"
import { useCorruptionResolution } from "@/lib/hooks/tree-corruption/use-corruption-resolution"
import { CombatSession } from "@/types/types"
import { AlertTriangle } from "lucide-react"

interface CorruptionAlertBannerProps {
  onCommit: (newSession: CombatSession) => void
  onCancel: () => void
}

export function CorruptionAlertBanner({ onCommit, onCancel }: CorruptionAlertBannerProps) {
  const { isCorrupted, corruptedNodeIds } = useCorruptionHandler()
  
  const { confirmCorruption, cleanFullTree, cancel } = useCorruptionResolution({
      onCommit,
      onCancel
  })

  if (!isCorrupted) return null

  return (
    <Card className="border-red-400 bg-red-50 dark:bg-red-950/20">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
           <AlertTriangle className="h-5 w-5" />
           <CardTitle>Battle Tree Corrupted</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
         <p className="text-sm text-muted-foreground mb-3">
           Confirming this change will delete parts of the tree.
         </p>
         <Badge variant="destructive">
           {corruptedNodeIds.length} turns affected
         </Badge>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" onClick={cancel}>
           Cancel
        </Button>
        <Button variant="default" className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmCorruption}>
           Confirm
        </Button>
        <Button variant="destructive" onClick={cleanFullTree}>
           Clean full tree
        </Button>
      </CardFooter>
    </Card>
  )
}
