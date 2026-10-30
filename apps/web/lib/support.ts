import { config } from '@repo/config';

declare global {
  // A `var` so we can create Crisp's command queue before its script loads (see
  // SupportChatInitializer). `is`/`get` only exist once Crisp has loaded.
  var $crisp:
    | {
        push(command: unknown): void;
        is?: (name: string) => boolean;
        get?: (name: string) => unknown;
      }
    | undefined;
}

/** Whether a support chat provider is configured */
export const isSupportChatEnabled = Boolean(config.crisp.websiteId);

/** Opens the support chat window (Crisp's launcher stays hidden, see app/layout.tsx) */
export const openSupportChat = () => {
  if (typeof $crisp === 'undefined') {
    return;
  }
  $crisp.push(['do', 'chat:show']);
  $crisp.push(['do', 'chat:open']);
};

/** Associates the signed-in user with their support chat session */
export const identifySupportUser = ({
  userId,
  email,
  name,
}: {
  userId: string;
  email?: string;
  name?: string;
}) => {
  if (typeof $crisp === 'undefined') {
    return;
  }
  $crisp.push(['set', 'session:data', ['user-id', userId]]);
  if (email) {
    $crisp.push(['set', 'user:email', [email]]);
  }
  if (name) {
    $crisp.push(['set', 'user:nickname', [name]]);
  }
};

/** Clears the support chat session so the next user doesn't see this user's conversation */
export const resetSupportSession = () => {
  if (typeof $crisp === 'undefined') {
    return;
  }
  $crisp.push(['do', 'session:reset']);
};
