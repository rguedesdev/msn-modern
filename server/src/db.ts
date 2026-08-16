import mongoose from "mongoose";

export async function connectDatabase(uri: string): Promise<void> {
  await mongoose.connect(uri, {
    autoIndex: process.env.NODE_ENV !== "production",
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
