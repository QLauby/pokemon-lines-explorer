import { CustomTagData } from "@/types/types";

/**
 * Robust UUID-like ID generator
 */
export function generateTagId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
}

/**
 * Migrates old string tags to the new CustomTagData format
 */
export function migrateTags(tags: (string | CustomTagData)[] | undefined): CustomTagData[] {
  if (!tags) return [];
  return tags.map(tag => {
    if (typeof tag === 'string') {
        const splitIndex = tag.lastIndexOf(":");
        const namePart = splitIndex !== -1 ? tag.substring(0, splitIndex) : tag;
        const counterPart = splitIndex !== -1 ? parseInt(tag.substring(splitIndex + 1)) || 0 : 0;
        const hasCounter = splitIndex !== -1;
        return {
            id: generateTagId(),
            name: namePart,
            count: counterPart,
            showCount: hasCounter
        };
    }
    return tag;
  });
}
