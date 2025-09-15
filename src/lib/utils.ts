import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Shared avatar utilities
export const AVATAR_COLORS = [
  'bg-red-600',
  'bg-gray-600',
  'bg-blue-600',
  'bg-green-600',
  'bg-orange-600',
  'bg-purple-600',
  'bg-indigo-600',
  'bg-teal-600',
  'bg-pink-600',
  'bg-yellow-600',
];

export function getInitialsFromName(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
}

export function getDeterministicAvatar(name: string): { color: string; initials: string } {
  // Simple deterministic hash from name → color index
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const index = hash % AVATAR_COLORS.length;
  const color = (AVATAR_COLORS[index] ?? AVATAR_COLORS[0]) as string;
  return {
    color,
    initials: getInitialsFromName(name),
  };
}