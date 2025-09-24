import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join Game",
  description: "Join an interactive quiz game by entering a room code. Experience fun and competitive learning with real-time gameplay.",
  openGraph: {
    title: "Join Game - BD Kahoot",
    description: "Join an interactive quiz game by entering a room code. Experience fun and competitive learning with real-time gameplay.",
  },
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
