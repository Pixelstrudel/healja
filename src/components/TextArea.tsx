import { ChangeEvent, useRef, useEffect } from 'react';

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function TextArea({
  value,
  onChange,
  placeholder = 'Share your thoughts...',
  className = '',
  disabled = false,
}: TextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full min-h-[150px] p-4 text-nord-0 dark:text-nord-6 bg-nord-6 dark:bg-nord-1 border border-nord-4 dark:border-nord-3 rounded-lg shadow-sm focus:ring-2 focus:ring-nord-10 focus:border-transparent resize-none transition-all duration-200 placeholder-nord-3 dark:placeholder-nord-4 ${className}`}
      style={{ overflow: 'hidden' }}
    />
  );
} 