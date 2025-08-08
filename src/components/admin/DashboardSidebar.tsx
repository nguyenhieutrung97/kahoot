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
  ChevronLeft,
  Trophy,
  Calendar,
  Shield,
  X
} from "lucide-react";

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onMenuClick: (sectionId: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  children?: MenuItem[];
}

export function DashboardSidebar({ isOpen, onClose, isCollapsed, onToggleCollapse, onMenuClick }: DashboardSidebarProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const menuItems: MenuItem[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <Home className="h-5 w-5" />,
      href: "/admin"
    },
    {
      id: "lobby",
      label: "Lobby",
      icon: <Users className="h-5 w-5" />,
      href: "/admin/lobby"
    },
    {
      id: "questions",
      label: "Question",
      icon: <FileQuestion className="h-5 w-5" />,
      href: "/admin/questions"
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: <BarChart3 className="h-5 w-5" />,
      href: "/admin/analytics"
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="h-5 w-5" />,
      href: "/admin/settings"
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
            flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors relative group
            ${level > 0 ? 'pl-12' : ''}
            ${isCollapsed ? 'justify-center' : ''}
          `}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else if (item.href) {
              // Handle scroll to section
              onMenuClick(item.id);
              onClose(); // Close sidebar on mobile after navigation
            }
          }}
        >
          <span className={`${isCollapsed ? '' : 'mr-3'}`}>{item.icon}</span>
          {!isCollapsed && (
            <>
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
            </>
          )}

          {/* Tooltip for collapsed state */}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap z-50">
              {item.label}
            </div>
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
        fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-16' : 'lg:w-64'} w-64
      `}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold text-gray-900 lg:block hidden">Menu</h2>
          )}
          <div className="flex items-center space-x-2">
            {/* Collapse button - only visible on desktop */}
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-2 rounded-md hover:bg-gray-100 transition-colors"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronLeft className={`h-5 w-5 text-gray-500 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
            </button>

            {/* Close button - only visible on mobile */}
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Navigation menu */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1">
            {menuItems.map(item => renderMenuItem(item))}
          </div>
        </nav>

      </aside>
    </>
  );
}
