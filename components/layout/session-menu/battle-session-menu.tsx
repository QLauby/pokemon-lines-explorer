'use client'

import { Button } from '@/components/ui/button'
import { THEME } from '@/lib/constants/color-constants'
import type { CombatSession } from '@/types/types'
import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { Layers, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import SessionItemView from './session-item-view'
import SortableSessionItem from './sortable-session-item'

interface BattleSessionMenuProps {
  isOpen: boolean
  onClose: () => void
  sessions: CombatSession[]
  currentSessionId: string | null
  setCurrentSessionId: (id: string | null) => void
  createSession: (name: string) => CombatSession
  deleteSession: (id: string) => void
  duplicateSession: (id: string) => CombatSession | null
  updateSessionName: (id: string, name: string) => void
  updateSessionsOrder: (newSessions: CombatSession[]) => void
}

export default function BattleSessionMenu({ 
  isOpen, 
  onClose,
  sessions,
  currentSessionId,
  setCurrentSessionId,
  createSession,
  deleteSession,
  duplicateSession,
  updateSessionName,
  updateSessionsOrder
}: BattleSessionMenuProps) {

  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null)
    const { active, over } = event
    
    if (over && active.id !== over.id) {
        const oldIndex = sessions.findIndex(s => s.id === active.id)
        const newIndex = sessions.findIndex(s => s.id === over.id)
        
        if (oldIndex !== -1 && newIndex !== -1) {
            updateSessionsOrder(arrayMove(sessions, oldIndex, newIndex))
        }
    }
  }

  const handleCreate = () => {
    if (sessions.length >= 100) {
        alert("Limit of 100 sessions reached.")
        return
    }
    const name = `Fight ${sessions.length + 1}`
    const session = createSession(name)
    setCurrentSessionId(session.id)
  }

  const handleSelect = (id: string) => {
    setCurrentSessionId(id)
    onClose()
  }

  // Handle ESC to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 w-screen h-screen bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar Drawer */}
      <div 
        className={`fixed inset-y-0 left-0 w-[340px] h-full bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out border-r border-border ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div 
          className="flex items-center justify-between p-6 border-b border-border"
          style={{ backgroundColor: `${THEME.session_menu.header_footer_bg}80` }}
        >
            <div className="flex items-center gap-2">
                <div className="p-2 bg-primary rounded-lg text-primary-foreground">
                    <Layers className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Sessions</h2>
                    <p className="text-xs text-muted-foreground">{sessions.length} / 100 battles</p>
                </div>
            </div>
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose} 
                className="rounded-full h-8 w-8 hover:bg-slate-200"
                style={{ backgroundColor: 'transparent' }}
            >
                <X className="h-4 w-4" />
            </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <SortableContext 
                    items={sessions.map(s => s.id)} 
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-2">
                        {sessions.map(session => (
                            <SortableSessionItem 
                                key={session.id} 
                                id={session.id}
                            >
                                <SessionItemView 
                                    session={session}
                                    isActive={session.id === currentSessionId}
                                    onSelect={handleSelect}
                                    onDelete={deleteSession}
                                    onDuplicate={duplicateSession}
                                    onRename={updateSessionName}
                                />
                            </SortableSessionItem>
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>

        <div 
            className="p-6 border-t border-border flex flex-col gap-3"
            style={{ backgroundColor: `${THEME.session_menu.header_footer_bg}80` }}
        >
            <Button 
                onClick={handleCreate} 
                disabled={sessions.length >= 100}
                className="w-full flex items-center justify-center gap-2 h-11 text-sm font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
                <Plus className="h-4 w-4" />
                New Battle Session
            </Button>
            <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-medium opacity-50">
                Pokémon Lines Explorer
            </p>
        </div>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${THEME.session_menu.scrollbar_thumb};
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${THEME.session_menu.scrollbar_hover};
        }
      `}</style>
    </>
  )
}
