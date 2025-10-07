import { redirect } from 'next/navigation';
import Link from 'next/link';

interface HostRoomPageProps { params: { roomCode: string } }

export const dynamic = 'force-dynamic';

export default function HostRoomPage({ params }: HostRoomPageProps) {
  const room = params.roomCode;
  // If we prefer central hosting under /admin/host, redirect there:
  if (room) {
    redirect(`/admin/host/${room}`);
  }
  // Fallback (should not normally render because redirect fires)
  return (
    <div className="min-h-screen flex items-center justify-center p-10 text-sm text-gray-700">
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold">Host Room</h1>
        <p>No room code provided.</p>
        <Link href="/" className="text-indigo-600 hover:underline">Go Home</Link>
      </div>
    </div>
  );
}