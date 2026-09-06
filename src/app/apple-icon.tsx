import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const GOLD = "#d4af37";
const ABYSS = "#050506";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: ABYSS,
        borderRadius: 42,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 4,
          left: 4,
          right: 4,
          bottom: 4,
          border: "4px solid rgba(212,175,55,0.35)",
          borderRadius: 37,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 31,
          right: 34,
          width: 11,
          height: 11,
          background: GOLD,
          transform: "rotate(45deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontFamily: "Georgia, serif", fontSize: 118, fontWeight: 700, color: GOLD, lineHeight: 1 }}>
          B
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 56,
          right: 56,
          bottom: 28,
          height: 7,
          borderRadius: 4,
          background: GOLD,
          opacity: 0.85,
        }}
      />
    </div>,
    { ...size },
  );
}