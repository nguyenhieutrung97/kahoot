"use client";

import { ReactNode } from 'react';

interface GameHeaderProps {
  title: string;
  subtitle?: string;
  rightContent?: ReactNode;
  withSvgBorder?: boolean;
}

export const GameHeader = ({ 
  title, 
  subtitle, 
  rightContent, 
  withSvgBorder = false 
}: GameHeaderProps) => {
  return (
    <header className="bg-card border-b border-border/50 backdrop-blur-sm p-6 relative flex justify-between items-start shadow-sm">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-primary uppercase tracking-wider font-sans">
          {title}
        </h1>
        {subtitle && (
          <div className="text-base text-muted-foreground font-medium">
            {subtitle}
          </div>
        )}
      </div>
      
      {rightContent && (
        <div className="text-right">
          {rightContent}
        </div>
      )}
      
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-60" />
    </header>
  );
};
