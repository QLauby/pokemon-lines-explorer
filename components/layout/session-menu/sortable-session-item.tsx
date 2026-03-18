'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import React from 'react'

export default function SortableSessionItem({
  id,
  children,
  disabled = false,
}: {
  id: string
  children: React.ReactNode
  disabled?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative'
  }

  return (
    <div ref={setNodeRef} style={style} className={`group flex items-center gap-2 ${isDragging ? 'opacity-50' : ''}`}>
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag session"
        className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
