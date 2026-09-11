import { requireAdminPage } from "../_lib/guard";
import { connectDB } from "@/lib/db";
import { SiteContent } from "@/models/SiteContent";
import { Collection } from "@/models/Collection";
import { serialize } from "@/lib/utils";
import { PageHeader } from "@/components/admin/PageHeader";
import { HomepageEditor, type Content } from "@/components/admin/homepage/HomepageEditor";
import { DEFAULT_HOMEPAGE } from "@/app/api/admin/content/route";

export const dynamic = "force-dynamic";

export default async function AdminHomepagePage() {
  await requireAdminPage("/admin/homepage");
  await connectDB();

  const [doc, collections] = await Promise.all([
    SiteContent.findOne({ key: "homepage" }).lean(),
    Collection.find({ status: "active" }).select("title slug").sort({ title: 1 }).lean(),
  ]);

  const content = doc
    ? {
        announcementBar: doc.announcementBar,
        heroSlides: doc.heroSlides,
        valueProps: doc.valueProps,
        sections: doc.sections,
        promoBanner: doc.promoBanner,
      }
    : DEFAULT_HOMEPAGE;

  return (
    <>
      <PageHeader
        title="Homepage"
        description="Edit the announcement bar, hero slides, value props and product sections shown on the storefront."
      />
      <HomepageEditor
        initial={serialize(content) as unknown as Content}
        collectionOptions={serialize(collections.map((c) => ({ title: c.title, slug: c.slug })))}
      />
    </>
  );
}
