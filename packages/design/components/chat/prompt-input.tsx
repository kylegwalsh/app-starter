'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/design/components/ui/dropdown-menu';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@repo/design/components/ui/input-group';
import { Spinner } from '@repo/design/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/design/components/ui/tooltip';
import { cn } from '@repo/design/lib/utils';
import type { ChatStatus, FileUIPart } from 'ai';
import { CornerDownLeftIcon, ImageIcon, PlusIcon, SquareIcon, XIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import type {
  ChangeEventHandler,
  ClipboardEventHandler,
  ComponentProps,
  FormEvent,
  FormEventHandler,
  HTMLAttributes,
  KeyboardEventHandler,
  PropsWithChildren,
} from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

// ============================================================================
// Provider
// ============================================================================

/** A staged attachment (its `url` is a local blob URL) */
export type PromptInputFile = FileUIPart & { id: string };

/** The staged attachments and how to change them */
export type PromptInputAttachments = {
  files: PromptInputFile[];
  add: (files: File[] | FileList) => void;
  remove: (id: string) => void;
  clear: () => void;
};

type PromptInputState = {
  text: { value: string; set: (value: string) => void; clear: () => void };
  attachments: PromptInputAttachments;
};

const PromptInputStateContext = createContext<PromptInputState | null>(null);

/** Reads the provider's state, which `PromptInput` requires */
const usePromptInputState = () => {
  const state = useContext(PromptInputStateContext);
  if (!state) {
    throw new Error('Wrap your component inside <PromptInputProvider>.');
  }
  return state;
};

/** The provider's attachments, for reading staged files outside the input (e.g. to upload them) */
export const useProviderAttachments = () => usePromptInputState().attachments;

/** Holds the input's text and attachments, so they survive the input unmounting */
export const PromptInputProvider = ({ children }: PropsWithChildren) => {
  const [text, setText] = useState('');
  const clearText = useCallback(() => setText(''), []);
  const [files, setFiles] = useState<PromptInputFile[]>([]);

  const add = useCallback((incoming: File[] | FileList) => {
    const staged = [...incoming].map((file) => ({
      filename: file.name,
      id: nanoid(),
      mediaType: file.type,
      type: 'file' as const,
      url: URL.createObjectURL(file),
    }));
    setFiles((prev) => [...prev, ...staged]);
  }, []);

  // Blob URLs are revoked here, outside the state updaters (which may run twice)
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const remove = useCallback((id: string) => {
    const found = filesRef.current.find((file) => file.id === id);
    if (found) {
      URL.revokeObjectURL(found.url);
    }
    setFiles((prev) => prev.filter((file) => file.id !== id));
  }, []);

  const clear = useCallback(() => {
    for (const file of filesRef.current) {
      URL.revokeObjectURL(file.url);
    }
    setFiles([]);
  }, []);

  // Revoke whatever is still staged when the provider unmounts
  useEffect(
    () => () => {
      for (const file of filesRef.current) {
        URL.revokeObjectURL(file.url);
      }
    },
    [],
  );

  const state = useMemo<PromptInputState>(
    () => ({
      text: { value: text, set: setText, clear: clearText },
      attachments: { files, add, remove, clear },
    }),
    [text, clearText, files, add, remove, clear],
  );

  return <PromptInputStateContext value={state}>{children}</PromptInputStateContext>;
};

// ============================================================================
// Input
// ============================================================================

/** The input's attachments, with validated adds and a way to open the file picker */
type PromptInputAttachmentsWithPicker = PromptInputAttachments & { openFileDialog: () => void };

const PromptInputAttachmentsContext = createContext<PromptInputAttachmentsWithPicker | null>(null);

/** The staged attachments, from inside `PromptInput` */
export const usePromptInputAttachments = () => {
  const attachments = useContext(PromptInputAttachmentsContext);
  if (!attachments) {
    throw new Error('usePromptInputAttachments must be used within a PromptInput');
  }
  return attachments;
};

export type PromptInputMessage = {
  text: string;
  files: FileUIPart[];
};

type PromptInputError = { code: 'max_files' | 'max_file_size' | 'accept'; message: string };

export type PromptInputProps = Omit<HTMLAttributes<HTMLFormElement>, 'onSubmit' | 'onError'> & {
  /** Accepted MIME types, e.g. `image/*,application/pdf` (any if unset) */
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  /** In bytes */
  maxFileSize?: number;
  /** Called when added files are rejected by the constraints above */
  onError?: (error: PromptInputError) => void;
  onSubmit: (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>,
  ) => void | Promise<void>;
};

/** Whether a file matches an `accept` attribute value */
const matchesAccept = (file: File, accept: string | undefined) => {
  const patterns = (accept ?? '')
    .split(',')
    .map((pattern) => pattern.trim())
    .filter(Boolean);
  if (patterns.length === 0) {
    return true;
  }
  return patterns.some((pattern) =>
    // e.g. image/* -> image/
    pattern.endsWith('/*') ? file.type.startsWith(pattern.slice(0, -1)) : file.type === pattern,
  );
};

/** A chat input form; must be inside a `PromptInputProvider`, which holds its state */
export const PromptInput = ({
  className,
  accept,
  multiple,
  maxFiles,
  maxFileSize,
  onError,
  onSubmit,
  children,
  ...props
}: PromptInputProps) => {
  const { text, attachments } = usePromptInputState();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  /** Stages the files that pass `accept`, `maxFileSize` and `maxFiles`, reporting the rest */
  const add = useCallback(
    (fileList: File[] | FileList) => {
      const incoming = [...fileList];
      const accepted = incoming.filter((file) => matchesAccept(file, accept));
      if (incoming.length > 0 && accepted.length === 0) {
        onError?.({ code: 'accept', message: 'No files match the accepted types.' });
        return;
      }
      const sized = accepted.filter((file) => !maxFileSize || file.size <= maxFileSize);
      if (accepted.length > 0 && sized.length === 0) {
        onError?.({ code: 'max_file_size', message: 'All files exceed the maximum size.' });
        return;
      }
      const capacity =
        maxFiles === undefined ? sized.length : Math.max(0, maxFiles - attachments.files.length);
      if (sized.length > capacity) {
        onError?.({ code: 'max_files', message: 'Too many files. Some were not added.' });
      }
      const capped = sized.slice(0, capacity);
      if (capped.length > 0) {
        attachments.add(capped);
      }
    },
    [accept, maxFileSize, maxFiles, onError, attachments],
  );

  // Accept files dropped on the form
  useEffect(() => {
    const form = formRef.current;
    if (!form) {
      return;
    }
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
      }
    };
    const onDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
      }
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        add(e.dataTransfer.files);
      }
    };
    form.addEventListener('dragover', onDragOver);
    form.addEventListener('drop', onDrop);
    return () => {
      form.removeEventListener('dragover', onDragOver);
      form.removeEventListener('drop', onDrop);
    };
  }, [add]);

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    if (event.currentTarget.files) {
      add(event.currentTarget.files);
    }
    // Reset so a file that was removed can be picked again
    event.currentTarget.value = '';
  };

  const context = useMemo<PromptInputAttachmentsWithPicker>(
    () => ({ ...attachments, add, openFileDialog: () => inputRef.current?.click() }),
    [attachments, add],
  );

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const files = attachments.files.map(({ id: _id, ...file }) => file);
    try {
      // Callers handle uploading or converting the files themselves
      await onSubmit({ files, text: text.value }, event);
      attachments.clear();
      text.clear();
    } catch {
      // Keep the input so the user can retry
    }
  };

  return (
    <PromptInputAttachmentsContext value={context}>
      <input
        accept={accept}
        aria-label="Upload files"
        className="hidden"
        multiple={multiple}
        onChange={handleChange}
        ref={inputRef}
        title="Upload files"
        type="file"
      />
      <form className={cn('w-full', className)} onSubmit={handleSubmit} ref={formRef} {...props}>
        <InputGroup className="overflow-hidden">{children}</InputGroup>
      </form>
    </PromptInputAttachmentsContext>
  );
};

export type PromptInputTextareaProps = ComponentProps<typeof InputGroupTextarea>;

export const PromptInputTextarea = ({
  onChange,
  onKeyDown,
  className,
  placeholder = 'What would you like to know?',
  ...props
}: PromptInputTextareaProps) => {
  const { text } = usePromptInputState();
  const attachments = usePromptInputAttachments();

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) {
      return;
    }

    // Enter submits (Shift+Enter is a newline, and Enter confirms an IME composition)
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      // Only submit when the submit button could (it's disabled, or a stop button while streaming)
      const { form } = e.currentTarget;
      const submitButton = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
      if (submitButton && !submitButton.disabled) {
        form?.requestSubmit();
      }
    }

    // Backspace in an empty input removes the last attachment
    if (e.key === 'Backspace' && e.currentTarget.value === '') {
      const last = attachments.files.at(-1);
      if (last) {
        e.preventDefault();
        attachments.remove(last.id);
      }
    }
  };

  const handlePaste: ClipboardEventHandler<HTMLTextAreaElement> = (event) => {
    const files = [...event.clipboardData.items]
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file) => file !== null);
    if (files.length > 0) {
      event.preventDefault();
      attachments.add(files);
    }
  };

  return (
    <InputGroupTextarea
      className={cn('field-sizing-content max-h-48 min-h-16', className)}
      name="message"
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      placeholder={placeholder}
      {...props}
      onChange={(e) => {
        text.set(e.currentTarget.value);
        onChange?.(e);
      }}
      value={text.value}
    />
  );
};

// ============================================================================
// Layout
// ============================================================================

export type PromptInputHeaderProps = Omit<ComponentProps<typeof InputGroupAddon>, 'align'>;

export const PromptInputHeader = ({ className, ...props }: PromptInputHeaderProps) => (
  <InputGroupAddon
    align="block-end"
    className={cn('order-first flex-wrap gap-1', className)}
    {...props}
  />
);

export type PromptInputFooterProps = Omit<ComponentProps<typeof InputGroupAddon>, 'align'>;

export const PromptInputFooter = ({ className, ...props }: PromptInputFooterProps) => (
  <InputGroupAddon
    align="block-end"
    className={cn('justify-between gap-1', className)}
    {...props}
  />
);

export type PromptInputToolsProps = HTMLAttributes<HTMLDivElement>;

export const PromptInputTools = ({ className, ...props }: PromptInputToolsProps) => (
  <div className={cn('flex min-w-0 items-center gap-1', className)} {...props} />
);

// ============================================================================
// Actions
// ============================================================================

export type PromptInputActionMenuProps = ComponentProps<typeof DropdownMenu>;

export const PromptInputActionMenu = (props: PromptInputActionMenuProps) => (
  <DropdownMenu {...props} />
);

export type PromptInputActionMenuTriggerProps = ComponentProps<typeof InputGroupButton> & {
  /** Shown above the button on hover */
  tooltip?: string;
};

export const PromptInputActionMenuTrigger = ({
  className,
  children,
  tooltip,
  variant = 'ghost',
  size = 'icon-sm',
  ...props
}: PromptInputActionMenuTriggerProps) => {
  const trigger = (
    <DropdownMenuTrigger asChild>
      <InputGroupButton
        aria-label={tooltip}
        className={className}
        size={size}
        type="button"
        variant={variant}
        {...props}
      >
        {children ?? <PlusIcon className="size-4" />}
      </InputGroupButton>
    </DropdownMenuTrigger>
  );
  if (!tooltip) {
    return trigger;
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  );
};

export type PromptInputActionMenuContentProps = ComponentProps<typeof DropdownMenuContent>;

export const PromptInputActionMenuContent = (props: PromptInputActionMenuContentProps) => (
  <DropdownMenuContent align="start" {...props} />
);

export type PromptInputActionAddAttachmentsProps = ComponentProps<typeof DropdownMenuItem> & {
  label?: string;
};

export const PromptInputActionAddAttachments = ({
  label = 'Add photos or files',
  ...props
}: PromptInputActionAddAttachmentsProps) => {
  const { openFileDialog } = usePromptInputAttachments();
  return (
    <DropdownMenuItem {...props} onSelect={openFileDialog}>
      <ImageIcon className="mr-2 size-4" /> {label}
    </DropdownMenuItem>
  );
};

export type PromptInputSubmitProps = ComponentProps<typeof InputGroupButton> & {
  status?: ChatStatus;
  onStop?: () => void;
};

export const PromptInputSubmit = ({
  className,
  variant = 'default',
  size = 'icon-sm',
  status,
  onStop,
  onClick,
  children,
  disabled,
  ...props
}: PromptInputSubmitProps) => {
  // Only `streaming` can be stopped: while `submitted` nothing has streamed yet, so there's no
  // partial reply to keep, and the button shows a spinner instead
  const canStop = status === 'streaming' && onStop !== undefined;

  let icon = <CornerDownLeftIcon className="size-4" />;
  if (status === 'submitted') {
    icon = <Spinner />;
  } else if (status === 'streaming') {
    icon = <SquareIcon className="size-4" />;
  } else if (status === 'error') {
    icon = <XIcon className="size-4" />;
  }

  return (
    <InputGroupButton
      aria-label={canStop ? 'Stop' : 'Submit'}
      className={className}
      disabled={disabled || status === 'submitted'}
      onClick={(e) => {
        if (!canStop) {
          onClick?.(e);
          return;
        }
        e.preventDefault();
        onStop();
      }}
      size={size}
      type={canStop ? 'button' : 'submit'}
      variant={variant}
      {...props}
    >
      {children ?? icon}
    </InputGroupButton>
  );
};
