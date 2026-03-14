"use client"

import { Plus } from "lucide-react"
import { useEffect, useState } from "react"

import { CircularButton } from "./circular-button"
import { CustomTag } from "./custom-tag"

import { CustomTagData } from "@/types/types"

interface CustomTagsManagerProps {
  tags: CustomTagData[]
  onUpdateTags: (newTags: CustomTagData[]) => void
  fontSize?: string | number
  fontSizeRatio?: number
  label?: string | null
  readOnly?: boolean
}

interface TagAnimationState {
  id: string
  isEntering: boolean
  isExiting: boolean
}

export function CustomTagsManager({
  tags,
  onUpdateTags,
  fontSize = 10,
  fontSizeRatio = 0.5,
  label = "Custom :",
  readOnly = false,
}: CustomTagsManagerProps) {
  const [animatedTags, setAnimatedTags] = useState<TagAnimationState[]>([])

  useEffect(() => {
    setAnimatedTags((prev) => {
      const prevMap = new Map<string, TagAnimationState>()
      prev.forEach(at => prevMap.set(at.id, at))

      return tags.map((tag) => {
        const existing = prevMap.get(tag.id)
        if (existing) return existing
        return { id: tag.id, isEntering: true, isExiting: false }
      })
    })

    const timer = setTimeout(() => {
      setAnimatedTags((prev) => prev.map((at) => (at.isEntering ? { ...at, isEntering: false } : at)))
    }, 100)
    
    return () => clearTimeout(timer)
  }, [tags])

  const handleAddTag = () => {
    const newTag: CustomTagData = {
        id: crypto.randomUUID(),
        name: `Tag ${tags.length + 1}`,
        showCount: false,
        count: 0
    }
    onUpdateTags([...tags, newTag])
  }

  const handleUpdateTag = (index: number, newTag: CustomTagData) => {
    const updatedTags = [...tags]
    updatedTags[index] = newTag
    onUpdateTags(updatedTags)
  }

  const handleDeleteTag = (index: number) => {
    const tagToDelete = tags[index]
    setAnimatedTags((prev) => prev.map((at) => (at.id === tagToDelete.id ? { ...at, isExiting: true } : at)))

    setTimeout(() => {
      const updatedTags = tags.filter((_, i) => i !== index)
      onUpdateTags(updatedTags)
    }, 300)
  }

  return (
    <div className="">
      <div className="flex flex-wrap items-center gap-1 text-xs max-w-full">
        {label && <span className="text-gray-600 mr-1">{label}</span>}
        {animatedTags.map((animatedTag, index) => {
          const tagIndex = tags.findIndex((tag) => tag.id === animatedTag.id)
          if (tagIndex === -1) return null

          const tagData = tags[tagIndex]

          return (
            <div
              key={animatedTag.id}
              className={`transition-all duration-300 ease-in-out ${
                animatedTag.isEntering
                  ? "opacity-0 -translate-x-2 scale-95"
                  : animatedTag.isExiting
                    ? "opacity-0 -translate-x-2 scale-95"
                    : "opacity-100 translate-x-0 scale-100"
              }`}
            >
              <CustomTag
                tag={tagData}
                onUpdate={(newTag) => handleUpdateTag(tagIndex, newTag)}
                onDelete={() => handleDeleteTag(tagIndex)}
                fontSize={fontSize}
                fontSizeRatio={fontSizeRatio}
                defaultValue={`Tag ${tagIndex + 1}`}
                placeholder={`Tag ${tagIndex + 1}`}
                readOnly={readOnly}
              />
            </div>
          )
        })}
        {!readOnly && (
          <CircularButton
            isActive={false}
            onClick={handleAddTag}
            icon={Plus}
            activeColor=""
            inactiveColor="bg-gray-200 text-gray-600 hover:bg-gray-300"
            title="Ajouter un tag"
            diameter={Math.round((typeof fontSize === "number" ? fontSize : Number.parseFloat(fontSize as string) || 12) / 0.6 * 0.8)}
            iconRatio={0.7} // Ratio par défaut comme demandé
            variant="filled"
            readOnly={readOnly}
          />
        )}
      </div>
    </div>
  )
}
