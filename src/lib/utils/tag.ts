import { Tag } from '@/lib/db';

export function getTagColorSync(tagName: string, tags: Tag[]): string {
  const tag = tags.find(t => t.name === tagName);
  return tag?.color || '#4C566A'; // Default color if tag not found
}

export function getTagTextColor(backgroundColor: string): string {
  return backgroundColor.startsWith('#e5e9f0') ? '#2e3440' : '#e5e9f0';
} 