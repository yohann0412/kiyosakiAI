import { ImageResponse } from "next/og";
import { site } from "./site";

export const OG_SIZE = { width: 1200, height: 630 };

/** Social preview card: the page title on a paper background with a grid. */
export function ogImage(title: string, subtitle: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#f7f7f3",
          color: "#15201a",
          backgroundImage: "linear-gradient(#e1e4db 2px, transparent 2px), linear-gradient(90deg, #e1e4db 2px, transparent 2px)",
          backgroundSize: "80px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 34, fontWeight: 700 }}>
          <div style={{ width: 54, height: 58, borderRadius: 12, background: "#0c7a4d", marginRight: 18 }} />
          {site.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1.05, letterSpacing: -3, background: "#f7f7f3", alignSelf: "flex-start", padding: "0 12px 8px 0" }}>
            {title}
          </div>
          <div style={{ fontSize: 34, color: "#3c4a42", marginTop: 20, background: "#f7f7f3", alignSelf: "flex-start", padding: "4px 12px 4px 0", maxWidth: 980 }}>
            {subtitle}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#0c7a4d", fontWeight: 600 }}>Free · no sign-up for your first documents · files deleted within 24 hours</div>
      </div>
    ),
    OG_SIZE,
  );
}
