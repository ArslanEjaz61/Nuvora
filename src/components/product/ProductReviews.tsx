"use client";

import { useCallback, useEffect, useState } from "react";
import { Star, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Rating } from "@/components/ui/Rating";
import { cn, formatDate } from "@/lib/utils";

interface ReviewItem {
  _id: string;
  authorName: string;
  rating: number;
  title?: string;
  body: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export function ProductReviews({
  productId,
  rating,
}: {
  productId: string;
  rating: { average: number; count: number };
}) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [histogram, setHistogram] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews?productId=${productId}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews ?? []);
        setHistogram(data.histogram ?? {});
      }
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section id="reviews" className="container-page border-t border-ink-200 py-10 scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-xl text-ink-900">
          Reviews {rating.count > 0 && <span className="text-ink-400">({rating.count})</span>}
        </h2>
        <Button variant="outline" size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "Write a review"}
        </Button>
      </div>

      {showForm && (
        <ReviewForm
          productId={productId}
          onDone={() => {
            setShowForm(false);
            void load();
          }}
        />
      )}

      {rating.count > 0 && (
        <div className="mt-6 grid gap-6 md:grid-cols-[auto_1fr] md:gap-10">
          <div className="text-center md:text-left">
            <p className="font-display text-4xl text-ink-900">{rating.average.toFixed(1)}</p>
            <Rating value={rating.average} showCount={false} className="mt-1 justify-center md:justify-start" />
            <p className="mt-1 text-xs text-ink-500">
              Based on {rating.count} review{rating.count === 1 ? "" : "s"}
            </p>
          </div>

          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = histogram[stars] ?? 0;
              const pct = rating.count ? (count / rating.count) * 100 : 0;
              return (
                <div key={stars} className="flex items-center gap-2 text-xs">
                  <span className="w-10 shrink-0 text-ink-600">{stars} star</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                    <div className="h-full rounded-full bg-gold-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 shrink-0 text-right tabular-nums text-ink-500">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8">
        {loading ? (
          <p className="text-sm text-ink-500">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-ink-500">
            No reviews yet. Be the first to share what you think.
          </p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {reviews.map((review) => (
              <li key={review._id} className="py-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Rating value={review.rating} showCount={false} size={13} />
                  <span className="text-sm font-medium text-ink-900">{review.authorName}</span>
                  {review.verifiedPurchase && (
                    <span className="inline-flex items-center gap-1 text-xs text-teal-700">
                      <CheckCircle2 size={13} aria-hidden />
                      Verified purchase
                    </span>
                  )}
                  <span className="ml-auto text-xs text-ink-400">
                    {formatDate(review.createdAt)}
                  </span>
                </div>
                {review.title && (
                  <p className="mt-2 text-sm font-medium text-ink-900">{review.title}</p>
                )}
                <p className="mt-1 text-sm leading-relaxed text-ink-600">{review.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ReviewForm({ productId, onDone }: { productId: string; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (rating < 1) {
      setError("Pick a star rating.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, title, body, authorName }),
      });
      const data = await res.json();

      if (res.status === 401) {
        setError("Please sign in to leave a review.");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Could not submit your review.");
        return;
      }
      setSubmitted(true);
      setTimeout(onDone, 2500);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <p className="mt-5 rounded border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
        Thanks — your review was submitted and will appear once it&apos;s approved.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 max-w-xl space-y-4 rounded-card border border-ink-200 p-5">
      <div>
        <span className="text-sm font-medium text-ink-900">Your rating</span>
        <div className="mt-1.5 flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${star} star${star === 1 ? "" : "s"}`}
              className="p-0.5"
            >
              <Star
                size={24}
                strokeWidth={1.5}
                className={cn(
                  (hover || rating) >= star
                    ? "fill-gold-500 text-gold-500"
                    : "fill-transparent text-ink-300"
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <Field label="Your name">
        <input
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          required
          maxLength={80}
          className="h-11 w-full rounded border border-ink-200 px-3 text-sm outline-none focus:border-teal-600"
        />
      </Field>

      <Field label="Title (optional)">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          className="h-11 w-full rounded border border-ink-200 px-3 text-sm outline-none focus:border-teal-600"
        />
      </Field>

      <Field label="Your review">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          className="w-full rounded border border-ink-200 p-3 text-sm outline-none focus:border-teal-600"
        />
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={sending}>
        {sending ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-900">{label}</span>
      {children}
    </label>
  );
}
