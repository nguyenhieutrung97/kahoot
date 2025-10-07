import { redirect } from 'next/navigation';
import Link from 'next/link';

// Next.js 15 PageProps now types params as a Promise; accept that shape.
export const dynamic = 'force-dynamic';

export default async function HostRoomPage({ params }: { params: Promise<{ roomCode?: string }> }) {
  const { roomCode } = await params;
  if (roomCode) {
    redirect(`/admin/host/${roomCode}`);
  }
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