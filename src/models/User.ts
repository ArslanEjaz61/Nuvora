import mongoose, { Schema, Model, Types } from "mongoose";

export type UserRole = "customer" | "admin";

export interface IAddress {
  _id?: Types.ObjectId;
  label?: string;
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
}

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  addresses: IAddress[];
  phone?: string;
  marketingOptIn: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const AddressSchema = new Schema<IAddress>(
  {
    label: { type: String, trim: true },
    fullName: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: "US" },
    phone: { type: String, trim: true },
    isDefaultShipping: { type: Boolean, default: false },
    isDefaultBilling: { type: Boolean, default: false },
  },
  { _id: true }
);

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    addresses: { type: [AddressSchema], default: [] },
    phone: { type: String, trim: true },
    marketingOptIn: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);
