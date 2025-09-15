import React from 'react';

// Performance utilities for Next.js

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Lazy loading utility
export const lazyLoad = (importFunc: () => Promise<any>) => {
  return React.lazy(importFunc);
};

// Preload critical resources
export const preloadResource = (href: string, as: string) => {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    document.head.appendChild(link);
  }
};

// Performance monitoring
export const measurePerformance = (name: string, fn: () => void) => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
  } else {
    fn();
  }
};

// Memory usage monitoring (development only)
export const logMemoryUsage = () => {
  if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
    const memory = (performance as any).memory;
    console.log('Memory usage:', {
      used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)} MB`,
      total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)} MB`,
      limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)} MB`,
    });
  }
};
