import { NextResponse } from "next/server";
import { guardAdmin } from "../../_lib/guard";
import { readJson, jsonError, serverError } from "@/app/api/_lib/http";
import { MEDIA_FOLDER, signUploadParams } from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_FOLDERS = new Set([
  MEDIA_FOLDER,
  `${MEDIA_FOLDER}/products`,
  `${MEDIA_FOLDER}/collections`,
  `${MEDIA_FOLDER}/variants`,
  `${MEDIA_FOLDER}/homepage`,
]);

export async function POST(req: Request) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  try {
    const body = (await readJson(req)) as { folder?: string } | null;
    const requested = body?.folder;
    // Folder is allowlisted so a signature can never be minted for an arbitrary path.
    const folder = requested && ALLOWED_FOLDERS.has(requested) ? requested : MEDIA_FOLDER;

    return NextResponse.json(signUploadParams(folder));
  } catch (err) {
    if (err instanceof Error && err.message === "CLOUDINARY_NOT_CONFIGURED") {
      return jsonError("Image uploads aren't configured. Add your Cloudinary keys to .env.local", 503);
    }
    return serverError("admin/upload/sign", err);
  }
}
