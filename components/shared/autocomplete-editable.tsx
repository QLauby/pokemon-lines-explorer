"use client"

import { useCallback, useRef, useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EditableText, type EditableTextRef } from "./editable-text"
import { SuggestionList, type SuggestionItem } from "./suggestion-list"

interface AutocompleteEditableProps {
  /** Valeur actuelle du champ */
  value: string
  /** Callback lorsque la valeur est validée */
  onChange: (value: string) => void
  /** Fonction de recherche pour alimenter les suggestions */
  getSuggestions: (value: string) => SuggestionItem[]
  /** Callback riche lors de la sélection d'une suggestion */
  onSuggestionSelect?: (item: SuggestionItem) => void
  /** Équipe active pour la couleur de sélection (Ally vs Opponent) */
  isMyTeam?: boolean
  
  // Props héritées ou passées à EditableText pour la consistance visuelle
  placeholder?: string
  defaultValue?: string
  width?: string | number
  editWidth?: string | number
  autoWidth?: boolean
  fontSize?: string | number
  fontSizeRatio?: number
  fontWeight?: any
  textAlign?: "left" | "center" | "right"
  mode?: "text" | "button"
  className?: string
  readOnly?: boolean
  mainColor?: string
  tooltip?: React.ReactNode
}

/**
 * Wrapper intelligent autour de EditableText qui ajoute une liste de suggestions Showdown.
 * Il respecte totalement le comportement initial de EditableText tout en injectant
 * la logique d'autocomplete via une Popover.
 */
export function AutocompleteEditable({
  value,
  onChange,
  getSuggestions,
  onSuggestionSelect,
  isMyTeam = true,
  tooltip,
  ...editableProps
}: AutocompleteEditableProps) {
  // --- États locaux ---
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  
  // Référence vers l'instance de EditableText pour piloter son état interne
  const editableRef = useRef<EditableTextRef>(null)

  // --- Handlers ---
  const handleEditingValueChange = useCallback((val: string) => {
    // On ne cherche que si on a au moins 2 caractères
    if (val.length < 2) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    const filtered = getSuggestions(val)
    setSuggestions(filtered)
    setSelectedIndex(0)
    setIsOpen(filtered.length > 0)
  }, [getSuggestions])

  const handleSelect = useCallback((item: SuggestionItem) => {
    if (editableRef.current) {
      // On valide immédiatement avec la valeur de la suggestion choisie
      editableRef.current.finish(item.label)
    }
    
    // On appelle le callback riche (pour les types, etc.)
    onSuggestionSelect?.(item)
    setIsOpen(false)
  }, [onSuggestionSelect])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % suggestions.length)
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
        break
      case "Enter":
        if (suggestions[selectedIndex]) {
          // On empêche EditableText de finir prématurément avec le texte incomplet
          e.preventDefault()
          handleSelect(suggestions[selectedIndex])
        }
        break
      case "Escape":
        setIsOpen(false)
        break
    }
  }, [isOpen, suggestions, selectedIndex, handleSelect])

  const handleEditModeChange = useCallback((isEditing: boolean) => {
    if (!isEditing) setIsOpen(false)
  }, [])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="block w-full min-w-0">
          <EditableText
            {...editableProps}
            ref={editableRef}
            value={value}
            onChange={onChange}
            onEditingValueChange={handleEditingValueChange}
            onKeyDown={handleKeyDown}
            // On ferme la popover si on quitte le mode édition (ex: clic ailleurs)
            onEditModeChange={handleEditModeChange}
            tooltip={tooltip}
          />
        </div>
      </PopoverTrigger>
      
      <PopoverContent 
        className="p-0 border-none shadow-none w-auto bg-transparent" 
        align="start" 
        sideOffset={5}
        // Évite que la Popover prenne le focus, on veut rester sur l'input de EditableText pour continuer à taper
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SuggestionList
          items={suggestions}
          selectedIndex={selectedIndex}
          onSelect={handleSelect}
          onHover={setSelectedIndex}
          isMyTeam={isMyTeam}
        />
      </PopoverContent>
    </Popover>
  )
}
