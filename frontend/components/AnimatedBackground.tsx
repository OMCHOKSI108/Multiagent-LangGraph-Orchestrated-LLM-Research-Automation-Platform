import React, { useEffect, useRef, useState } from 'react';

// Generate random movement keyframes
const generateRandomKeyframes = (name: string) => {
  const randomPosition = () => `${Math.random() * 80}vw`;
  const randomOffset = () => `${Math.random() * 80}vh`;

  const startEndPosition = `${randomPosition()}, ${randomOffset()}`;
  const midPosition1 = `${randomPosition()}, ${randomOffset()}`;
  const midPosition2 = `${randomPosition()}, ${randomOffset()}`;
  const midPosition3 = `${randomPosition()}, ${randomOffset()}`;

  return `
    @keyframes ${name} {
      0% { transform: translate(${startEndPosition}); }
      25% { transform: translate(${midPosition1}); }
      50% { transform: translate(${midPosition2}); }
      75% { transform: translate(${midPosition3}); }
      100% { transform: translate(${startEndPosition}); }
    }
  `;
};

interface BlobProps {
  className: string;
  animationName: string;
  duration: string;
  initialPosition: string;
}

const Blob: React.FC<BlobProps> = ({ className, animationName, duration, initialPosition }) => {
  return (
    <div
      className={`absolute rounded-full blur-3xl ${className}`}
      style={{
        animation: `${animationName} ${duration} infinite ease-in-out`,
        transform: `translate(${initialPosition})`,
      }}
    />
  );
};

export const AnimatedBackground: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    setMounted(true);

    // Generate dynamic keyframes on mount
    const style = document.createElement('style');
    style.innerHTML = `
      ${generateRandomKeyframes('blobMove1')}
      ${generateRandomKeyframes('blobMove2')}
      ${generateRandomKeyframes('blobMove3')}
      ${generateRandomKeyframes('blobMove4')}
      ${generateRandomKeyframes('blobMove5')}
      ${generateRandomKeyframes('blobMove6')}
      ${generateRandomKeyframes('blobMove7')}
    `;
    document.head.appendChild(style);
    styleRef.current = style;

    return () => {
      if (styleRef.current) {
        document.head.removeChild(styleRef.current);
      }
    };
  }, []);

  const randomPosition = () => `${Math.random() * 50}vw, ${Math.random() * 50}vh`;

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Coral/Salmon */}
      <Blob
        className="bg-[#FFA07A]/40 dark:bg-[#FFA07A]/20 w-[400px] h-[400px] md:w-[500px] md:h-[500px] mix-blend-multiply dark:mix-blend-screen"
        animationName="blobMove1"
        duration="15s"
        initialPosition={randomPosition()}
      />

      {/* Mint Green */}
      <Blob
        className="bg-[#98FB98]/40 dark:bg-[#98FB98]/20 w-[450px] h-[450px] md:w-[550px] md:h-[550px] mix-blend-multiply dark:mix-blend-screen"
        animationName="blobMove2"
        duration="18s"
        initialPosition={randomPosition()}
      />

      {/* Sky Blue */}
      <Blob
        className="bg-[#87CEFA]/40 dark:bg-[#87CEFA]/20 w-[350px] h-[350px] md:w-[450px] md:h-[450px] mix-blend-multiply dark:mix-blend-screen"
        animationName="blobMove3"
        duration="20s"
        initialPosition={randomPosition()}
      />

      {/* Gold */}
      <Blob
        className="bg-[#FFD700]/35 dark:bg-[#FFD700]/15 w-[380px] h-[380px] md:w-[480px] md:h-[480px] mix-blend-multiply dark:mix-blend-screen"
        animationName="blobMove4"
        duration="22s"
        initialPosition={randomPosition()}
      />

      {/* Orchid/Purple */}
      <Blob
        className="bg-[#BA55D3]/35 dark:bg-[#BA55D3]/15 w-[420px] h-[420px] md:w-[520px] md:h-[520px] mix-blend-multiply dark:mix-blend-screen"
        animationName="blobMove5"
        duration="25s"
        initialPosition={randomPosition()}
      />

      {/* Turquoise */}
      <Blob
        className="bg-[#40E0D0]/35 dark:bg-[#40E0D0]/15 w-[360px] h-[360px] md:w-[460px] md:h-[460px] mix-blend-multiply dark:mix-blend-screen"
        animationName="blobMove6"
        duration="28s"
        initialPosition={randomPosition()}
      />

      {/* Tomato Red */}
      <Blob
        className="bg-[#FF6347]/30 dark:bg-[#FF6347]/12 w-[340px] h-[340px] md:w-[440px] md:h-[440px] mix-blend-multiply dark:mix-blend-screen"
        animationName="blobMove7"
        duration="30s"
        initialPosition={randomPosition()}
      />
    </div>
  );
};

export default AnimatedBackground;
