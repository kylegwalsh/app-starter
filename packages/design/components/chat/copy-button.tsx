'use client';

import { MessageAction } from '@repo/design/components/chat/message';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { useState } from 'react';

export type CopyButtonProps = {
  /** The text to copy */
  text: string;
};

/** Copies text to the clipboard with brief check-mark feedback */
export const CopyButton = ({ text }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <MessageAction label="Copy" onClick={handleCopy} tooltip="Copy">
      {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
    </MessageAction>
  );
};
