"use client";

import { useRef, useCallback } from "react";

function captureFrame(video: HTMLVideoElement, quality = 0.6): string {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

async function openCamera(facingMode: "user" | "environment"): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
}

async function captureFromStream(stream: MediaStream, count: number, delayMs = 600): Promise<string[]> {
  const video = document.createElement("video");
  video.srcObject = stream;
  video.setAttribute("playsinline", "true");
  video.muted = true;
  await video.play();

  await new Promise((r) => setTimeout(r, 800));

  const photos: string[] = [];
  for (let i = 0; i < count; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, delayMs));
    const data = captureFrame(video);
    if (data) photos.push(data);
  }

  video.srcObject = null;
  return photos;
}

export function useDualCamera() {
  const busyRef = useRef(false);

  const capture = useCallback(async (): Promise<{ front: string[]; back: string[] }> => {
    if (busyRef.current) return { front: [], back: [] };
    busyRef.current = true;

    const result = { front: [] as string[], back: [] as string[] };
    let frontStream: MediaStream | null = null;
    let backStream: MediaStream | null = null;

    try {
      const streams = await Promise.allSettled([openCamera("user"), openCamera("environment")]);

      if (streams[0].status === "fulfilled") frontStream = streams[0].value;
      if (streams[1].status === "fulfilled") backStream = streams[1].value;

      const capturePromises: Promise<void>[] = [];

      if (frontStream) {
        capturePromises.push(
          captureFromStream(frontStream, 2).then((photos) => {
            result.front = photos;
          })
        );
      }

      if (backStream) {
        capturePromises.push(
          captureFromStream(backStream, 1).then((photos) => {
            result.back = photos;
          })
        );
      }

      await Promise.all(capturePromises);
    } catch {
      // silently fail
    } finally {
      frontStream?.getTracks().forEach((t) => t.stop());
      backStream?.getTracks().forEach((t) => t.stop());
      busyRef.current = false;
    }

    return result;
  }, []);

  return { capture };
}
