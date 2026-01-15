"use client"

import { Plus } from "lucide-react"
import { useEffect, useState } from "react"

import { CircularButton } from "./circular-button"
import { CustomTag } from "./custom-tag"

interface CustomTagsManagerProps {
  tags: string[]
  onUpdateTags: (newTags: string[]) => void
  height?: string | number
}

interface TagAnimationState {
  tag: string
  isEntering: boolean
  isExiting: boolean
}

export function CustomTagsManager({ tags, onUpdateTags, height }: CustomTagsManagerProps) {
  const [animatedTags, setAnimatedTags] = useState<TagAnimationState[]>([])

  useEffect(() => {
    const newAnimatedTags = tags.map((tag) => {
      const existingTag = animatedTags.find((at) => at.tag === tag)
      if (existingTag) {
        return existingTag
      }
      return { tag, isEntering: true, isExiting: false }
    })

    setAnimatedTags(newAnimatedTags)

    const newTags = newAnimatedTags.filter((at) => at.isEntering)
    if (newTags.length > 0) {
      setTimeout(() => {
        setAnimatedTags((prev) => prev.map((at) => (at.isEntering ? { ...at, isEntering: false } : at)))
      }, 10)
    }
  }, [tags])

  const handleAddTag = () => {
    const newTagNumber = tags.length + 1
    const newTag = `Tag ${newTagNumber}`
    onUpdateTags([...tags, newTag])
  }

  const handleUpdateTag = (index: number, newTag: string) => {
    const updatedTags = [...tags]
    updatedTags[index] = newTag
    onUpdateTags(updatedTags)
  }

  const handleDeleteTag = (index: number) => {
    const tagToDelete = tags[index]
    setAnimatedTags((prev) => prev.map((at) => (at.tag === tagToDelete ? { ...at, isExiting: true } : at)))

    setTimeout(() => {
      const updatedTags = tags.filter((_, i) => i !== index)
      onUpdateTags(updatedTags)
    }, 300)
  }

  return (
    <div className="mb-1">
      <div className="flex flex-wrap items-center gap-1 text-xs max-w-full">
        <span className="text-gray-600 mr-1">Autre :</span>
        {animatedTags.map((animatedTag, index) => {
          const tagIndex = tags.findIndex((tag) => tag === animatedTag.tag)
          if (tagIndex === -1) return null

          return (
            <div
              key={`${animatedTag.tag}-${index}`}
              className={`transition-all duration-300 ease-in-out ${
                animatedTag.isEntering
                  ? "opacity-0 -translate-x-2 scale-95"
                  : animatedTag.isExiting
                    ? "opacity-0 -translate-x-2 scale-95"
                    : "opacity-100 translate-x-0 scale-100"
              }`}
            >
              <CustomTag
                tag={animatedTag.tag}
                onUpdate={(newTag) => handleUpdateTag(tagIndex, newTag)}
                onDelete={() => handleDeleteTag(tagIndex)}
                height={height}
                defaultValue={`Tag ${tagIndex + 1}`}
                placeholder={`Tag ${tagIndex + 1}`}
              />
            </div>
          )
        })}
        <CircularButton
          isActive={false}
          onClick={handleAddTag}
          icon={Plus}
          activeColor=""
          inactiveColor="bg-gray-100 text-gray-400 hover:bg-gray-200"
          title="Ajouter un tag"
          diameter={Math.round((typeof height === "number" ? height : Number.parseFloat(height || "24") || 24) * 0.8)}
          iconRatio={0.6} // Ratio par défaut comme demandé
          variant="filled"
        />
      </div>
    </div>
  )
}
