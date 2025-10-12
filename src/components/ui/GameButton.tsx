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
  primary: 'bg-primary text-primary-foreground border-2 border-primary hover:bg-primary/90 hover:border-primary/90 disabled:bg-muted disabled:border-muted disabled:text-muted-foreground shadow-lg hover:shadow-xl',
  secondary: 'bg-secondary text-secondary-foreground border-2 border-border hover:bg-accent hover:text-accent-foreground shadow-md hover:shadow-lg',
  outline: 'bg-background border-2 border-border text-foreground hover:bg-accent hover:text-accent-foreground shadow-sm hover:shadow-md',
  answer: 'text-primary-foreground border-4 border-transparent hover:scale-105 active:scale-95 shadow-xl hover:shadow-2xl transition-all duration-300 transform bg-gradient-to-br from-primary to-accent',
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
          'font-bold uppercase tracking-wide rounded-lg transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
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
