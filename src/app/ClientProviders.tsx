"use client";
import React from "react";
import { FinalResultProvider } from "@/context/FinalResultContext";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return <FinalResultProvider>{children}</FinalResultProvider>;
}
