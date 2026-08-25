"use client";

import { createContext, useContext } from "react";

/**
 * Boot state machine.
 *
 *  - `phase` is the boot reveal lifecycle:
 *      "boot"  → the full-screen intro is playing
 *      "morph" → the intro is dissolving, the brand flies home
 *      "done"  → everything is settled, page is interactive
 *  - `boot` is the session decision:
 *      "pending" → undecided (first paint, hidden)
 *      "play"    → first visit this session, play the reveal
 *      "skip"    → returning visitor, render instantly
 */
export type BootPhase = "boot" | "morph" | "done";
export type BootState = "pending" | "play" | "skip";

export const BootContext = createContext<{ phase: BootPhase; boot: BootState }>({
  phase: "boot",
  boot: "pending",
});

export const useBootPhase = () => useContext(BootContext).phase;
export const useBoot = () => useContext(BootContext).boot;
