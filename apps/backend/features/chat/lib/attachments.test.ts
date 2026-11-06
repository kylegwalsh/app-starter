import type { Sandbox } from '@daytonaio/sdk';
import type { FileUIPart, UIMessage } from 'ai';

import {
  copyUploadsToSandbox,
  listUploads,
  prepareAttachmentsForModel,
  routeAttachments,
  SANDBOX_UPLOADS_DIR,
} from './attachments';

const BUCKET_HOST = 'uploads.s3.amazonaws.com';

const mockStorage = vi.hoisted(() => ({
  // Keys only come from our bucket's host
  keyFromUrl: ({ url }: { url: URL }) =>
    url.hostname === 'uploads.s3.amazonaws.com' ? decodeURIComponent(url.pathname.slice(1)) : null,
  size: vi.fn<(args: { key: string }) => Promise<number | null>>(),
  read: vi.fn<(args: { key: string }) => Promise<{ data: Uint8Array; mediaType: string } | null>>(),
}));
vi.mock('@/services/storage', () => ({ storage: mockStorage }));

// Whether Daytona is configured, which tests can switch off
const mockSandboxManager = vi.hoisted(() => ({ isEnabled: true }));
vi.mock('@/services/daytona', () => ({ sandboxManager: mockSandboxManager }));

// ---------- Fixtures ----------
/** An attachment stored on our bucket */
const file = (filename: string, mediaType: string): FileUIPart => ({
  type: 'file',
  url: `https://${BUCKET_HOST}/org_1/${filename.replaceAll(' ', '_')}-${Math.random()}`,
  mediaType,
  filename,
});

const message = (...parts: UIMessage['parts']): UIMessage => ({
  id: `m-${Math.random()}`,
  role: 'user',
  parts,
});

const PDF = 'application/pdf';
const PNG = 'image/png';

/** Routes files of the given sizes (in bytes) */
const route = (files: FileUIPart[], sizes: Array<number | null>) =>
  routeAttachments(
    files.map((part) => ({ part })),
    sizes,
  );

// ---------- Tests ----------
describe('routeAttachments', () => {
  it('sends supported files within the limits to the model', () => {
    expect(route([file('a.pdf', PDF), file('b.png', PNG)], [1000, 1000])).toEqual([
      undefined,
      undefined,
    ]);
  });

  it('keeps unsupported types, oversized files and missing files from the model', () => {
    const files = [file('a.json', 'application/json'), file('b.pdf', PDF), file('c.png', PNG)];
    expect(route(files, [1000, 6_000_000, null])).toEqual(['type', 'size', 'missing']);
  });

  it('keeps the newest documents and images past the caps', () => {
    const pdfs = Array.from({ length: 6 }, (_, index) => file(`${index}.pdf`, PDF));
    expect(
      route(
        pdfs,
        pdfs.map(() => 1000),
      ),
    ).toEqual(['count', ...Array.from({ length: 5 }, () => {})]);

    const images = Array.from({ length: 21 }, (_, index) => file(`${index}.png`, PNG));
    expect(
      route(
        images,
        images.map(() => 1000),
      )[0],
    ).toBe('count');
  });

  it("doesn't count unreadable files against the caps", () => {
    const pdfs = Array.from({ length: 5 }, (_, index) => file(`${index}.pdf`, PDF));
    const big = file('big.pdf', PDF);
    expect(route([...pdfs, big], [...pdfs.map(() => 1000), 9_000_000])).toEqual([
      ...Array.from({ length: 5 }, () => {}),
      'size',
    ]);
  });
});

describe('listUploads', () => {
  it('gives each attachment a unique path, skipping files not on our bucket', () => {
    const uploads = listUploads([
      message(file('report.pdf', PDF), { type: 'text', text: 'hi' }),
      message(file('report.pdf', PDF), {
        type: 'file',
        url: 'https://example.com/x.pdf',
        mediaType: PDF,
      }),
    ]);
    expect(uploads.map((upload) => upload.sandboxPath)).toEqual([
      `${SANDBOX_UPLOADS_DIR}/report.pdf`,
      `${SANDBOX_UPLOADS_DIR}/report (2).pdf`,
    ]);
  });
});

describe('prepareAttachmentsForModel', () => {
  beforeEach(() => {
    mockStorage.size.mockReset().mockResolvedValue(1000);
    mockSandboxManager.isEnabled = true;
  });

  /** Each part's text, or its type for non-text parts */
  const describeParts = (parts: UIMessage['parts']) =>
    parts.map((part) => (part.type === 'text' ? part.text : part.type));

  it('replaces an unreadable attachment with a note giving its sandbox path', async () => {
    const [prepared] = await prepareAttachmentsForModel([
      message(file('data.json', 'application/json'), { type: 'text', text: 'Summarize this' }),
    ]);
    const [note, text] = describeParts(prepared.parts);
    expect(note).toContain(`isn't a format you can read directly`);
    expect(note).toContain(`${SANDBOX_UPLOADS_DIR}/data.json`);
    expect(text).toBe('Summarize this');
  });

  it('keeps a readable attachment and notes where code can find it', async () => {
    const [prepared] = await prepareAttachmentsForModel([message(file('report.pdf', PDF))]);
    const [kept, note] = describeParts(prepared.parts);
    expect(kept).toBe('file');
    expect(note).toContain(`${SANDBOX_UPLOADS_DIR}/report.pdf`);
  });

  it('says nothing about the sandbox when Daytona is disabled', async () => {
    mockSandboxManager.isEnabled = false;
    mockStorage.size.mockResolvedValueOnce(1000).mockResolvedValueOnce(9_000_000);
    const [prepared] = await prepareAttachmentsForModel([
      message(file('report.pdf', PDF), file('scan.pdf', PDF)),
    ]);
    const [kept, note] = describeParts(prepared.parts);
    expect(kept).toBe('file');
    expect(note).toContain('too large for you to read directly');
    expect(note).not.toMatch(/sandbox|code/);
    expect(prepared.parts).toHaveLength(2);
  });

  it('says when an attachment has expired', async () => {
    mockStorage.size.mockResolvedValue(null);
    const [prepared] = await prepareAttachmentsForModel([message(file('old.pdf', PDF))]);
    const parts = describeParts(prepared.parts);
    expect(parts).toHaveLength(1);
    expect(parts[0]).toContain('no longer available');
  });

  it('leaves messages without attachments untouched', async () => {
    const messages = [message({ type: 'text', text: 'Hello' })];
    await expect(prepareAttachmentsForModel(messages)).resolves.toBe(messages);
    expect(mockStorage.size).not.toHaveBeenCalled();
  });
});

describe('copyUploadsToSandbox', () => {
  /** A sandbox whose uploads folder holds `present` (or doesn't exist yet) */
  const fakeSandbox = (present?: string[]) => {
    const fs = {
      listFiles: vi.fn<(path: string) => Promise<Array<{ name: string }>>>(async () => {
        if (!present) {
          throw new Error('No such directory');
        }
        return present.map((name) => ({ name }));
      }),
      createFolder: vi.fn<(path: string, mode: string) => Promise<void>>(async () => {}),
      uploadFile: vi.fn<(file: Buffer, path: string) => Promise<void>>(async () => {}),
    };
    // Only the file-system methods are used
    return { sandbox: { fs } as unknown as Sandbox, fs };
  };

  beforeEach(() => {
    mockStorage.read
      .mockReset()
      .mockResolvedValue({ data: new Uint8Array([1]), mediaType: 'application/json' });
  });

  it('copies only the attachments not already in the sandbox', async () => {
    const { sandbox, fs } = fakeSandbox(['a.json']);
    await copyUploadsToSandbox(sandbox, [
      message(file('a.json', 'application/json'), file('b.zip', 'application/zip')),
    ]);
    expect(fs.uploadFile).toHaveBeenCalledOnce();
    expect(fs.uploadFile).toHaveBeenCalledWith(expect.any(Buffer), `${SANDBOX_UPLOADS_DIR}/b.zip`);
  });

  it('creates the uploads folder on first use', async () => {
    const { sandbox, fs } = fakeSandbox();
    await copyUploadsToSandbox(sandbox, [message(file('a.json', 'application/json'))]);
    expect(fs.createFolder).toHaveBeenCalledWith(SANDBOX_UPLOADS_DIR, '755');
    expect(fs.uploadFile).toHaveBeenCalledOnce();
  });

  it('skips an attachment that can no longer be read', async () => {
    mockStorage.read.mockRejectedValueOnce(new Error('NoSuchKey'));
    const { sandbox, fs } = fakeSandbox([]);
    await copyUploadsToSandbox(sandbox, [
      message(file('gone.json', 'application/json'), file('here.json', 'application/json')),
    ]);
    expect(fs.uploadFile).toHaveBeenCalledOnce();
  });

  it("doesn't touch the sandbox when there are no attachments", async () => {
    const { sandbox, fs } = fakeSandbox([]);
    await copyUploadsToSandbox(sandbox, [message({ type: 'text', text: 'Hello' })]);
    expect(fs.listFiles).not.toHaveBeenCalled();
  });
});
