import { NextResponse } from "next/server";
import { z } from "zod";
import { guardAdmin } from "../../_lib/guard";
import { readJson, parseWith, jsonError, serverError } from "@/app/api/_lib/http";
import { destroyAsset, MEDIA_FOLDER } from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  publicId: z.string().trim().min(1).max(300),
});

export async function POST(req: Request) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  const parsed = parseWith(schema, await readJson(req));
  if (!parsed.ok) return parsed.response;

  // Scoped to the store folder so this endpoint can't be used to wipe other assets.
  if (!parsed.data.publicId.startsWith(`${MEDIA_FOLDER}/`)) {
    return jsonError("That asset isn't part of this store's media library.", 400);
  }

  try {
    const result = await destroyAsset(parsed.data.publicId);
    return NextResponse.json({ ok: true, result: result.result });
  } catch (err) {
    if (err instanceof Error && err.message === "CLOUDINARY_NOT_CONFIGURED") {
      return jsonError("Image uploads aren't configured.", 503);
    }
    return serverError("admin/upload/delete", err);
  }
}
