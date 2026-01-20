"use client"

import { Percent } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Pokemon, TreeNode } from "@/lib/types"
import { HealthBar } from "../pokemons/health-bar"

interface CurrentStateProps {
  selectedNode: TreeNode
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
}

export function CurrentState({ selectedNode, myTeam, enemyTeam }: CurrentStateProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>État Actuel</CardTitle>
          <Badge variant="outline">Probabilité: {selectedNode.cumulativeProbability.toFixed(1)}%</Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2 text-blue-600">Mon Équipe</h4>
              {myTeam.map((pokemon) => (
                <div key={pokemon.id} className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate mr-2" title={pokemon.name}>
                      {pokemon.name}
                    </span>
                    <span
                      className={
                        pokemon.hpPercent === 0
                          ? "text-red-500 font-bold"
                          : pokemon.hpPercent < 25
                            ? "text-orange-500"
                            : ""
                      }
                    >
                      {pokemon.hpPercent.toFixed(1)}%
                    </span>
                  </div>
                  <HealthBar hpPercent={pokemon.hpPercent} showText={false} />
                </div>
              ))}
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-red-600">Équipe Adverse</h4>
              {enemyTeam.map((pokemon) => (
                <div key={pokemon.id} className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate mr-2" title={pokemon.name}>
                      {pokemon.name}
                    </span>
                    <span
                      className={
                        pokemon.hpPercent === 0
                          ? "text-red-500 font-bold"
                          : pokemon.hpPercent < 25
                            ? "text-orange-500"
                            : ""
                      }
                    >
                      {pokemon.hpPercent.toFixed(1)}%
                    </span>
                  </div>
                  <HealthBar hpPercent={pokemon.hpPercent} showText={false} />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedNode.id !== "root" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Action Réalisée</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{selectedNode.description}</p>
            <Badge variant="secondary" className="mt-2">
              <Percent className="h-4 w-4 mr-1" />
              {selectedNode.probability}%
            </Badge>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
