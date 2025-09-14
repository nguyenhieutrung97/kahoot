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
    <header className="bg-white shadow-sm p-6 relative flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold text-red-600 uppercase tracking-wide">
          {title}
        </h1>
        {subtitle && (
          <div className="text-sm text-gray-600 font-medium mt-1">
            {subtitle}
          </div>
        )}
      </div>
      
      {rightContent && (
        <div className="text-right">
          {rightContent}
        </div>
      )}
      
      {/* SVG Border at bottom */}
      {withSvgBorder ? (
        <div 
          className="absolute bottom-0 left-0 w-full h-1"
          style={{
            backgroundImage: 'url(/download.svg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
      ) : (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-red-600" />
      )}
    </header>
  );
};
