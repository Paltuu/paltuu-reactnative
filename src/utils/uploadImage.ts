import client from '../api/client';

export interface PickedImage {
  uri: string;
  name: string;
  type: string;
}

/**
 * Uploads image(s) to S3 via the existing /social/upload endpoint and returns their public
 * URLs. That route resizes to max 1200px, re-encodes to JPEG, generates a blurhash and a
 * thumbnail, and stores everything in the paltuu-social bucket — so callers get an optimized
 * URL back rather than whatever multi-MB original the camera produced.
 *
 * Images only: the endpoint rejects video with a 415 (video needs the separate presigned-URL
 * + MediaConvert flow), which is why every caller here pins `mediaTypes: ['images']`.
 */
export async function uploadImagesToS3(images: PickedImage[]): Promise<string[]> {
  if (images.length === 0) return [];

  const formData = new FormData();
  images.forEach((img) => formData.append('files', img as any));

  const { data } = await client.post('/social/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return (data?.media ?? []).map((m: any) => m?.url).filter(Boolean) as string[];
}

/** Convenience wrapper for the common single-image case. Returns null if nothing came back. */
export async function uploadImageToS3(image: PickedImage): Promise<string | null> {
  const urls = await uploadImagesToS3([image]);
  return urls[0] ?? null;
}
