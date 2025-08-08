"use client";

import { useState } from "react";
import { Search, Menu, Settings, LogOut, User } from "lucide-react";

interface DashboardHeaderProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
  onProfileClick: () => void;
  onSettingsClick: () => void;
}

export function DashboardHeader({ onMenuClick, sidebarOpen }: DashboardHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality here
    console.log("Searching for:", searchQuery);
  };

  const handleLogout = () => {
    // Implement logout functionality here
    console.log("Logging out...");
    setAvatarMenuOpen(false);
  };

  const handleSettings = () => {
    // Implement settings navigation here
    console.log("Opening settings...");
    setAvatarMenuOpen(false);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-6 relative z-50">
      {/* Left side - Menu button và heading */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>
        
        <h1 className="text-xl font-bold text-red-600 uppercase tracking-wide">
          ADMIN DASHBOARD
        </h1>
      </div>

      {/* Center - Search bar */}
      <div className="hidden md:flex flex-1 max-w-md mx-8">
        <form onSubmit={handleSearch} className="w-full relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </form>
      </div>

      {/* Right side - Avatar menu */}
      <div className="relative">
        <button
          onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
          className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="User menu"
        >
          <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
          <span className="hidden md:block text-sm font-medium text-gray-700">
            Admin
          </span>
        </button>

        {/* Dropdown menu */}
        {avatarMenuOpen && (
          <>
            {/* Overlay để đóng menu khi click bên ngoài */}
            <div 
              className="fixed inset-0 z-10"
              onClick={() => setAvatarMenuOpen(false)}
            />
            
            {/* Menu dropdown */}
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
              <button
                onClick={() => {
                  console.log("Opening profile...");
                  setAvatarMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors"
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </button>

              <button
                onClick={handleSettings}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </button>

              <hr className="my-1 border-gray-100" />

              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
