import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

// Cached across hot reloads in dev, and across lambda invocations in prod,
// so we never open a new pool per request.
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalWithMongoose = global as typeof globalThis & {
  _mongoose?: MongooseCache;
};

const cached: MongooseCache = globalWithMongoose._mongoose ?? {
  conn: null,
  promise: null,
};
globalWithMongoose._mongoose = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 10,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}
