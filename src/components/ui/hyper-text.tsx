"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

interface HyperTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  duration?: number;
}

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function HyperText({
  text,
  className,
  style,
  duration = 1200,
}: HyperTextProps) {
  const [display, setDisplay] = useState(() => text.split("").map(() => " ").join(""));
  const containerRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number>(0);

  const animate = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const chars = text.split("");
    const totalFrames = Math.floor(duration / 16);
    let frame = 0;

    const tick = () => {
      frame++;
      const progress = Math.min(frame / totalFrames, 1);
      const resolved = Math.floor(progress * chars.length);

      const next = chars
        .map((char, i) => {
          if (char === " ") return " ";
          if (i < resolved) return char;
          if (i === resolved) return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        })
        .join("");

      setDisplay(next);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(text);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [text, duration]);

  // Initial animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      animate();
    }, 300);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  const handleMouseEnter = () => {
    animate();
  };

  return (
    <span
      ref={containerRef}
      className={cn(
        "inline-block font-black uppercase cursor-default",
        className
      )}
      style={{
        fontFamily: "'Space Mono', monospace",
        fontVariantNumeric: "tabular-nums",
        ...style,
      }}
      onMouseEnter={handleMouseEnter}
    >
      {display}
    </span>
  );
}
