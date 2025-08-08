"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NewQuestionPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the dynamic route with 'new' as the id
    router.replace('/admin/question/new-question');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading question editor...</p>
      </div>
    </div>
  );
}
