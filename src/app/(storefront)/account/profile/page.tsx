import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSessionFor } from "@/components/account/guard";
import { ProfileForm } from "@/components/account/ProfileForm";
import { connectDB } from "@/lib/db";
import { User, type IUser } from "@/models/User";

export const metadata: Metadata = {
  title: "Your profile",
  description: "Update your name, phone number, email preferences and password.",
  robots: { index: false },
};

export default async function ProfilePage() {
  const session = await requireSessionFor("/account/profile");
  await connectDB();

  const user = await User.findById(session.userId)
    .select("email firstName lastName phone marketingOptIn")
    .lean<IUser | null>();

  if (!user) notFound();

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-2xl text-ink-900 md:text-3xl">Profile</h1>
        <p className="mt-1.5 text-sm text-ink-500">
          Keep your details current so orders reach you without a hitch.
        </p>
      </header>

      <ProfileForm
        user={{
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone ?? "",
          marketingOptIn: Boolean(user.marketingOptIn),
        }}
      />
    </div>
  );
}
