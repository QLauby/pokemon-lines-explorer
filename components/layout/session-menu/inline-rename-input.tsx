'use client'

import React, { useEffect, useRef, useState } from 'react'

export default function InlineRenameInput({
  initialValue,
  onSave,
  onCancel,
  className,
  placeholder,
}: {
  initialValue: string
  onSave: (v: string) => void
  onCancel: () => void
  className?: string
  placeholder?: string
}) {
  const [value, setValue] = useState(initialValue ?? '')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const blurTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    setValue(initialValue ?? '')
  }, [initialValue])

  useEffect(() => {
    const el = inputRef.current
    if (el) {
      const attemptFocus = () => {
        if (document.contains(el)) {
          el.focus()
          el.select()

          if (document.activeElement !== el) {
            setTimeout(() => {
              if (document.contains(el)) {
                el.focus()
                el.select()
              }
            }, 50)
          }
        }
      }
      // Try to focus the input after a short delay
      const timer1 = setTimeout(attemptFocus, 150)

      return () => {
        clearTimeout(timer1)
        if (blurTimeoutRef.current) {
          clearTimeout(blurTimeoutRef.current)
          blurTimeoutRef.current = null
        }
      }
    }

    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
        blurTimeoutRef.current = null
      }
    }
  }, [])

  const commit = () => {
    const trimmed = (value ?? '').trim()
    if (!trimmed) {
      onCancel()
      return
    }
    if (trimmed === (initialValue ?? '').trim()) {
      onCancel()
      return
    }
    onSave(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
        blurTimeoutRef.current = null
      }
      commit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
        blurTimeoutRef.current = null
      }
      onCancel()
    }
  }

  const handleBlur = () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
    blurTimeoutRef.current = window.setTimeout(() => {
      blurTimeoutRef.current = null
      commit()
    }, 100)
  }

  const handleFocus = () => {
    // if focus comes back, cancel the pending blur->commit
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
  }

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={e => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder={placeholder ?? ''}
      className={`w-full rounded border border-input bg-background px-2 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ''}`}
    />
  )
}
