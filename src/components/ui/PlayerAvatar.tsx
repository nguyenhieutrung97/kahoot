import type { Avatar } from '@/types/game';

interface PlayerAvatarProps {
  avatar: Avatar;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-12 h-12 text-sm',
  md: 'w-16 h-16 text-lg', 
  lg: 'w-20 h-20 text-2xl',
  xl: 'w-24 h-24 text-3xl',
} as const;

export const PlayerAvatar = ({ 
  avatar, 
  size = 'md', 
  className = '' 
}: PlayerAvatarProps) => {
  return (
    <div
      className={`
        ${sizeClasses[size]} 
        ${avatar.color} 
        rounded-full 
        flex items-center justify-center 
        text-white font-bold 
        border-4 border-gray-200
        ${className}
      `}
    >
      {avatar.initials}
    </div>
  );
};
