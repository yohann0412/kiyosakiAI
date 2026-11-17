import { PAGES, pageBySlug } from "@/content/pages";
import { OG_SIZE, ogImage } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Document to spreadsheet converter";

export function generateStaticParams() {
  return PAGES.map((page) => ({ slug: page.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pageBySlug(slug);
  return ogImage(page?.h1 ?? "Document to spreadsheet", page?.blurb ?? "");
}
