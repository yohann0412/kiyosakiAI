import Link from "next/link";
import { Fragment, type ReactNode } from "react";

/**
 * Minimal inline markup for page copy: **bold**, `code` and [links](/path).
 * Page content is written by hand in content/pages.ts, never taken from users.
 */
export function Inline({ text }: { text: string }): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} className="font-semibold text-ink">{part.slice(2, -2)}</strong>;
        if (part.startsWith("`") && part.endsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
        const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
        if (link) {
          return link[2].startsWith("/") ? (
            <Link key={i} href={link[2]}>
              {link[1]}
            </Link>
          ) : (
            <a key={i} href={link[2]} rel="noopener noreferrer" target="_blank">
              {link[1]}
            </a>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
