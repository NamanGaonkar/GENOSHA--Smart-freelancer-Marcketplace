import { useRef, useEffect } from 'react';

interface BorderBeamProps {
  className?: string;
  duration?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

let beamInjected = false;

function injectKeyframes() {
  if (beamInjected) return;
  beamInjected = true;
  const style = document.createElement('style');
  style.textContent = `@keyframes border-beam-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}

export default function BorderBeam({
  className = '',
  duration = 5,
  borderWidth = 1.5,
  colorFrom = '#10b981',
  colorTo = '#06b6d4',
  delay = 0,
}: BorderBeamProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    injectKeyframes();
  }, []);

  return (
    <span
      ref={ref}
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit] ${className}`}
    >
      <span
        style={{
          position: 'absolute',
          top: `-${borderWidth}px`,
          left: `-${borderWidth}px`,
          right: `-${borderWidth}px`,
          bottom: `-${borderWidth}px`,
          borderRadius: 'inherit',
          padding: borderWidth,
          background: `conic-gradient(from 0deg, transparent 70%, ${colorFrom}, ${colorTo}, transparent 100%)`,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          animation: `border-beam-spin ${duration}s linear infinite`,
          animationDelay: `${delay}s`,
        }}
      />
    </span>
  );
}
