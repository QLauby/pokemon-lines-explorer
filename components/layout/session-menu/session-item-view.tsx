'use client'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { CombatSession } from '@/types/types'
import { Copy, Edit2, MoreHorizontal, Trash2 } from 'lucide-react'
import { useState } from 'react'
import InlineRenameInput from './inline-rename-input'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

export default function SessionItemView({
  session,
  isActive,
  onSelect,
  onDelete,
  onDuplicate,
  onRename
}: {
  session: CombatSession
  isActive: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onRename: (id: string, name: string) => void
}) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleRenameSave = (newName: string) => {
    onRename(session.id, newName)
    setIsRenaming(false)
  }

  return (
    <>
      <div 
        className={`group flex items-center justify-between p-2 rounded-lg transition-all border ${
          isActive 
            ? 'bg-primary/5 border-primary shadow-sm' 
            : 'bg-white border-transparent hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
            <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer ${
                    isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
                onClick={() => onSelect(session.id)}
            >
                {session.name.substring(0, 2).toUpperCase()}
            </div>
            
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelect(session.id)}>
                {isRenaming ? (
                    <InlineRenameInput 
                        initialValue={session.name}
                        onSave={handleRenameSave}
                        onCancel={() => setIsRenaming(false)}
                        className="h-8"
                    />
                ) : (
                    <div className="flex flex-col">
                        <span className={`text-sm font-semibold truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>
                            {session.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                            {session.nodes.length} Nodes • {session.battleType === 'double' ? 'Double' : 'Simple'}
                        </span>
                    </div>
                )}
            </div>
        </div>

        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity"
                    aria-label="Session options"
                >
                    <MoreHorizontal className="h-4 w-4" />
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content 
                    className="min-w-[140px] bg-white rounded-md p-1 shadow-lg border border-border z-[100] animate-in fade-in zoom-in duration-200" 
                    sideOffset={5}
                    align="end"
                >
                    <DropdownMenu.Item 
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium cursor-pointer rounded-sm hover:bg-muted outline-none transition-colors"
                        onSelect={() => setIsRenaming(true)}
                    >
                        <Edit2 className="h-3.5 w-3.5" />
                        Rename
                    </DropdownMenu.Item>
                    <DropdownMenu.Item 
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium cursor-pointer rounded-sm hover:bg-muted outline-none transition-colors"
                        onSelect={() => onDuplicate(session.id)}
                    >
                        <Copy className="h-3.5 w-3.5" />
                        Duplicate
                    </DropdownMenu.Item>
                    
                    <DropdownMenu.Separator className="h-px bg-border my-1" />
                    
                    <DropdownMenu.Item 
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium cursor-pointer rounded-sm hover:bg-red-50 text-red-600 outline-none transition-colors"
                        onSelect={() => setShowDeleteConfirm(true)}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All data for "{session.name}" will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => onDelete(session.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
