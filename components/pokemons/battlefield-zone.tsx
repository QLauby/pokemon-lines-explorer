"use client"

import { lightenColor } from "@/lib/utils/colors-utils"
import { CustomTagData } from "@/types/types"
import { CustomTagsManager } from "../shared/custom-tags-manager"

interface BattlefieldZoneProps {
  battlefieldTags: CustomTagData[]
  playerSideTags: CustomTagData[]
  opponentSideTags: CustomTagData[]
  onUpdateBattlefieldTags: (tags: CustomTagData[]) => void
  onUpdatePlayerSideTags: (tags: CustomTagData[]) => void
  onUpdateOpponentSideTags: (tags: CustomTagData[]) => void
}

export function BattlefieldZone({
  battlefieldTags,
  playerSideTags,
  opponentSideTags,
  onUpdateBattlefieldTags,
  onUpdatePlayerSideTags,
  onUpdateOpponentSideTags,
}: BattlefieldZoneProps) {
  const playerBorderColor = lightenColor("#3B82F6", 40) // lightened blue-500
  const opponentBorderColor = lightenColor("#EF4444", 40) // lightened red-500

  return (
    <div className="mb-6 mx-auto md:w-2/3">
      {/* Main Terrain Container */}
      <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Battlefield</h3>
          <CustomTagsManager
            tags={battlefieldTags}
            onUpdateTags={onUpdateBattlefieldTags}
            fontSize={10}
            label={null}
          />
        </div>

        {/* Player and Opponent Sides */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Player Side */}
          <div
            className="border-2 rounded-lg p-3 bg-gray-50"
            style={{ borderColor: playerBorderColor }}
          >
            <h4 className="text-xs font-semibold mb-2" style={{ color: playerBorderColor }}>
              Player
            </h4>
            <CustomTagsManager
              tags={playerSideTags}
              onUpdateTags={onUpdatePlayerSideTags}
              fontSize={10}
              label={null}
            />
          </div>

          {/* Opponent Side */}
          <div
            className="border-2 rounded-lg p-3 bg-gray-50"
            style={{ borderColor: opponentBorderColor }}
          >
            <h4 className="text-xs font-semibold mb-2" style={{ color: opponentBorderColor }}>
              Opponent
            </h4>
            <CustomTagsManager
              tags={opponentSideTags}
              onUpdateTags={onUpdateOpponentSideTags}
              fontSize={10}
              label={null}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
