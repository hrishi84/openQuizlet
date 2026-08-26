import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";

export function fireConfetti(intensity: "small" | "big" = "small") {
  if (intensity === "small") {
    void confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 }, colors: ["#4255ff", "#16a34a", "#f59e0b", "#ec4899"] });
  } else {
    const end = Date.now() + 1200;
    const frame = () => {
      void confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: ["#4255ff", "#16a34a", "#f59e0b"] });
      void confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: ["#4255ff", "#ec4899", "#22d3ee"] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }
}

/** Animated number count-up (for the XP reward moment). */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      // ease-out cubic for satisfying deceleration
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}
