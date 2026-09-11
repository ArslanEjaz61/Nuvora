import { requireAdminPage } from "../_lib/guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { MediaLibrary } from "@/components/admin/media/MediaLibrary";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  await requireAdminPage("/admin/media");

  return (
    <>
      <PageHeader title="Media" description="Images uploaded to the store's Cloudinary library." />
      <MediaLibrary />
    </>
  );
}
