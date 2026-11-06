'use client';

import { MessageAction } from '@repo/design/components/chat/message';
import { Button } from '@repo/design/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/design/components/ui/popover';
import { Textarea } from '@repo/design/components/ui/textarea';
import { SendIcon, ThumbsDownIcon, ThumbsUpIcon } from 'lucide-react';
import { useState } from 'react';

/** Saves a rating, and an optional comment for thumbs-down, on a message */
export type FeedbackHandler = (messageId: string, rating: 'up' | 'down', comment?: string) => void;

export type FeedbackButtonsProps = {
  /** The message being rated */
  messageId: string;
  /** Saved rating (`true` is thumbs-up) */
  existingFeedback: boolean | null;
  /** Called when the user rates the message */
  onFeedback: FeedbackHandler;
};

/** Thumbs-up / thumbs-down with a comment popover on thumbs-down */
export const FeedbackButtons = ({
  messageId,
  existingFeedback,
  onFeedback,
}: FeedbackButtonsProps) => {
  const [localFeedback, setLocalFeedback] = useState<boolean | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [comment, setComment] = useState('');
  const feedback = localFeedback ?? existingFeedback;
  const submitted = feedback !== null;

  const handleThumbsUp = () => {
    setLocalFeedback(true);
    onFeedback(messageId, 'up');
  };

  const handleSubmitNegative = () => {
    setLocalFeedback(false);
    onFeedback(messageId, 'down', comment.trim() || undefined);
    setPopoverOpen(false);
    setComment('');
  };

  // Once rated, only the chosen (filled) icon stays
  const showThumbsUp = !submitted || feedback === true;
  const showThumbsDown = !submitted || feedback === false;

  return (
    <>
      {showThumbsUp && (
        <MessageAction
          className={feedback === true ? 'text-primary' : undefined}
          disabled={submitted}
          label="Helpful"
          onClick={handleThumbsUp}
          tooltip="Helpful"
        >
          <ThumbsUpIcon className={feedback === true ? 'size-3 fill-current' : 'size-3'} />
        </MessageAction>
      )}

      {showThumbsDown && (
        <Popover onOpenChange={setPopoverOpen} open={popoverOpen}>
          <PopoverTrigger asChild>
            <MessageAction
              disabled={submitted}
              label="Not helpful"
              onClick={() => setPopoverOpen(true)}
              tooltip="Not helpful"
            >
              <ThumbsDownIcon className={feedback === false ? 'size-3 fill-current' : 'size-3'} />
            </MessageAction>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-3" side="top">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium">How could this response be improved?</p>
              <Textarea
                className="min-h-16 resize-none text-xs"
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional feedback..."
                rows={2}
                value={comment}
              />
              <div className="flex justify-end">
                <Button onClick={handleSubmitNegative} size="sm">
                  <SendIcon className="size-3" />
                  Submit
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </>
  );
};
