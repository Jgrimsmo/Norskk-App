import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

/** Serve a 512x512 PWA icon */
export async function GET() {
  const logoData = fs.readFileSync(
    path.join(process.cwd(), "public", "Norskk.png")
  );
  const base64 = logoData.toString("base64");
  const src = `data:image/png;base64,${base64}`;

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
          borderRadius: 72,
        }}
      >
        <img src={src} width={320} height={365} alt="Norskk" />
      </div>
    ),
    { width: 512, height: 512 }
  );
}
