"use client";

import { useEffect } from "react";

export function AutoExitFullscreen() {
  useEffect(() => {
    try {
      if (
        typeof document !== "undefined" &&
        (document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement)
      ) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn("AutoExitFullscreen check error:", err);
    }
  }, []);

  return null;
}
