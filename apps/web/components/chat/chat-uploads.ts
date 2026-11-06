'use client';

import type { ChatFileMimeType } from '@repo/constants';
import { useProviderAttachments, type PromptInputMessage } from '@repo/design';
import { type QueryClient, queryOptions, useQueries } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { downscaleImage } from '@/lib/image';

type StagedFile = PromptInputMessage['files'][number];

/** A staged file uploaded to S3: the part to attach to a message, plus its bytes for local previews */
export type UploadedFile = {
  part: { type: 'file'; url: string; mediaType: string; filename: string };
  blob: Blob;
};

/** S3 upload failure that keeps the S3 error code so retries can check it */
class UploadError extends Error {
  readonly code: string | undefined;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'UploadError';
    this.code = code;
  }
}

/** Presigns an S3 upload, throwing on an error response */
const { mutationFn: createUploadUrl } = api.uploads['create-upload-url'].$post.mutationOptions();

/** Uploads one staged file: presign via the API, then POST it to S3 */
const uploadFile = async (staged: StagedFile): Promise<UploadedFile> => {
  const original = await fetch(staged.url).then((res) => res.blob());
  const blob = await downscaleImage(new Blob([original], { type: staged.mediaType }));
  const file = new File([blob], staged.filename ?? 'upload', { type: staged.mediaType });

  const presigned = await createUploadUrl({
    json: {
      fileName: file.name,
      // The prompt input only accepts allowed types, and the API validates it again
      fileType: file.type as ChatFileMimeType,
      fileSize: file.size,
    },
  });

  const formData = new FormData();
  for (const [key, value] of Object.entries(presigned.uploadFields)) {
    formData.append(key, String(value));
  }
  formData.append('file', file);

  const res = await fetch(presigned.uploadUrl, { method: 'POST', body: formData });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const code = body.match(/<Code>([^<]+)<\/Code>/)?.[1];
    throw new UploadError(`Failed to upload ${file.name} (${code ?? res.status})`, code);
  }

  return {
    part: { type: 'file', url: presigned.viewUrl, mediaType: file.type, filename: file.name },
    blob,
  };
};

/** One staged file's upload, keyed by its blob URL (unique per staged file) */
const uploadQueryOptions = (staged: StagedFile) =>
  queryOptions({
    queryKey: ['chat-upload', staged.url],
    queryFn: () => uploadFile(staged),
    // An upload isn't repeatable, so never refetch a finished one
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    // SST rotating Lambda STS credentials between signing and delivery causes a transient
    // SignatureDoesNotMatch, so retry just that
    retry: (failureCount, error) =>
      failureCount < 2 && error instanceof UploadError && error.code === 'SignatureDoesNotMatch',
    retryDelay: 0,
  });

/** Uploads each staged attachment as soon as it's added, returning their upload states */
export const useChatUploads = () => {
  const { files } = useProviderAttachments();
  const results = useQueries({ queries: files.map((file) => uploadQueryOptions(file)) });
  return {
    byUrl: new Map(files.map((file, index) => [file.url, results[index]])),
    isUploading: results.some((result) => result.isPending),
    hasError: results.some((result) => result.isError),
  };
};

/** The finished upload for a staged file, if it has uploaded */
export const getUploadedFile = (queryClient: QueryClient, staged: StagedFile) =>
  queryClient.getQueryData(uploadQueryOptions(staged).queryKey);
