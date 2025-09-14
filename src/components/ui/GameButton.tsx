"use client";

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'answer';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

const variants = {
  primary: 'bg-red-600 text-white border-2 border-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:border-gray-300',
  secondary: 'bg-white text-gray-900 border-2 border-gray-300 hover:bg-gray-50',
  outline: 'bg-transparent border-2 border-gray-300 text-gray-700 hover:bg-gray-50',
  answer: 'text-white border-4 border-transparent hover:scale-105 active:scale-95 shadow-lg transition-all duration-200 transform',
} as const;

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base', 
  lg: 'px-8 py-4 text-lg',
} as const;

export const GameButton = forwardRef<HTMLButtonElement, GameButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    fullWidth = false,
    loading = false,
    disabled,
    children,
    ...props 
  }, ref) => {
    return (
      <button
        className={cn(
          'font-bold uppercase tracking-wide rounded transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-60',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          loading && 'opacity-75 cursor-wait',
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Loading...</span>
          </div>
        ) : (
          children
        )}
      </button>
    );
  }
);

GameButton.displayName = 'GameButton';
