
import { CircularButton } from "@/components/shared/circular-button"
import { getStatusInfo } from "@/lib/constants/logos-constants"
import { Pokemon } from "@/types/types"

interface PokemonCardDisplayStatusProps {
    pokemon: Pokemon
}

export function PokemonCardDisplayStatus({ pokemon }: PokemonCardDisplayStatusProps) {
  const statusInfos = []
  if (pokemon.status) {
    const info = getStatusInfo(pokemon.status)
    if (info) statusInfos.push(info)
  }
  if (pokemon.confusion) {
    const info = getStatusInfo("confusion")
    if (info) statusInfos.push(info)
  }
  if (pokemon.love) {
    const info = getStatusInfo("love")
    if (info) statusInfos.push(info)
  }

  if (statusInfos.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
       {statusInfos.map(info => {
           const counter = 
              (info.type === "sleep" && pokemon.showSleepCounter) ? pokemon.sleepCounter : 
              (info.type === "confusion" && pokemon.showConfusionCounter) ? pokemon.confusionCounter : 
              undefined;

           return (
              <div key={info.title} className="flex items-center">
                  <CircularButton
                      isActive={true}
                      onClick={() => {}}
                      icon={info.icon}
                      activeColor={info.activeColor}
                      title={info.title}
                      variant="filled"
                      diameter={14}
                      iconRatio={0.7}
                      readOnly={true}
                  />
                  {counter !== undefined && (
                      <div className="flex items-center">
                          <div 
                              className="font-medium text-gray-400 select-none flex items-center justify-center translate-y-[-0.5px]" 
                              style={{ fontSize: 8.5, height: 14.16, width: "8px" }}
                          >
                              :
                          </div>
                          <div 
                              className="font-medium text-gray-900 select-none flex items-center justify-center translate-y-[-0.5px]"
                              style={{ fontSize: 8.5, height: 14.16 }}
                          >
                              {counter}
                          </div>
                      </div>
                  )}
              </div>
           )
       })}
    </div>
  )
}
