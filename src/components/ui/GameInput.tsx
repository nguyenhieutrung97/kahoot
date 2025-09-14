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
            'px-4 py-3 border-2 rounded font-medium text-center uppercase tracking-wide',
            'focus:outline-none focus:border-red-600 focus:ring-0 transition-colors',
            'placeholder:text-gray-400 placeholder:normal-case',
            error 
              ? 'border-red-500 text-red-900 placeholder:text-red-400' 
              : 'border-gray-300',
            fullWidth && 'w-full',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600 font-medium normal-case">
            {error}
          </p>
        )}
      </div>
    );
  }
);

GameInput.displayName = 'GameInput';
