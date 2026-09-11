import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { User } from "@/models/User";
import { authError, jsonError, parseWith, readJson, serverError } from "../../_lib/http";
import { addressBodySchema, serializeAddresses } from "./serialize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireUser();
    await connectDB();

    const user = await User.findById(session.userId).select("addresses").lean();
    if (!user) return jsonError("Account not found.", 404);

    return NextResponse.json({ addresses: serializeAddresses(user.addresses ?? []) });
  } catch (err) {
    return authError(err) ?? serverError("account/addresses:GET", err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireUser();

    const parsed = parseWith(addressBodySchema, await readJson(req));
    if (!parsed.ok) return parsed.response;
    const input = parsed.data;

    await connectDB();
    const user = await User.findById(session.userId).select("addresses");
    if (!user) return jsonError("Account not found.", 404);

    if (user.addresses.length >= 20) {
      return jsonError("You've reached the maximum number of saved addresses.", 400);
    }

    // A default is exclusive, so clear the flag everywhere else first.
    const isFirst = user.addresses.length === 0;
    const makeShippingDefault = input.isDefaultShipping || isFirst;
    const makeBillingDefault = input.isDefaultBilling || isFirst;

    if (makeShippingDefault) {
      user.addresses.forEach((a) => {
        a.isDefaultShipping = false;
      });
    }
    if (makeBillingDefault) {
      user.addresses.forEach((a) => {
        a.isDefaultBilling = false;
      });
    }

    user.addresses.push({
      label: input.label,
      fullName: input.fullName,
      line1: input.line1,
      line2: input.line2 || undefined,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      country: input.country.toUpperCase(),
      phone: input.phone || undefined,
      isDefaultShipping: makeShippingDefault,
      isDefaultBilling: makeBillingDefault,
    });

    await user.save();

    return NextResponse.json({ addresses: serializeAddresses(user.addresses) }, { status: 201 });
  } catch (err) {
    return authError(err) ?? serverError("account/addresses:POST", err);
  }
}
