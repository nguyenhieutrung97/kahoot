"use client";

import { useState } from "react";
import { 
  Home, 
  Users, 
  FileQuestion, 
  BarChart3, 
  Settings, 
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Trophy,
  Calendar,
  Shield,
  X
} from "lucide-react";

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  children?: MenuItem[];
}

export function DashboardSidebar({ isOpen, onClose }: DashboardSidebarProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const menuItems: MenuItem[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <Home className="h-5 w-5" />,
      href: "/admin"
    },
    {
      id: "rooms",
      label: "Room Management",
      icon: <Users className="h-5 w-5" />,
      children: [
        { id: "all-rooms", label: "All Rooms", icon: <></>, href: "/admin/rooms" },
        { id: "active-rooms", label: "Active Rooms", icon: <></>, href: "/admin/rooms/active" },
        { id: "create-room", label: "Create Room", icon: <></>, href: "/admin/rooms/create" }
      ]
    },
    {
      id: "questions",
      label: "Question Bank",
      icon: <FileQuestion className="h-5 w-5" />,
      children: [
        { id: "all-questions", label: "All Questions", icon: <></>, href: "/admin/questions" },
        { id: "categories", label: "Categories", icon: <></>, href: "/admin/questions/categories" },
        { id: "create-question", label: "Create Question", icon: <></>, href: "/admin/questions/create" }
      ]
    },
    {
      id: "users",
      label: "Users",
      icon: <Users className="h-5 w-5" />,
      children: [
        { id: "all-users", label: "All Users", icon: <></>, href: "/admin/users" },
        { id: "online-users", label: "Online Users", icon: <></>, href: "/admin/users/online" },
        { id: "user-reports", label: "Reports", icon: <></>, href: "/admin/users/reports" }
      ]
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: <BarChart3 className="h-5 w-5" />,
      href: "/admin/analytics"
    },
    {
      id: "leaderboard",
      label: "Leaderboard",
      icon: <Trophy className="h-5 w-5" />,
      href: "/admin/leaderboard"
    },
    {
      id: "events",
      label: "Events",
      icon: <Calendar className="h-5 w-5" />,
      href: "/admin/events"
    },
    {
      id: "security",
      label: "Security",
      icon: <Shield className="h-5 w-5" />,
      children: [
        { id: "access-logs", label: "Access Logs", icon: <></>, href: "/admin/security/logs" },
        { id: "permissions", label: "Permissions", icon: <></>, href: "/admin/security/permissions" }
      ]
    },
    {
      id: "settings",
      label: "Cài đặt",
      icon: <Settings className="h-5 w-5" />,
      href: "/admin/settings"
    },
    {
      id: "help",
      label: "Trợ giúp",
      icon: <HelpCircle className="h-5 w-5" />,
      href: "/admin/help"
    }
  ];

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id}>
        <div
          className={`
            flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors
            ${level > 0 ? 'pl-12' : ''}
          `}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else if (item.href) {
              // Handle navigation here
              console.log(`Navigating to: ${item.href}`);
              onClose(); // Close sidebar on mobile after navigation
            }
          }}
        >
          <span className="mr-3">{item.icon}</span>
          <span className="flex-1">{item.label}</span>
          {hasChildren && (
            <span className="ml-auto">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="bg-gray-25">
            {item.children?.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 lg:hidden">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Navigation menu */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1">
            {menuItems.map(item => renderMenuItem(item))}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <div className="text-xs text-gray-500 text-center">
            © 2024 Quiz Platform
            <br />
            Phiên bản 2.1.0
          </div>
        </div>
      </aside>
    </>
  );
}
