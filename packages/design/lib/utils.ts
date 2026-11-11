import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merges class names into a single string */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
