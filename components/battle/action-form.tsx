"use client"

import { ChevronDown, Plus, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { TypeLiseret } from "@/components/shared/type-liseret"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Pokemon, TreeNode } from "@/lib/types"

interface ActionFormProps {
  selectedNodeId: string
  nodes: Map<string, TreeNode>
  hpChanges: { pokemonId: string; value: number; isHealing: boolean }[]
  onHpChangesChange: (changes: { pokemonId: string; value: number; isHealing: boolean }[]) => void
  onAddAction: () => void
  activePokemon: { pokemon: Pokemon; isAlly: boolean }[]
}

export function ActionForm({
  selectedNodeId,
  nodes,
  hpChanges,
  onHpChangesChange,
  onAddAction,
  activePokemon,
}: ActionFormProps) {
  const addHpChange = () => {
    onHpChangesChange([...hpChanges, { pokemonId: "", value: 0, isHealing: false }])
  }

  const updateHpChange = (index: number, field: "pokemonId" | "value" | "isHealing", value: string | number | boolean) => {
    const updated = [...hpChanges]
    updated[index] = { ...updated[index], [field]: value }
    onHpChangesChange(updated)
  }



  const removeHpChange = (index: number) => {
    onHpChangesChange(hpChanges.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      <style jsx global>{`
        .custom-select-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-select-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-select-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
      
      {nodes.get(selectedNodeId) && (
        <div className="flex items-center gap-2 mb-4">
           <span className="text-sm text-gray-500">Depuis :</span>
           <Badge variant="secondary" className="font-medium px-3 py-1">
             {nodes.get(selectedNodeId)!.description} ({nodes.get(selectedNodeId)!.cumulativeProbability.toFixed(1)}%)
           </Badge>
        </div>
      )}
      
      <div className="space-y-6">

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Hp Changes</Label>
            <Button variant="outline" size="sm" onClick={addHpChange} className="cursor-pointer">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {hpChanges.map((change, index) => (
            <div key={index} className="flex gap-2 items-center mb-4 relative">
              {/* Custom Pokemon Selector */}
              <div className="relative flex-1 min-w-[200px]">
                <PokemonSelector
                  currentId={change.pokemonId}
                  activePokemon={activePokemon}
                  onSelect={(id) => updateHpChange(index, "pokemonId", id)}
                />
              </div>
              <div className="flex items-center gap-1">
                  <Button 
                    type="button"
                    variant={change.isHealing ? "default" : "secondary"}
                    size="icon" 
                    className={`w-8 h-10 font-bold transition-all flex-shrink-0 ${
                        change.isHealing 
                        ? "bg-green-600 hover:bg-green-700 text-white border-green-700" 
                        : "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                    }`}
                    onClick={() => {
                        const nextHealing = !change.isHealing;
                        updateHpChange(index, "isHealing", nextHealing);
                    }}
                  >
                    {change.isHealing ? "+" : "-"}
                  </Button>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="20"
                    value={change.value === 0 ? "" : change.value.toString()}
                    onChange={(e) => {
                        // Allow only numbers
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        const val = parseInt(raw, 10) || 0;
                        updateHpChange(index, "value", val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur()
                      }
                    }}
                    className="w-20 text-center font-bold text-lg h-10"
                  />
              </div>
              <div> % </div>
              <Button variant="ghost" size="sm" onClick={() => removeHpChange(index)} className="cursor-pointer">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button onClick={onAddAction} className="w-full cursor-pointer">
          End turn
        </Button>
      </div>
    </div>
  )
}

interface PokemonSelectorProps {
  currentId: string;
  activePokemon: { pokemon: Pokemon; isAlly: boolean }[];
  onSelect: (id: string) => void;
}

function PokemonSelector({ currentId, activePokemon, onSelect }: PokemonSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selected = activePokemon.find(ap => ap.pokemon.id === currentId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all ${
          isOpen ? "ring-2 ring-ring" : ""
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {selected ? (
            <>
              <TypeLiseret types={selected.pokemon.types} className="h-5" />
              <span className={`font-bold truncate ${selected.isAlly ? "text-blue-600" : "text-red-600"}`}>
                {selected.pokemon.name}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Select Pokemon</span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 opacity-50 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-[200px] overflow-y-auto p-1 custom-select-scrollbar">
            {activePokemon.map(({ pokemon, isAlly }) => {
              return (
                <div
                  key={pokemon.id}
                  onClick={() => {
                    onSelect(pokemon.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-2 rounded-sm px-2 py-2 text-sm cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground ${
                    currentId === pokemon.id ? "bg-accent" : ""
                  }`}
                >
                  <TypeLiseret types={pokemon.types} className="h-4" />
                  <span className={`flex-1 font-semibold ${isAlly ? "text-blue-600" : "text-red-600"}`}>
                    {pokemon.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
