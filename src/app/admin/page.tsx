"use client";

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
      <p>This is a simplified admin page to test if the app is working.</p>
      <div className="mt-8">
        <a href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Back to Home
        </a>
      </div>
    </div>
  );
}
