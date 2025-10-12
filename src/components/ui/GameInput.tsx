"use client";

import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface GameInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  fullWidth?: boolean;
}

export const GameInput = forwardRef<HTMLInputElement, GameInputProps>(
  ({ className, error, fullWidth = false, ...props }, ref) => {
    return (
      <div className={cn('space-y-1', fullWidth && 'w-full')}>
        <input
          className={cn(
            'px-4 py-3 border-2 rounded-lg font-medium text-center uppercase tracking-wide',
            'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200',
            'placeholder:text-muted-foreground placeholder:normal-case bg-background',
            error 
              ? 'border-destructive text-destructive placeholder:text-destructive/60 bg-destructive/5' 
              : 'border-border hover:border-primary/50',
            fullWidth && 'w-full',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-sm text-destructive font-medium normal-case">
            {error}
          </p>
        )}
      </div>
    );
  }
);

GameInput.displayName = 'GameInput';
