import "server-only";
import { randomInt } from "crypto";
import { Order } from "@/models/Order";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function candidate() {
  let out = "";
  for (let i = 0; i < 8; i += 1) out += ALPHABET[randomInt(ALPHABET.length)];
  return `NUV-${out}`;
}

/** Retries on the (vanishingly rare) collision with an existing order number. */
export async function generateOrderNumber(attempts = 6): Promise<string> {
  for (let i = 0; i < attempts; i += 1) {
    const orderNumber = candidate();
    const clash = await Order.exists({ orderNumber });
    if (!clash) return orderNumber;
  }
  throw new Error("Could not allocate a unique order number");
}
