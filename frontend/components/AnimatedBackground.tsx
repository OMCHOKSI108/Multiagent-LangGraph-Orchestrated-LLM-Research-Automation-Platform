import React from 'react';

export const AnimatedBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Blob 1 - Indigo */}
      <div
        className="absolute rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl
          bg-indigo-300/20 dark:bg-indigo-500/15
          w-72 h-72 md:w-96 md:h-96"
        style={{
          top: '10%',
          left: '15%',
          animation: 'blob-float-1 20s ease-in-out infinite',
        }}
      />

      {/* Blob 2 - Purple */}
      <div
        className="absolute rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl
          bg-purple-300/20 dark:bg-purple-500/15
          w-80 h-80 md:w-[28rem] md:h-[28rem]"
        style={{
          top: '30%',
          right: '10%',
          animation: 'blob-float-2 25s ease-in-out infinite',
        }}
      />

      {/* Blob 3 - Cyan */}
      <div
        className="absolute rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl
          bg-cyan-300/15 dark:bg-cyan-500/10
          w-64 h-64 md:w-80 md:h-80"
        style={{
          bottom: '20%',
          left: '25%',
          animation: 'blob-float-3 22s ease-in-out infinite',
        }}
      />

      {/* Blob 4 - Blue */}
      <div
        className="absolute rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl
          bg-blue-300/15 dark:bg-blue-500/10
          w-56 h-56 md:w-72 md:h-72"
        style={{
          top: '60%',
          right: '25%',
          animation: 'blob-float-4 18s ease-in-out infinite',
        }}
      />

      {/* Blob 5 - Violet */}
      <div
        className="absolute rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl
          bg-violet-300/15 dark:bg-violet-500/10
          w-60 h-60 md:w-96 md:h-96"
        style={{
          top: '5%',
          right: '35%',
          animation: 'blob-float-5 28s ease-in-out infinite',
        }}
      />

      {/* Inline keyframe definitions */}
      <style>{`
        @keyframes blob-float-1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(30px, -50px) scale(1.1);
          }
          50% {
            transform: translate(-20px, 20px) scale(0.95);
          }
          75% {
            transform: translate(40px, 30px) scale(1.05);
          }
        }

        @keyframes blob-float-2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(-40px, 30px) scale(1.05);
          }
          50% {
            transform: translate(30px, -40px) scale(1.1);
          }
          75% {
            transform: translate(-20px, -20px) scale(0.95);
          }
        }

        @keyframes blob-float-3 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(50px, -30px) scale(1.08);
          }
          66% {
            transform: translate(-30px, 40px) scale(0.92);
          }
        }

        @keyframes blob-float-4 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          20% {
            transform: translate(-35px, -25px) scale(1.05);
          }
          40% {
            transform: translate(25px, 35px) scale(0.95);
          }
          60% {
            transform: translate(40px, -15px) scale(1.1);
          }
          80% {
            transform: translate(-15px, 25px) scale(1);
          }
        }

        @keyframes blob-float-5 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          30% {
            transform: translate(20px, 40px) scale(1.05);
          }
          60% {
            transform: translate(-40px, -20px) scale(0.95);
          }
        }
      `}</style>
    </div>
  );
};
