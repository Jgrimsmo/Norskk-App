import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

/** Serve a 192x192 PWA icon */
export async function GET() {
  const logoData = fs.readFileSync(
    path.join(process.cwd(), "public", "Print_Transparent.svg")
  );
  const base64 = logoData.toString("base64");
  const src = `data:image/svg+xml;base64,${base64}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#18181b",
          borderRadius: 28,
        }}
      >
        <img src={src} width={140} height={140} alt="Norskk" />
      </div>
    ),
    { width: 192, height: 192 }
  );
}
