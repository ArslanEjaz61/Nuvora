import type { Metadata } from "next";
import { AddressBook, type SavedAddress } from "@/components/account/AddressBook";
import { requireSessionFor } from "@/components/account/guard";
import { connectDB } from "@/lib/db";
import { User, type IUser } from "@/models/User";

export const metadata: Metadata = {
  title: "Your addresses",
  description: "Manage the addresses Nuvora delivers and bills to.",
  robots: { index: false },
};

export default async function AddressesPage() {
  const session = await requireSessionFor("/account/addresses");
  await connectDB();

  const user = await User.findById(session.userId).select("addresses").lean<IUser | null>();

  const addresses: SavedAddress[] = (user?.addresses ?? []).map((a) => ({
    id: String(a._id),
    label: a.label ?? "",
    fullName: a.fullName,
    line1: a.line1,
    line2: a.line2 ?? "",
    city: a.city,
    state: a.state,
    postalCode: a.postalCode,
    country: a.country,
    phone: a.phone ?? "",
    isDefaultShipping: Boolean(a.isDefaultShipping),
    isDefaultBilling: Boolean(a.isDefaultBilling),
  }));

  return <AddressBook initialAddresses={addresses} />;
}
