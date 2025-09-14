"use client";
import React, { createContext, useContext, useState } from "react";

export type FinalResults = any; // Replace with stricter type if desired

interface FinalResultContextType {
  result: FinalResults | null;
  setResult: (r: FinalResults | null) => void;
}

const FinalResultContext = createContext<FinalResultContextType | undefined>(undefined);

export function FinalResultProvider({ children }: { children: React.ReactNode }) {
  const [result, setResult] = useState<FinalResults | null>(null);
  return (
    <FinalResultContext.Provider value={{ result, setResult }}>
      {children}
    </FinalResultContext.Provider>
  );
}

export function useFinalResult() {
  const ctx = useContext(FinalResultContext);
  if (!ctx) throw new Error("useFinalResult must be used within FinalResultProvider");
  return ctx;
}
