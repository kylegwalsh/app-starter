import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

// Cache results forever
export const revalidate = false;

// Create a static GET handler (no real backend)
export const { staticGET: GET } = createFromSource(source);
