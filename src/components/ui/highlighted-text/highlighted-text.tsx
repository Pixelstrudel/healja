interface HighlightedTextProps {
  text: string;
  searchQuery: string;
}

export function HighlightedText({ text, searchQuery }: HighlightedTextProps) {
  if (!searchQuery) return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === searchQuery.toLowerCase() ? (
          <span key={i} className="bg-nord-10/20 dark:bg-nord-10/30 text-nord-0 dark:text-nord-6 rounded px-0.5">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
} 