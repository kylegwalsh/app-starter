'use client';

import { Shimmer } from '@repo/design/components/chat/shimmer';

/** "Thinking…" placeholder shown while waiting for the first assistant token */
export const ThinkingIndicator = () => (
  <div className="flex h-[calc(13px*1.65)] items-center text-[13px]">
    <Shimmer duration={1}>Thinking...</Shimmer>
  </div>
);
