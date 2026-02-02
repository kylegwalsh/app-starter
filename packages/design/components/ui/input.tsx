import { cn } from '@repo/design/lib/utils';
import { useCallback } from 'react';

function Input({ className, type, value, onChange, ...props }: React.ComponentProps<'input'>) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (type === 'number' && onChange) {
        const inputValue = e.target.value;

        // Handle empty string - allow it to pass through (don't force to 0)
        // The parent component can decide how to handle empty values
        if (inputValue === '' || inputValue === null || inputValue === undefined) {
          onChange(e);
          return;
        }

        // Remove leading zeros (except for "0" itself or decimals like "0.5")
        // This handles cases like "040" -> "40", "00" -> "0", but preserves "0.5"
        let normalized = inputValue;
        if (normalized.length > 1 && normalized.startsWith('0') && normalized[1] !== '.') {
          normalized = normalized.replace(/^0+/, '') || '0';
        }

        // Only update if the normalized value differs from the input value
        if (normalized !== inputValue) {
          // Create a synthetic event with the normalized value
          const syntheticEvent = {
            ...e,
            target: { ...e.target, value: normalized },
          } as React.ChangeEvent<HTMLInputElement>;
          onChange(syntheticEvent);
          return;
        }
      }

      // Default behavior for non-number inputs or if no normalization needed
      onChange?.(e);
    },
    [type, onChange],
  );

  // For number inputs, show empty string when value is 0 for better UX
  const displayValue = type === 'number' && typeof value === 'number' && value === 0 ? '' : value;

  return (
    <input
      className={cn(
        'flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        className,
      )}
      data-slot="input"
      onChange={handleChange}
      type={type}
      value={displayValue}
      {...props}
    />
  );
}

export { Input };
