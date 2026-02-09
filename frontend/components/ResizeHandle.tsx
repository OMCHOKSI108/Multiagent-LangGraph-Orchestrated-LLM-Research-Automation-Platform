import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
  className?: string;
  disabled?: boolean;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({ 
  direction, 
  onResize, 
  className,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const lastPosition = useRef<number>(0);
  const handleRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    setIsDragging(true);
    lastPosition.current = direction === 'horizontal' ? e.clientX : e.clientY;
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.pointerEvents = 'none';
    
    // Focus the handle for keyboard accessibility 
    handleRef.current?.focus();
  }, [direction, disabled]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const currentPosition = direction === 'horizontal' ? e.clientX : e.clientY;
    const delta = currentPosition - lastPosition.current;
    lastPosition.current = currentPosition;
    
    onResize(delta);
  }, [isDragging, direction, onResize]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    document.body.style.userSelect = '';
    document.body.style.pointerEvents = '';
  }, [isDragging]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;
    
    const step = e.shiftKey ? 10 : 1;
    let delta = 0;
    
    if (direction === 'horizontal') {
      if (e.key === 'ArrowLeft') delta = -step;
      if (e.key === 'ArrowRight') delta = step;
    } else {
      if (e.key === 'ArrowUp') delta = -step;
      if (e.key === 'ArrowDown') delta = step;
    }
    
    if (delta !== 0) {
      e.preventDefault();
      onResize(delta);
    }
  }, [direction, onResize, disabled]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const isHorizontal = direction === 'horizontal';

  return (
    <div
      ref={handleRef}
      className={cn(
        "group relative flex items-center justify-center transition-colors",
        "hover:bg-brand/10 active:bg-brand/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isHorizontal 
          ? "cursor-col-resize w-1 min-w-[4px] h-full"
          : "cursor-row-resize h-1 min-h-[4px] w-full",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="separator"
      aria-orientation={isHorizontal ? "vertical" : "horizontal"}
      aria-label={`Resize ${isHorizontal ? 'sidebar width' : 'panel height'}`}
    >
      {/* Visual grip indicator */}
      <div className={cn(
        "bg-muted-foreground/30 group-hover:bg-brand/60 transition-colors rounded-full",
        isHorizontal 
          ? "w-[3px] h-8"
          : "h-[3px] w-8"
      )} />
      
      {/* Invisible expanded hit area for easier interaction */}
      <div className={cn(
        "absolute bg-transparent",
        isHorizontal 
          ? "w-[12px] h-full -translate-x-1/2 left-1/2"
          : "h-[12px] w-full -translate-y-1/2 top-1/2"
      )} />
    </div>
  );
};