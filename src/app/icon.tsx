import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

const GOLD = "#d4af37";
const ABYSS = "#050506";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: ABYSS,
        borderRadius: 15,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 1.5,
          left: 1.5,
          right: 1.5,
          bottom: 1.5,
          border: "1.5px solid rgba(212,175,55,0.35)",
          borderRadius: 13,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 11,
          right: 12,
          width: 4,
          height: 4,
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
        <span style={{ fontFamily: "Georgia, serif", fontSize: 42, fontWeight: 700, color: GOLD, lineHeight: 1 }}>
          B
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 20,
          right: 20,
          bottom: 10,
          height: 2.5,
          borderRadius: 2,
          background: GOLD,
          opacity: 0.85,
        }}
      />
    </div>,
    { ...size },
  );
}