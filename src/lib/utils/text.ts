export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD') // Normalize unicode characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s]/g, ' ') // Replace non-alphanumeric with spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
}

export function getWordSimilarity(text1: string, text2: string): number {
  const words1 = new Set(normalizeText(text1).split(' '));
  const words2 = new Set(normalizeText(text2).split(' '));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

export function getTextSimilarity(text1: string, text2: string): number {
  // Get both word-level and character-level similarity
  const wordSim = getWordSimilarity(text1, text2);
  
  // Get character-level similarity for catching typos and partial matches
  const norm1 = normalizeText(text1);
  const norm2 = normalizeText(text2);
  const maxLen = Math.max(norm1.length, norm2.length);
  const levenshtein = maxLen - levenshteinDistance(norm1, norm2);
  const charSim = levenshtein / maxLen;
  
  // Combine both metrics with more weight on word similarity
  return (wordSim * 0.7) + (charSim * 0.3);
}

// Levenshtein distance for character-level similarity
function levenshteinDistance(str1: string, str2: string): number {
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null));
  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  return track[str2.length][str1.length];
}

export function getMatchContext(text: string, searchQuery: string, contextLength: number = 100): string {
  if (!searchQuery) return text.slice(0, contextLength);
  
  const index = text.toLowerCase().indexOf(searchQuery.toLowerCase());
  if (index === -1) return text.slice(0, contextLength);
  
  const start = Math.max(0, index - contextLength / 2);
  const end = Math.min(text.length, index + searchQuery.length + contextLength / 2);
  
  let context = text.slice(start, end);
  if (start > 0) context = '...' + context;
  if (end < text.length) context = context + '...';
  
  return context;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  
  // For dates today, show time only
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  }
  
  // For dates yesterday, show "Yesterday"
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  }
  
  // For dates within the last week, show day name
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  if (date > oneWeekAgo) {
    return `${date.toLocaleDateString([], { weekday: 'long' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  }
  
  // For all other dates, show full date
  return date.toLocaleDateString([], { 
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
} 