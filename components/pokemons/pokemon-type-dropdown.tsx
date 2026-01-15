"use client"

import { Check, ChevronsUpDown } from "lucide-react"
import * as React from "react"

import { StarBadgeIcon } from "@/assets/badges/star-badge"
import { PokemonType, pokemonTypeColors } from "@/lib/colors"
import { cn } from "@/lib/utils"
import Image from "next/image"

import bug from "@/assets/logos/pokemon-types/bug.svg"
import dark from "@/assets/logos/pokemon-types/dark.svg"
import dragon from "@/assets/logos/pokemon-types/dragon.svg"
import electric from "@/assets/logos/pokemon-types/electric.svg"
import fairy from "@/assets/logos/pokemon-types/fairy.svg"
import fighting from "@/assets/logos/pokemon-types/fighting.svg"
import fire from "@/assets/logos/pokemon-types/fire.svg"
import flying from "@/assets/logos/pokemon-types/flying.svg"
import ghost from "@/assets/logos/pokemon-types/ghost.svg"
import grass from "@/assets/logos/pokemon-types/grass.svg"
import ground from "@/assets/logos/pokemon-types/ground.svg"
import ice from "@/assets/logos/pokemon-types/ice.svg"
import normal from "@/assets/logos/pokemon-types/normal.svg"
import poison from "@/assets/logos/pokemon-types/poison.svg"
import psychic from "@/assets/logos/pokemon-types/psychic.svg"
import rock from "@/assets/logos/pokemon-types/rock.svg"
import steel from "@/assets/logos/pokemon-types/steel.svg"
import stellar from "@/assets/logos/pokemon-types/stellar.svg"
import water from "@/assets/logos/pokemon-types/water.svg"

const typeIcons: Record<PokemonType, any> = {
  bug, dark, dragon, electric, fairy, fighting, fire, flying, ghost,
  grass, ground, ice, normal, poison, psychic, rock, steel, stellar, water
}

interface PokemonTypeDropdownProps {
  selectedType: PokemonType | null
  onSelect: (type: PokemonType | null) => void
  includeNull?: boolean
  className?: string
  variant?: "circle" | "tera"
}

const BadgeContainer = ({
  variant = "circle",
  color,
  children,
}: {
  variant?: "circle" | "tera"
  color: string
  children: React.ReactNode
}) => {
  return (
    <div className="relative w-5 h-5 shrink-0 flex items-center justify-center">
      {variant === "tera" ? (
        <StarBadgeIcon className="absolute inset-0 w-full h-full" style={{ color: color }} />
      ) : (
        <div
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      <div
        className={cn(
          "relative z-10 flex items-center justify-center w-full h-full pt-[1px]",
          variant === "tera" && "scale-[0.65]",
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function PokemonTypeDropdown({ selectedType, onSelect, includeNull, className, variant = "circle" }: PokemonTypeDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const currentIcon = selectedType ? typeIcons[selectedType] : null
  const currentColor = selectedType ? pokemonTypeColors[selectedType] : "#d1d5db" // gray-300 for None

  return (
    <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-md border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors bg-white min-w-[32px] justify-center"
        type="button"
      >
        {selectedType ? (
          <BadgeContainer variant={variant} color={currentColor}>
            <Image src={currentIcon} alt={selectedType} width={12} height={12} className="brightness-0 invert" />
          </BadgeContainer>
        ) : (
          <BadgeContainer variant={variant} color={currentColor}>
            <span className="text-white text-xs font-bold">-</span>
          </BadgeContainer>
        )}
        <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-[160px] bg-white rounded-md shadow-lg py-1 max-h-[300px] overflow-auto border border-gray-200 left-0">
          {(includeNull || true) && (
            <button
              onClick={() => {
                onSelect(null)
                setIsOpen(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100"
            >
              <BadgeContainer variant={variant} color="#d1d5db">
                <span className="text-white text-xs font-bold">-</span>
              </BadgeContainer>
              <span>None</span>
              {selectedType === null && <Check className="ml-auto h-4 w-4 shrink-0" />}
            </button>
          )}
          {Object.entries(typeIcons).map(([type, icon]) => (
            <button
              key={type}
              onClick={() => {
                onSelect(type as PokemonType)
                setIsOpen(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100"
            >
              <BadgeContainer variant={variant} color={pokemonTypeColors[type as PokemonType]}>
                  <Image src={icon} alt={type} width={12} height={12} className="brightness-0 invert" />
              </BadgeContainer>
              <span className="capitalize truncate">{type}</span>
              {selectedType === type && <Check className="ml-auto h-4 w-4 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
