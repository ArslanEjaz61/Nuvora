import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { User } from "@/models/User";
import { authError, jsonError, parseWith, readJson, serverError } from "../../../_lib/http";
import { addressPatchSchema, serializeAddresses } from "../serialize";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const session = await requireUser();
    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) return jsonError("Address not found.", 404);

    const parsed = parseWith(addressPatchSchema, await readJson(req));
    if (!parsed.ok) return parsed.response;
    const input = parsed.data;

    await connectDB();
    const user = await User.findById(session.userId).select("addresses");
    if (!user) return jsonError("Account not found.", 404);

    // Scoped to the session user's own subdocuments, so another customer's
    // address id can never be reached from here.
    const address = user.addresses.find((a) => String(a._id) === id);
    if (!address) return jsonError("Address not found.", 404);

    if (input.label !== undefined) address.label = input.label;
    if (input.fullName !== undefined) address.fullName = input.fullName;
    if (input.line1 !== undefined) address.line1 = input.line1;
    if (input.line2 !== undefined) address.line2 = input.line2 || undefined;
    if (input.city !== undefined) address.city = input.city;
    if (input.state !== undefined) address.state = input.state;
    if (input.postalCode !== undefined) address.postalCode = input.postalCode;
    if (input.country !== undefined) address.country = input.country.toUpperCase();
    if (input.phone !== undefined) address.phone = input.phone || undefined;

    if (input.isDefaultShipping) {
      user.addresses.forEach((a) => {
        a.isDefaultShipping = String(a._id) === id;
      });
    } else if (input.isDefaultShipping === false) {
      address.isDefaultShipping = false;
    }

    if (input.isDefaultBilling) {
      user.addresses.forEach((a) => {
        a.isDefaultBilling = String(a._id) === id;
      });
    } else if (input.isDefaultBilling === false) {
      address.isDefaultBilling = false;
    }

    await user.save();
    return NextResponse.json({ addresses: serializeAddresses(user.addresses) });
  } catch (err) {
    return authError(err) ?? serverError("account/addresses/[id]:PATCH", err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const session = await requireUser();
    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) return jsonError("Address not found.", 404);

    await connectDB();
    const user = await User.findById(session.userId).select("addresses");
    if (!user) return jsonError("Account not found.", 404);

    const index = user.addresses.findIndex((a) => String(a._id) === id);
    if (index === -1) return jsonError("Address not found.", 404);

    const [removed] = user.addresses.splice(index, 1);

    // Never leave the account without a default while addresses remain.
    if (user.addresses.length > 0) {
      if (removed.isDefaultShipping && !user.addresses.some((a) => a.isDefaultShipping)) {
        user.addresses[0].isDefaultShipping = true;
      }
      if (removed.isDefaultBilling && !user.addresses.some((a) => a.isDefaultBilling)) {
        user.addresses[0].isDefaultBilling = true;
      }
    }

    await user.save();
    return NextResponse.json({ addresses: serializeAddresses(user.addresses) });
  } catch (err) {
    return authError(err) ?? serverError("account/addresses/[id]:DELETE", err);
  }
}
