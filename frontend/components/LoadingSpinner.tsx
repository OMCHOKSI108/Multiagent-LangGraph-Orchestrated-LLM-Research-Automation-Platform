import React from 'react';

export const LoadingSpinner: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative w-16 h-16 flex items-center justify-center">
                {/* Outer glowing ring */}
                <div className="absolute inset-0 rounded-full border-4 border-blue-500/30 dark:border-blue-400/30 animate-[spin_3s_linear_infinite]" />

                {/* Inner spinning ring */}
                <div className="absolute inset-2 rounded-full border-4 border-t-blue-600 border-r-transparent border-b-purple-600 border-l-transparent animate-[spin_1.5s_linear_infinite]" />

                {/* Center dot pulse */}
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            </div>
            <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400 animate-pulse">
                Loading...
            </div>
        </div>
    );
};
