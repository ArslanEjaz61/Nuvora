import "server-only";
import { slugify } from "@/lib/utils";

interface SlugModel {
  exists(filter: Record<string, unknown>): Promise<unknown>;
}

/** Appends -2, -3 … until the slug is free, ignoring the document being edited. */
export async function uniqueSlug(
  model: SlugModel,
  desired: string,
  excludeId?: string
): Promise<string> {
  const base = slugify(desired) || "item";
  let candidate = base;
  let n = 1;

  const m = model;
  for (;;) {
    const query: Record<string, unknown> = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const clash = await m.exists(query);
    if (!clash) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}
