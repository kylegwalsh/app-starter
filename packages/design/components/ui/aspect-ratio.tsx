// biome-ignore lint/performance/noNamespaceImport: This won't impact performance
import * as AspectRatioPrimitive from '@radix-ui/react-aspect-ratio';
import type { ComponentProps } from 'react';

function AspectRatio({
  ...props
}: ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />;
}

export { AspectRatio };
