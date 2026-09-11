"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Images, Loader2, Trash2, Upload } from "lucide-react";
import { Card, Button } from "../ui";
import { EmptyState } from "../EmptyState";
import { useConfirm } from "../ConfirmDialog";
import { useToast } from "../Toast";
import { uploadToCloudinary, deleteFromCloudinary } from "../ImageUploader";
import { cn } from "@/lib/utils";

interface Asset {
  publicId: string;
  url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  createdAt: string;
  usedBy: string[];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaLibrary() {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (cursor?: string) => {
    if (cursor) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/media${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not load the media library.");
      setAssets((prev) => (cursor ? [...prev, ...body.assets] : body.assets));
      setNextCursor(body.nextCursor ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the media library.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    let count = 0;
    for (const file of Array.from(files)) {
      try {
        await uploadToCloudinary(file);
        count += 1;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed.");
      }
    }
    if (count > 0) {
      toast.success(`${count} image${count > 1 ? "s" : ""} uploaded.`);
      void load();
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function remove(asset: Asset) {
    const ok = await confirm({
      title: "Delete this image?",
      message:
        asset.usedBy.length > 0
          ? `This image is currently used by: ${asset.usedBy.join(", ")}. Deleting it will leave those broken.`
          : "This can't be undone.",
      destructive: true,
      confirmLabel: "Delete",
    });
    if (!ok) return;

    try {
      await deleteFromCloudinary(asset.publicId);
      setAssets((prev) => prev.filter((a) => a.publicId !== asset.publicId));
      toast.success("Image deleted.");
    } catch {
      toast.error("Could not delete the image.");
    }
  }

  async function copyUrl(asset: Asset) {
    try {
      await navigator.clipboard.writeText(asset.url);
      setCopiedId(asset.publicId);
      setTimeout(() => setCopiedId((id) => (id === asset.publicId ? null : id)), 1500);
    } catch {
      toast.error("Could not copy the URL.");
    }
  }

  if (error && !loading) {
    return (
      <Card>
        <EmptyState icon={Images} title="Media unavailable" description={error} />
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-ink-200 p-3.5 sm:p-4">
        <p className="text-sm text-ink-500">{loading ? "Loading…" : `${assets.length} image${assets.length === 1 ? "" : "s"}`}</p>
        <Button size="sm" onClick={() => inputRef.current?.click()} loading={uploading}>
          <Upload className="h-3.5 w-3.5" /> Upload
        </Button>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleUpload(e.target.files)} />
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-5 w-5 animate-spin text-ink-400" />
        </div>
      ) : assets.length === 0 ? (
        <EmptyState
          icon={Images}
          title="No images yet"
          description="Upload product photos, collection banners or homepage images here."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5 lg:grid-cols-4">
          {assets.map((asset) => (
            <div key={asset.publicId} className="group relative overflow-hidden rounded-card border border-ink-200 bg-ink-50">
              <div className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset.url} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="p-2">
                <p className="truncate text-[11px] text-ink-500">
                  {asset.width}×{asset.height} · {formatBytes(asset.bytes)}
                </p>
                {asset.usedBy.length > 0 && (
                  <p className="truncate text-[11px] text-teal-700" title={asset.usedBy.join(", ")}>
                    Used by {asset.usedBy.length} item{asset.usedBy.length > 1 ? "s" : ""}
                  </p>
                )}
              </div>
              <div className="absolute inset-x-0 top-0 flex justify-end gap-1 bg-gradient-to-b from-ink-900/60 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => copyUrl(asset)}
                  className="rounded bg-white/90 p-1.5 text-ink-700 transition hover:bg-white"
                  aria-label="Copy URL"
                >
                  {copiedId === asset.publicId ? (
                    <Check className="h-3.5 w-3.5 text-teal-700" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => remove(asset)}
                  className={cn(
                    "rounded bg-white/90 p-1.5 text-ink-700 transition hover:bg-red-50 hover:text-red-600"
                  )}
                  aria-label="Delete image"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {nextCursor && (
        <div className="flex justify-center border-t border-ink-200 p-4">
          <Button variant="secondary" onClick={() => load(nextCursor)} loading={loadingMore}>
            Load more
          </Button>
        </div>
      )}
      {dialog}
    </Card>
  );
}

export default MediaLibrary;
