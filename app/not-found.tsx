import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export default function NotFound() {
  return (
    <>
      <SiteHeader page="not-found" />
      <main className="container-page py-24 text-center">
        <h1 className="text-3xl font-semibold">That page doesn't exist</h1>
        <p className="mt-3 text-ink-2">The converter does, though.</p>
        <Link href="/" className="btn btn-primary mt-6">
          Go to the converter
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
