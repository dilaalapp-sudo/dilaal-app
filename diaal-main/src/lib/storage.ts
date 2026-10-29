import { supabase } from './supabase';

const EXT_BY_MIME: Record<string, string> = {
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

function extensionFor(file: File): string {
  const byMime = EXT_BY_MIME[file.type];
  if (byMime) return byMime;
  const fromName = file.name.split('.').pop()?.toLowerCase();
  return fromName && fromName.length <= 5 ? fromName : 'bin';
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface UploadResult {
  url?: string;
  path?: string;
  size?: string;
  error?: string;
}

export async function uploadListingPhoto(file: File, userId: string): Promise<UploadResult> {
  if (!userId) return { error: 'Sign in again to upload photos.' };
  const path = `${userId}/${randomId()}.${extensionFor(file)}`;
  const { error } = await supabase.storage
    .from('listing-photos')
    .upload(path, file, { contentType: file.type || 'image/jpeg', cacheControl: '31536000' });
  if (error) return { error: error.message };
  const { data } = supabase.storage.from('listing-photos').getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function uploadAvatar(file: File, userId: string): Promise<UploadResult> {
  if (!userId) return { error: 'Sign in again to upload a photo.' };
  const path = `${userId}/${randomId()}.${extensionFor(file)}`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { contentType: file.type || 'image/jpeg', cacheControl: '31536000' });
  if (error) return { error: error.message };
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/** Chat attachments live in a private bucket scoped to the conversation. */
export async function uploadChatAttachment(
  file: File,
  conversationId: string
): Promise<UploadResult> {
  if (!conversationId) return { error: 'Open a conversation first.' };
  const path = `${conversationId}/${randomId()}.${extensionFor(file)}`;
  const { error } = await supabase.storage
    .from('chat-attachments')
    .upload(path, file, { contentType: file.type || 'application/octet-stream' });
  if (error) return { error: error.message };
  return { path };
}

/** Private title-deed scans, surveys and licences reviewed by staff. */
export async function uploadVerificationDoc(file: File, userId: string): Promise<UploadResult> {
  if (!userId) return { error: 'Sign in again to upload documents.' };
  const path = `${userId}/${randomId()}.${extensionFor(file)}`;
  const size =
    file.size >= 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(file.size / 1024))} KB`;
  const { error } = await supabase.storage
    .from('verification-docs')
    .upload(path, file, { contentType: file.type || 'application/pdf' });
  if (error) return { error: error.message, size };
  return { path, size };
}

export async function signedAttachmentUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
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
