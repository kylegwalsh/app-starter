'use client';

import { CHAT_ALLOWED_FILE_TYPES, CHAT_MAX_FILE_SIZE } from '@repo/constants';
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

import { useChatContext } from './chat-provider';

/** Attachment strip above the input — renders only when files are staged */
const AttachmentPreviews = () => {
  const { files, remove } = usePromptInputAttachments();
  const { attachmentUploads } = useChatContext();
  if (files.length === 0) {
    return null;
  }
  return (
    <PromptInputHeader className="px-3 pt-2 pb-1">
      <Attachments variant="inline">
        {files.map((file) => {
          const upload = attachmentUploads.get(file.url);
          return (
            <Attachment
              data={file}
              error={upload?.status === 'error' ? upload.error : null}
              key={file.id}
              loading={upload?.status === 'uploading'}
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
export const PromptInputBar = () => {
  const { status, isUploading, attachmentUploads, stop, handleSubmit } = useChatContext();
  // Block sending while attachments are still uploading or any are in an error state.
  // Shown as disabled rather than a loading spinner — the tile overlay already signals
  // "uploading", so the submit button doesn't need to duplicate that indicator.
  const hasUploadError = Array.from(attachmentUploads.values()).some((u) => u.status === 'error');
  const disableSend = isUploading || hasUploadError;

  return (
    <PromptInput
      accept={CHAT_ALLOWED_FILE_TYPES.join(',')}
      maxFileSize={CHAT_MAX_FILE_SIZE}
      multiple
      onSubmit={handleSubmit}
    >
      <AttachmentPreviews />
      <PromptInputTextarea className="min-h-10 pt-2 text-[13px]" placeholder="Ask anything..." />
      <PromptInputFooter className="px-2 pb-2">
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger tooltip="Attach files" />
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
