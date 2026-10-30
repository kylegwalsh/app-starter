'use client';

import { CHAT_FILE_TYPES, CHAT_MAX_FILE_SIZE, CHAT_SANDBOX_FILE_TYPES } from '@repo/constants';
import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from '@repo/design';
import { toast } from 'sonner';

import { useActiveChat, useChatContext } from './chat-provider';
import { useChatUploads } from './chat-uploads';

/** The input's `accept` list: files only code can open need the sandbox (set in `infra/web.ts`) */
const ACCEPTED_FILE_TYPES = Object.keys({
  ...CHAT_FILE_TYPES,
  ...(process.env.NEXT_PUBLIC_CODE_SANDBOX_ENABLED === 'true' ? CHAT_SANDBOX_FILE_TYPES : {}),
}).join(',');

/** Attachment strip above the input — renders only when files are staged */
const AttachmentPreviews: FC<{ uploads: ReturnType<typeof useChatUploads> }> = ({ uploads }) => {
  const { files, remove } = usePromptInputAttachments();
  if (files.length === 0) {
    return null;
  }
  return (
    <PromptInputHeader className="px-3 pt-2 pb-1">
      <Attachments>
        {files.map((file) => {
          const upload = uploads.byUrl.get(file.url);
          return (
            <Attachment
              data={file}
              error={upload?.error?.message ?? null}
              key={file.id}
              loading={upload?.isPending}
              onRemove={() => remove(file.id)}
            >
              <AttachmentPreview />
              <AttachmentInfo />
              <AttachmentRemove />
            </Attachment>
          );
        })}
      </Attachments>
    </PromptInputHeader>
  );
};

/** Prompt input bar with staged-attachment previews and the attach-file menu */
export const PromptInputBar: FC<{ disabled?: boolean }> = ({ disabled = false }) => {
  const { isStopping, isWaiting, sendMessage, stop } = useChatContext();
  const { status } = useActiveChat();
  const uploads = useChatUploads();
  // Block sending while attachments are uploading or failed, a response is generating elsewhere,
  // or a stop is still landing. Shown as disabled rather than a spinner — the tiles already signal
  // "uploading".
  const disableSend =
    disabled || isWaiting || isStopping || uploads.isUploading || uploads.hasError;

  return (
    <PromptInput
      accept={ACCEPTED_FILE_TYPES}
      maxFileSize={CHAT_MAX_FILE_SIZE}
      multiple
      // Files the input rejects (wrong type, too large) would otherwise vanish without a word
      onError={(error) => toast.error(error.message)}
      onSubmit={sendMessage}
    >
      <AttachmentPreviews uploads={uploads} />
      <PromptInputTextarea
        className="min-h-10 pt-2 text-[13px]"
        disabled={disabled}
        placeholder="Ask anything..."
      />
      <PromptInputFooter className="px-2 pb-2">
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger disabled={disabled} tooltip="Attach files" />
            <PromptInputActionMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
        </PromptInputTools>
        <PromptInputSubmit disabled={disableSend} onStop={stop} status={status} />
      </PromptInputFooter>
    </PromptInput>
  );
};
