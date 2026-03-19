"use client"

import { THEME } from "@/lib/constants/color-constants"
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
  const playerBorderColor = THEME.battlefield.side_border_ally
  const opponentBorderColor = THEME.battlefield.side_border_opponent

  return (
    <div className="mb-6 mx-auto md:w-2/3">
      {/* Main Terrain Container */}
      <div 
        className="border-2 rounded-lg p-4 bg-white"
        style={{ borderColor: THEME.battlefield.main_border }}
      >
        <div className="mb-3">
          <h3 className="text-sm font-semibold mb-2" style={{ color: THEME.battlefield.title_text }}>Battlefield</h3>
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
            className="border-2 rounded-lg p-3"
            style={{ borderColor: playerBorderColor, backgroundColor: THEME.battlefield.side_bg }}
          >
          <h4 className="text-xs font-semibold mb-2" style={{ color: THEME.battlefield.side_label_ally }}>
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
            className="border-2 rounded-lg p-3"
            style={{ borderColor: opponentBorderColor, backgroundColor: THEME.battlefield.side_bg }}
          >
          <h4 className="text-xs font-semibold mb-2" style={{ color: THEME.battlefield.side_label_opponent }}>
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
