"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/admin/DashboardHeader";
import { DashboardSidebar } from "@/components/admin/DashboardSidebar";

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        />
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Dashboard Quản Trị
              </h1>
              <p className="text-gray-600">
                Chào mừng bạn đến với bảng điều khiển quản trị hệ thống
              </p>
            </div>
            
            {/* Dashboard content */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Tổng số phòng
                </h3>
                <p className="text-3xl font-bold text-blue-600">24</p>
                <p className="text-sm text-gray-500">+12% so với tháng trước</p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Người chơi hoạt động
                </h3>
                <p className="text-3xl font-bold text-green-600">1,234</p>
                <p className="text-sm text-gray-500">+5% so với tuần trước</p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Câu hỏi đã tạo
                </h3>
                <p className="text-3xl font-bold text-purple-600">567</p>
                <p className="text-sm text-gray-500">+25 câu hỏi mới</p>
              </div>
            </div>
            
            {/* Recent activity */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Hoạt động gần đây
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="font-medium text-gray-900">Phòng mới được tạo</p>
                      <p className="text-sm text-gray-500">Phòng "Kiến thức tổng hợp" - 5 phút trước</p>
                    </div>
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                      Mới
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="font-medium text-gray-900">Người chơi tham gia</p>
                      <p className="text-sm text-gray-500">15 người chơi mới trong 1 giờ qua</p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                      Hoạt động
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-gray-900">Cập nhật hệ thống</p>
                      <p className="text-sm text-gray-500">Phiên bản 2.1.0 đã được triển khai</p>
                    </div>
                    <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">
                      Hoàn thành
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
