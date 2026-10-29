import * as FileSystem from 'expo-file-system';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';

export interface UploadResult {
  url?: string;
  path?: string;
  size?: string;
  error?: string;
}

function extensionFor(uri: string, mimeType?: string): string {
  const fromMime: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'application/pdf': 'pdf',
    'audio/m4a': 'm4a',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
    'audio/mpeg': 'mp3',
    'audio/webm': 'weba',
  };
  if (mimeType && fromMime[mimeType]) return fromMime[mimeType];
  const fromUri = uri.split('?')[0].split('.').pop()?.toLowerCase();
  return fromUri && fromUri.length <= 5 ? fromUri : 'bin';
}

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function publicUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

async function uploadToBucket(
  bucket: string,
  path: string,
  fileUri: string,
  mimeType: string
): Promise<UploadResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: 'Sign in again to upload.' };

  const endpoint = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
  try {
    const response = await FileSystem.uploadAsync(endpoint, fileUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': mimeType,
        'x-upsert': 'false',
      },
    });
    if (response.status < 200 || response.status >= 300) {
      let message = `Upload failed (${response.status}).`;
      try {
        const parsed = JSON.parse(response.body);
        if (parsed?.message) message = String(parsed.message);
      } catch {
        // keep the status-based message
      }
      return { error: message };
    }
    return { path };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Upload failed.' };
  }
}

export async function uploadListingPhoto(
  fileUri: string,
  userId: string,
  mimeType = 'image/jpeg'
): Promise<UploadResult> {
  if (!userId) return { error: 'Sign in again to upload photos.' };
  const path = `${userId}/${randomId()}.${extensionFor(fileUri, mimeType)}`;
  const result = await uploadToBucket('listing-photos', path, fileUri, mimeType);
  if (result.error) return result;
  return { path, url: publicUrl('listing-photos', path) };
}

export async function uploadAvatar(
  fileUri: string,
  userId: string,
  mimeType = 'image/jpeg'
): Promise<UploadResult> {
  if (!userId) return { error: 'Sign in again to upload a photo.' };
  const path = `${userId}/${randomId()}.${extensionFor(fileUri, mimeType)}`;
  const result = await uploadToBucket('avatars', path, fileUri, mimeType);
  if (result.error) return result;
  return { path, url: publicUrl('avatars', path) };
}

export async function uploadChatAttachment(
  fileUri: string,
  conversationId: string,
  mimeType = 'application/octet-stream'
): Promise<UploadResult> {
  if (!conversationId) return { error: 'Open a conversation first.' };
  const path = `${conversationId}/${randomId()}.${extensionFor(fileUri, mimeType)}`;
  return uploadToBucket('chat-attachments', path, fileUri, mimeType);
}

/** Private ownership documents, readable only by the uploader and reviewers. */
export async function uploadVerificationDoc(
  fileUri: string,
  userId: string,
  mimeType = 'application/pdf',
  sizeBytes?: number
): Promise<UploadResult> {
  if (!userId) return { error: 'Sign in again to upload documents.' };
  const path = `${userId}/${randomId()}.${extensionFor(fileUri, mimeType)}`;
  let size: string | undefined;
  if (typeof sizeBytes === 'number' && sizeBytes > 0) {
    size =
      sizeBytes >= 1024 * 1024
        ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }
  const result = await uploadToBucket('verification-docs', path, fileUri, mimeType);
  if (result.error) return { ...result, size };
  return { path, size };
}

export async function signedAttachmentUrls(paths: string[]): Promise<Record<string, string>> {  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrls(paths, 60 * 60);
  if (error || !data) return {};
  const map: Record<string, string> = {};
  data.forEach((row) => {
    if (row.path && row.signedUrl) map[row.path] = row.signedUrl;
  });
  return map;
}
