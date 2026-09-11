import "server-only";
import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export const MEDIA_FOLDER = "nuvora";

export function cloudinaryConfigured() {
  return Boolean(cloudName && apiKey && apiSecret);
}

export interface SignedUploadParams {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  uploadUrl: string;
}

/**
 * Signs an upload request server-side. The API secret is only ever used here to
 * compute the signature — the browser receives the signature and never the secret.
 */
export function signUploadParams(folder = MEDIA_FOLDER): SignedUploadParams {
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, apiSecret);

  return {
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
  };
}

export async function destroyAsset(publicId: string) {
  if (!cloudinaryConfigured()) throw new Error("CLOUDINARY_NOT_CONFIGURED");
  return cloudinary.uploader.destroy(publicId, { invalidate: true });
}

export interface MediaAsset {
  publicId: string;
  url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  createdAt: string;
}

export async function listAssets(nextCursor?: string, folder = MEDIA_FOLDER) {
  if (!cloudinaryConfigured()) throw new Error("CLOUDINARY_NOT_CONFIGURED");
  const res = await cloudinary.search
    .expression(`folder:${folder}/*`)
    .sort_by("created_at", "desc")
    .max_results(60)
    .next_cursor(nextCursor as string)
    .execute();

  const resources = (res.resources ?? []) as Array<Record<string, unknown>>;
  const assets: MediaAsset[] = resources.map((r) => ({
    publicId: String(r.public_id),
    url: String(r.secure_url),
    format: String(r.format ?? ""),
    width: Number(r.width ?? 0),
    height: Number(r.height ?? 0),
    bytes: Number(r.bytes ?? 0),
    createdAt: String(r.created_at ?? ""),
  }));

  return { assets, nextCursor: (res.next_cursor as string | undefined) ?? null };
}

export { cloudinary };
