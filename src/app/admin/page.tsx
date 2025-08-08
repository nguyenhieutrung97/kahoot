"use client";

import { useState, useRef } from "react";
import { DashboardHeader } from "@/components/admin/DashboardHeader";
import { DashboardSidebar } from "@/components/admin/DashboardSidebar";
import { Users, FileQuestion, BarChart3, Settings as SettingsIcon, ChevronLeft, ChevronRight } from "lucide-react";

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const roomsPerPage = 6;

  // Sample room data
  const allRooms = [
    { id: 1, name: "General Knowledge", players: 12, status: "live", timeAgo: "Started 10 min ago" },
    { id: 2, name: "Science Quiz", players: 8, status: "ready", timeAgo: "Waiting to start" },
    { id: 3, name: "History Challenge", players: 15, status: "close", timeAgo: "Ended 5 min ago" },
    { id: 4, name: "Math Problems", players: 6, status: "ready", timeAgo: "Waiting to start" },
    { id: 5, name: "Geography Test", players: 11, status: "ready", timeAgo: "Waiting to start" },
    { id: 6, name: "Literature Quiz", players: 9, status: "close", timeAgo: "Ended 15 min ago" },
    { id: 7, name: "Sports Trivia", players: 13, status: "ready", timeAgo: "Waiting to start" },
    { id: 8, name: "Movie Quiz", players: 7, status: "ready", timeAgo: "Waiting to start" },
    { id: 9, name: "Music Challenge", players: 10, status: "ready", timeAgo: "Waiting to start" },
    { id: 10, name: "Art & Culture", players: 14, status: "ready", timeAgo: "Waiting to start" },
  ];

  const totalPages = Math.ceil(allRooms.length / roomsPerPage);
  const currentRooms = allRooms.slice((currentPage - 1) * roomsPerPage, currentPage * roomsPerPage);

  // Refs for sections
  const dashboardRef = useRef<HTMLElement>(null);
  const lobbyRef = useRef<HTMLElement>(null);
  const questionsRef = useRef<HTMLElement>(null);
  const analyticsRef = useRef<HTMLElement>(null);
  const settingsRef = useRef<HTMLElement>(null);

  const scrollToSection = (sectionId: string) => {
    const refs = {
      dashboard: dashboardRef,
      questions: questionsRef,
      lobby: lobbyRef,
      analytics: analyticsRef,
      settings: settingsRef,
    };

    const targetRef = refs[sectionId as keyof typeof refs];
    if (targetRef?.current) {
      targetRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <DashboardHeader 
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />
      
      {/* Main layout với sidebar và content */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <DashboardSidebar 
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onMenuClick={scrollToSection}
        />
        
        {/* Main Content */}
        <main className={`flex-1 overflow-auto transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-0'}`}>
          <div className="max-w-7xl mx-auto p-6 space-y-12">
            
            {/* Dashboard Section */}
            <section ref={dashboardRef} id="dashboard" className="scroll-mt-6">
              {/* Dashboard stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Total Rooms
                  </h3>
                  <p className="text-3xl font-bold text-blue-600">24</p>
                  <p className="text-sm text-gray-500">+12% from last month</p>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Questions Created
                  </h3>
                  <p className="text-3xl font-bold text-green-600">567</p>
                  <p className="text-sm text-gray-500">+25 new questions</p>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Average Players Join
                  </h3>
                  <p className="text-3xl font-bold text-purple-600">18.5</p>
                  <p className="text-sm text-gray-500">per room session</p>
                </div>
              </div>
              
            </section>

            {/* Questions Section */}
            <section ref={questionsRef} id="questions" className="scroll-mt-6">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center space-x-3">
                  <FileQuestion className="h-6 w-6 text-green-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Question</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Bank</h3>
                      <div className="space-y-3">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium text-gray-900">General Knowledge</h4>
                            <span className="text-sm text-gray-500">156 questions</span>
                          </div>
                          <p className="text-sm text-gray-600">Last updated: 2 hours ago</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium text-gray-900">Science & Technology</h4>
                            <span className="text-sm text-gray-500">89 questions</span>
                          </div>
                          <p className="text-sm text-gray-600">Last updated: 1 day ago</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium text-gray-900">History</h4>
                            <span className="text-sm text-gray-500">124 questions</span>
                          </div>
                          <p className="text-sm text-gray-600">Last updated: 3 days ago</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Questions</h3>
                      <div className="space-y-3">
                        <div className="p-3 border border-gray-200 rounded">
                          <p className="font-medium text-sm">What is the capital of Vietnam?</p>
                          <p className="text-xs text-gray-500 mt-1">Category: Geography • Added 1 hour ago</p>
                        </div>
                        <div className="p-3 border border-gray-200 rounded">
                          <p className="font-medium text-sm">Which planet is known as the Red Planet?</p>
                          <p className="text-xs text-gray-500 mt-1">Category: Science • Added 3 hours ago</p>
                        </div>
                        <div className="p-3 border border-gray-200 rounded">
                          <p className="font-medium text-sm">Who wrote "Romeo and Juliet"?</p>
                          <p className="text-xs text-gray-500 mt-1">Category: Literature • Added 5 hours ago</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Lobby Section */}
            <section ref={lobbyRef} id="lobby" className="scroll-mt-6">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center space-x-3">
                  <Users className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Lobby</h2>
                </div>
                <div className="p-6">
                  {/* Rooms Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {currentRooms.map((room) => (
                      <div
                        key={room.id}
                        className={`p-4 rounded-lg border-2 transition-colors ${
                          room.status === "live"
                            ? "bg-green-50 border-green-200"
                            : "bg-blue-50 border-blue-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900 truncate">{room.name}</h3>
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded ${
                              room.status === "live"
                                ? "bg-green-600 text-white"
                                : "bg-blue-600 text-white"
                            }`}
                          >
                            {room.status === "live" ? "Live" : "Ready"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {room.players} players • {room.timeAgo}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Showing {((currentPage - 1) * roomsPerPage) + 1} to {Math.min(currentPage * roomsPerPage, allRooms.length)} of {allRooms.length} rooms
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>

                      <div className="flex space-x-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 text-sm border rounded ${
                              currentPage === page
                                ? "bg-blue-600 text-white border-blue-600"
                                : "border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Analytics Section */}
            <section ref={analyticsRef} id="analytics" className="scroll-mt-6">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center space-x-3">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">Average Score</span>
                            <span className="text-xl font-bold text-blue-600">78.5%</span>
                          </div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">Completion Rate</span>
                            <span className="text-xl font-bold text-green-600">92.3%</span>
                          </div>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">User Engagement</span>
                            <span className="text-xl font-bold text-purple-600">85.7%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Trends</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-600">Peak hours:</span>
                          <span className="font-semibold">2:00 PM - 4:00 PM</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-600">Most popular category:</span>
                          <span className="font-semibold">General Knowledge</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-600">Average session time:</span>
                          <span className="font-semibold">8.5 minutes</span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-gray-600">Return rate:</span>
                          <span className="font-semibold">67.2%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Settings Section */}
            <section ref={settingsRef} id="settings" className="scroll-mt-6">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center space-x-3">
                  <SettingsIcon className="h-6 w-6 text-gray-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">Default room capacity</p>
                            <p className="text-sm text-gray-500">Maximum players per room</p>
                          </div>
                          <input 
                            type="number" 
                            defaultValue="20" 
                            className="w-20 px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">Question time limit</p>
                            <p className="text-sm text-gray-500">Seconds per question</p>
                          </div>
                          <input 
                            type="number" 
                            defaultValue="30" 
                            className="w-20 px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">Auto-start rooms</p>
                            <p className="text-sm text-gray-500">Start when minimum players join</p>
                          </div>
                          <input 
                            type="checkbox" 
                            defaultChecked 
                            className="w-5 h-5 text-blue-600"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Version:</span>
                          <span className="font-semibold">2.1.0</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Last update:</span>
                          <span className="font-semibold">Today, 10:30 AM</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Server status:</span>
                          <span className="text-green-600 font-semibold">Online</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Database status:</span>
                          <span className="text-green-600 font-semibold">Connected</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
