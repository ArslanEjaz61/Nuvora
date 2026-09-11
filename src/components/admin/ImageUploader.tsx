"use client";

import { useRef, useState } from "react";
import { GripVertical, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "./Toast";

export interface UploadedImage {
  url: string;
  publicId?: string;
  alt?: string;
  width?: number;
  height?: number;
}

interface SignResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  uploadUrl: string;
}

/**
 * Uploads straight from the browser to Cloudinary using a short-lived signature
 * minted server-side, so the API secret never reaches the client bundle.
 */
export async function uploadToCloudinary(file: File, folder?: string): Promise<UploadedImage> {
  const signRes = await fetch("/api/admin/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(folder ? { folder } : {}),
  });
  if (!signRes.ok) {
    const body = await signRes.json().catch(() => ({}));
    throw new Error(body.error ?? "Could not start the upload.");
  }
  const sign: SignResponse = await signRes.json();

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sign.apiKey);
  form.append("timestamp", String(sign.timestamp));
  form.append("folder", sign.folder);
  form.append("signature", sign.signature);

  const res = await fetch(sign.uploadUrl, { method: "POST", body: form });
  if (!res.ok) throw new Error("Cloudinary rejected the upload.");
  const data = await res.json();

  return {
    url: data.secure_url as string,
    publicId: data.public_id as string,
    width: data.width as number,
    height: data.height as number,
    alt: "",
  };
}

export async function deleteFromCloudinary(publicId: string) {
  await fetch("/api/admin/upload/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicId }),
  });
}

export function ImageUploader({
  images,
  onChange,
  multiple = true,
  folder,
  label = "Images",
  hint = "The first image is the primary one. Drag to reorder.",
}: {
  images: UploadedImage[];
  onChange: (next: UploadedImage[]) => void;
  multiple?: boolean;
  folder?: string;
  label?: string;
  hint?: string;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    const picked = multiple ? Array.from(files) : [files[0]];
    const uploaded: UploadedImage[] = [];
    for (const file of picked) {
      try {
        uploaded.push(await uploadToCloudinary(file, folder));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed.");
      }
    }
    if (uploaded.length) {
      onChange(multiple ? [...images, ...uploaded] : [uploaded[0]]);
      toast.success(`${uploaded.length} image${uploaded.length > 1 ? "s" : ""} uploaded.`);
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function remove(index: number) {
    const img = images[index];
    const next = images.filter((_, i) => i !== index);
    onChange(next);
    if (img.publicId) {
      try {
        await deleteFromCloudinary(img.publicId);
      } catch {
        toast.error("Removed from the product, but the file is still in Cloudinary.");
      }
    }
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-ink-700">{label}</span>
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-400" />}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <div
            key={`${img.publicId ?? img.url}-${i}`}
            draggable={multiple}
            onDragStart={() => setDragIndex(i)}
            onDragEnter={() => setOverIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null) reorder(dragIndex, i);
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
            className={cn(
              "group relative aspect-square overflow-hidden rounded-card border border-ink-200 bg-ink-50",
              multiple && "cursor-grab active:cursor-grabbing",
              overIndex === i && dragIndex !== null && dragIndex !== i && "ring-2 ring-teal-500",
              dragIndex === i && "opacity-50"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.alt || `Image ${i + 1}`}
              className="h-full w-full object-cover"
            />
            {multiple && i === 0 && (
              <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-teal-900/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
                <Star className="h-2.5 w-2.5" /> Primary
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-ink-900/70 px-1.5 py-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
              {multiple ? (
                <GripVertical className="h-3.5 w-3.5 text-white/70" />
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                className="rounded p-1 text-white/80 transition hover:bg-red-600 hover:text-white"
                aria-label="Remove image"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || (!multiple && images.length > 0)}
          className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-card border-2 border-dashed border-ink-300 bg-white text-ink-500 transition hover:border-teal-500 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          <span className="text-xs font-medium">Upload</span>
        </button>
      </div>

      {hint && <p className="text-xs text-ink-500">{hint}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

export default ImageUploader;
