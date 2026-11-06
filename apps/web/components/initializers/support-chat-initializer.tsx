'use client';

import { useSetAtom } from 'jotai';
import { useEffect } from 'react';

import { supportUnreadCountAtom } from '@/atoms/support';
import { isSupportChatEnabled } from '@/lib';

/** The Crisp events we listen to (Crisp allows only one handler per event, so they all live here) */
const CRISP_EVENTS = ['session:loaded', 'message:received', 'chat:opened', 'chat:closed'] as const;

/** Keeps Crisp's floating launcher hidden and tracks unread support replies */
export const SupportChatInitializer = () => {
  const setUnreadCount = useSetAtom(supportUnreadCountAtom);

  useEffect(() => {
    if (!isSupportChatEnabled) {
      return;
    }

    // The inline Crisp script in app/layout.tsx may not have run yet, so make sure the queue exists
    globalThis.$crisp ??= [];
    const crisp = globalThis.$crisp;
    const hideLauncher = () => $crisp?.push(['do', 'chat:hide']);
    // Crisp tracks unread replies across page loads, so we mirror its count
    const syncUnreadCount = () => {
      const count = $crisp?.get?.('chat:unread:count');
      setUnreadCount(typeof count === 'number' ? count : 0);
    };

    crisp.push(['on', 'session:loaded', syncUnreadCount]);
    // When we receive a response, make sure we add a badge to our support menu item
    crisp.push([
      'on',
      'message:received',
      () => {
        syncUnreadCount();
      },
    ]);
    // Crisp clears its own count just after this fires, so clear ours directly
    crisp.push(['on', 'chat:opened', () => setUnreadCount(0)]);
    crisp.push([
      'on',
      'chat:closed',
      () => {
        hideLauncher();
        syncUnreadCount();
      },
    ]);

    return () => {
      for (const event of CRISP_EVENTS) {
        $crisp?.push(['off', event]);
      }
    };
  }, [setUnreadCount]);

  // Don't render any UI elements
  return null;
};
