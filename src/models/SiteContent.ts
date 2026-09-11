import mongoose, { Schema, Model, Types } from "mongoose";

export interface IHeroSlide {
  image: string;
  mobileImage?: string;
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  ctaLabel?: string;
  ctaHref?: string;
  position: number;
}

export interface IValueProp {
  icon: string;
  title: string;
  description?: string;
}

export interface IContentSection {
  key: string;
  title?: string;
  subtitle?: string;
  collectionSlug?: string;
  limit?: number;
  position: number;
  enabled: boolean;
}

/**
 * Single-document store for admin-editable homepage content.
 * Always read/written with key: "homepage".
 */
export interface ISiteContent {
  _id: Types.ObjectId;
  key: string;
  announcementBar: {
    enabled: boolean;
    messages: string[];
  };
  heroSlides: IHeroSlide[];
  valueProps: IValueProp[];
  sections: IContentSection[];
  promoBanner?: {
    enabled: boolean;
    heading?: string;
    body?: string;
    image?: string;
    ctaLabel?: string;
    ctaHref?: string;
  };
  updatedAt: Date;
}

const SiteContentSchema = new Schema<ISiteContent>(
  {
    key: { type: String, required: true, unique: true, default: "homepage" },
    announcementBar: {
      enabled: { type: Boolean, default: true },
      messages: { type: [String], default: [] },
    },
    heroSlides: {
      type: [
        new Schema<IHeroSlide>(
          {
            image: { type: String, required: true },
            mobileImage: String,
            eyebrow: String,
            heading: String,
            subheading: String,
            ctaLabel: String,
            ctaHref: String,
            position: { type: Number, default: 0 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    valueProps: {
      type: [
        new Schema<IValueProp>(
          {
            icon: { type: String, required: true },
            title: { type: String, required: true },
            description: String,
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    sections: {
      type: [
        new Schema<IContentSection>(
          {
            key: { type: String, required: true },
            title: String,
            subtitle: String,
            collectionSlug: String,
            limit: { type: Number, default: 8 },
            position: { type: Number, default: 0 },
            enabled: { type: Boolean, default: true },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    promoBanner: {
      enabled: { type: Boolean, default: false },
      heading: String,
      body: String,
      image: String,
      ctaLabel: String,
      ctaHref: String,
    },
  },
  { timestamps: true }
);

export const SiteContent: Model<ISiteContent> =
  (mongoose.models.SiteContent as Model<ISiteContent>) ||
  mongoose.model<ISiteContent>("SiteContent", SiteContentSchema);
