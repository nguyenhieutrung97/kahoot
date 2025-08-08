"use client";

import { useState, useRef } from "react";
import { DashboardHeader } from "@/components/admin/DashboardHeader";
import { DashboardSidebar } from "@/components/admin/DashboardSidebar";
import { Users, FileQuestion, BarChart3, Settings as SettingsIcon, ChevronLeft, ChevronRight, MoreVertical, X, Trash2, LogIn, RotateCcw, Edit, Eye, EyeOff, Grid3X3, List, Filter, ArrowUpDown, Moon, Sun, User as UserIcon, Mail, Hash, ChevronDown } from "lucide-react";

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [currentQuestionPage, setCurrentQuestionPage] = useState(1);
  const [openQuestionDropdown, setOpenQuestionDropdown] = useState<number | null>(null);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [questionViewMode, setQuestionViewMode] = useState<'card' | 'list'>('card');
  const [questionFilter, setQuestionFilter] = useState<string[]>(['active', 'draft', 'inactive']);
  const [questionSort, setQuestionSort] = useState('created_desc');
  const [darkMode, setDarkMode] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const roomsPerPage = 6;
  const questionsPerPage = 6;

  // Sample question data
  const recentQuestions = [
    { id: 1, title: "What is the capital of Vietnam?", status: "active", createdDate: "2024-01-15", modifiedDate: "2024-01-15", image: "/api/placeholder/300/200" },
    { id: 2, title: "Which planet is known as the Red Planet?", status: "draft", createdDate: "2024-01-14", modifiedDate: "2024-01-14", image: "/api/placeholder/300/200" },
    { id: 3, title: "Who wrote Romeo and Juliet?", status: "active", createdDate: "2024-01-13", modifiedDate: "2024-01-13", image: "/api/placeholder/300/200" },
  ];

  const questionBank = [
    { id: 4, title: "What is photosynthesis?", status: "active", createdDate: "2024-01-12", modifiedDate: "2024-01-14", image: "/api/placeholder/300/200" },
    { id: 5, title: "Explain Newton's first law", status: "inactive", createdDate: "2024-01-11", modifiedDate: "2024-01-12", image: "/api/placeholder/300/200" },
    { id: 6, title: "What is machine learning?", status: "active", createdDate: "2024-01-10", modifiedDate: "2024-01-13", image: "/api/placeholder/300/200" },
    { id: 7, title: "History of World War II", status: "draft", createdDate: "2024-01-09", modifiedDate: "2024-01-10", image: "/api/placeholder/300/200" },
    { id: 8, title: "Basics of Chemistry", status: "active", createdDate: "2024-01-08", modifiedDate: "2024-01-11", image: "/api/placeholder/300/200" },
    { id: 9, title: "Geography of Asia", status: "inactive", createdDate: "2024-01-07", modifiedDate: "2024-01-09", image: "/api/placeholder/300/200" },
    { id: 10, title: "Introduction to Programming", status: "active", createdDate: "2024-01-06", modifiedDate: "2024-01-08", image: "/api/placeholder/300/200" },
    { id: 11, title: "Art History Renaissance", status: "draft", createdDate: "2024-01-05", modifiedDate: "2024-01-07", image: "/api/placeholder/300/200" },
    { id: 12, title: "Mathematics Calculus", status: "active", createdDate: "2024-01-04", modifiedDate: "2024-01-06", image: "/api/placeholder/300/200" },
  ];

  // Filter and sort logic
  const filteredQuestions = questionBank.filter(question =>
    questionFilter.includes(question.status)
  );

  const sortedQuestions = [...filteredQuestions].sort((a, b) => {
    switch (questionSort) {
      case 'created_asc':
        return new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime();
      case 'created_desc':
        return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
      case 'modified_asc':
        return new Date(a.modifiedDate).getTime() - new Date(b.modifiedDate).getTime();
      case 'modified_desc':
        return new Date(b.modifiedDate).getTime() - new Date(a.modifiedDate).getTime();
      case 'title_asc':
        return a.title.localeCompare(b.title);
      case 'title_desc':
        return b.title.localeCompare(a.title);
      default:
        return 0;
    }
  });

  const totalQuestionPages = Math.ceil(sortedQuestions.length / questionsPerPage);
  const currentQuestions = sortedQuestions.slice((currentQuestionPage - 1) * questionsPerPage, currentQuestionPage * questionsPerPage);

  const handleFilterChange = (status: string) => {
    setQuestionFilter(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
    setCurrentQuestionPage(1); // Reset to first page when filter changes
  };

  // Sample room data
  const allRooms = [
    { id: 1, name: "General Knowledge", players: 12, status: "live", timeAgo: "Started 10 min ago", createdDate: "2024-01-15" },
    { id: 2, name: "Science Quiz", players: 8, status: "ready", timeAgo: "Waiting to start", createdDate: "2024-01-14" },
    { id: 3, name: "History Challenge", players: 15, status: "close", timeAgo: "Ended 5 min ago", createdDate: "2024-01-13" },
    { id: 4, name: "Math Problems", players: 6, status: "ready", timeAgo: "Waiting to start", createdDate: "2024-01-12" },
    { id: 5, name: "Geography Test", players: 11, status: "ready", timeAgo: "Waiting to start", createdDate: "2024-01-11" },
    { id: 6, name: "Literature Quiz", players: 9, status: "close", timeAgo: "Ended 15 min ago", createdDate: "2024-01-10" },
    { id: 7, name: "Sports Trivia", players: 13, status: "ready", timeAgo: "Waiting to start", createdDate: "2024-01-09" },
    { id: 8, name: "Movie Quiz", players: 7, status: "ready", timeAgo: "Waiting to start", createdDate: "2024-01-08" },
    { id: 9, name: "Music Challenge", players: 10, status: "ready", timeAgo: "Waiting to start", createdDate: "2024-01-07" },
    { id: 10, name: "Art & Culture", players: 14, status: "ready", timeAgo: "Waiting to start", createdDate: "2024-01-06" },
  ];

  const totalPages = Math.ceil(allRooms.length / roomsPerPage);
  const currentRooms = allRooms.slice((currentPage - 1) * roomsPerPage, currentPage * roomsPerPage);

  const handleCloseRoom = (roomId: number) => {
    console.log(`Closing room ${roomId}`);
    setOpenDropdown(null);
  };

  const handleDeleteRoom = (roomId: number) => {
    console.log(`Deleting room ${roomId}`);
    setOpenDropdown(null);
  };

  const handleJoinRoom = (roomId: number) => {
    console.log(`Joining room ${roomId}`);
    setOpenDropdown(null);
  };

  const handleReactiveRoom = (roomId: number) => {
    console.log(`Reactivating room ${roomId}`);
    setOpenDropdown(null);
  };

  const handleEditQuestion = (questionId: number) => {
    console.log(`Editing question ${questionId}`);
    setOpenQuestionDropdown(null);
  };

  const handleDeleteQuestion = (questionId: number) => {
    console.log(`Deleting question ${questionId}`);
    setOpenQuestionDropdown(null);
  };

  const handleCloseQuestion = (questionId: number) => {
    console.log(`Closing question ${questionId}`);
    setOpenQuestionDropdown(null);
  };

  const handleReactiveQuestion = (questionId: number) => {
    console.log(`Reactivating question ${questionId}`);
    setOpenQuestionDropdown(null);
  };

  const handleCreateQuestion = () => {
    // Navigate to create new question page
    window.location.href = '/admin/question/new';
  };

  const handleEditQuestionNavigation = (questionId: number) => {
    // Navigate to edit question page
    window.location.href = `/admin/question/${questionId}`;
  };

  const handleQuestionCardClick = (questionId: number) => {
    // Navigate to edit question page when clicking on card
    window.location.href = `/admin/question/${questionId}`;
  };

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
        onProfileClick={() => setShowProfilePopup(true)}
        onSettingsClick={() => setShowSettingsPopup(true)}
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
                <div className="p-6 space-y-8">
                  {/* Recent Questions Subsection */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Questions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recentQuestions.map((question) => (
                        <div key={question.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden relative z-10">
                          {/* Question Image */}
                          <div className="h-32 bg-gray-200 flex items-center justify-center">
                            <FileQuestion className="h-12 w-12 text-gray-400" />
                          </div>

                          {/* Question Info */}
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-medium text-gray-900 text-sm line-clamp-2 flex-1 pr-2">{question.title}</h3>

                              {/* Dropdown Menu */}
                              <div className="relative flex-shrink-0 z-30">
                                <button
                                  onClick={() => setOpenQuestionDropdown(openQuestionDropdown === question.id ? null : question.id)}
                                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                                >
                                  <MoreVertical className="h-4 w-4 text-gray-600" />
                                </button>

                                {openQuestionDropdown === question.id && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-[60]"
                                      onClick={() => setOpenQuestionDropdown(null)}
                                    />

                                    <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[70]">
                                      <button
                                        onClick={() => handleEditQuestion(question.id)}
                                        className={`w-full px-3 py-2 text-left text-sm flex items-center space-x-2 ${
                                          question.status === 'active'
                                            ? 'text-gray-700 hover:bg-gray-50'
                                            : 'text-green-600 hover:bg-green-50'
                                        }`}
                                      >
                                        <Edit className="h-4 w-4" />
                                        <span>Edit</span>
                                      </button>

                                      <button
                                        onClick={() => question.status === 'active' ? handleCloseQuestion(question.id) : handleReactiveQuestion(question.id)}
                                        className={`w-full px-3 py-2 text-left text-sm flex items-center space-x-2 ${
                                          question.status === 'active'
                                            ? 'text-gray-700 hover:bg-gray-50'
                                            : 'text-green-600 hover:bg-green-50'
                                        }`}
                                      >
                                        {question.status === 'active' ? <X className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                                        <span>{question.status === 'active' ? 'Close' : 'Re-active'}</span>
                                      </button>

                                      <button
                                        onClick={() => handleDeleteQuestion(question.id)}
                                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        <span>Delete</span>
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <span className={`inline-block px-2 py-1 text-xs rounded ${
                                question.status === 'active' ? 'bg-green-100 text-green-800' :
                                question.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {question.status.charAt(0).toUpperCase() + question.status.slice(1)}
                              </span>

                              <div className="text-xs text-gray-500 space-y-1">
                                <p>Created: {new Date(question.createdDate).toLocaleDateString()}</p>
                                <p>Modified: {new Date(question.modifiedDate).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Question Bank Subsection */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Question Bank</h3>

                      {/* Controls */}
                      <div className="flex items-center space-x-4">
                        {/* Filter Dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                            className="flex items-center space-x-2 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <Filter className="h-4 w-4 text-gray-500" />
                            <span>Filter ({questionFilter.length})</span>
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          </button>

                          {showFilterDropdown && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowFilterDropdown(false)}
                              />
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[70]">
                                <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Status Filter</div>
                                {['active', 'draft', 'inactive'].map((status) => (
                                  <label key={status} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={questionFilter.includes(status)}
                                      onChange={() => handleFilterChange(status)}
                                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700 capitalize">{status}</span>
                                    <span className={`ml-auto w-2 h-2 rounded-full ${
                                      status === 'active' ? 'bg-green-500' :
                                      status === 'draft' ? 'bg-yellow-500' : 'bg-gray-500'
                                    }`}></span>
                                  </label>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Sort Dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => setShowSortDropdown(!showSortDropdown)}
                            className="flex items-center space-x-2 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <ArrowUpDown className="h-4 w-4 text-gray-500" />
                            <span>Sort</span>
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          </button>

                          {showSortDropdown && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowSortDropdown(false)}
                              />
                              <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[70]">
                                <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Sort Options</div>
                                {[
                                  { value: 'created_desc', label: 'Created: Newest First' },
                                  { value: 'created_asc', label: 'Created: Oldest First' },
                                  { value: 'modified_desc', label: 'Modified: Newest First' },
                                  { value: 'modified_asc', label: 'Modified: Oldest First' },
                                  { value: 'title_asc', label: 'Title: A → Z' },
                                  { value: 'title_desc', label: 'Title: Z → A' }
                                ].map((option) => (
                                  <button
                                    key={option.value}
                                    onClick={() => {
                                      setQuestionSort(option.value);
                                      setShowSortDropdown(false);
                                      setCurrentQuestionPage(1);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                                      questionSort === option.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex border border-gray-300 rounded-md">
                          <button
                            onClick={() => setQuestionViewMode('card')}
                            className={`p-2 transition-colors ${questionViewMode === 'card' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                          >
                            <Grid3X3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setQuestionViewMode('list')}
                            className={`p-2 transition-colors ${questionViewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                          >
                            <List className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Questions Display */}
                    {questionViewMode === 'card' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {currentQuestions.map((question) => (
                          <div key={question.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden relative z-10">
                            {/* Question Image */}
                            <div className="h-32 bg-gray-200 flex items-center justify-center">
                              <FileQuestion className="h-12 w-12 text-gray-400" />
                            </div>

                            {/* Question Info */}
                            <div className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-medium text-gray-900 text-sm line-clamp-2 flex-1 pr-2">{question.title}</h3>

                                {/* Dropdown Menu */}
                                <div className="relative flex-shrink-0 z-30">
                                  <button
                                    onClick={() => setOpenQuestionDropdown(openQuestionDropdown === question.id ? null : question.id)}
                                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                                  >
                                    <MoreVertical className="h-4 w-4 text-gray-600" />
                                  </button>

                                  {openQuestionDropdown === question.id && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-[60]"
                                        onClick={() => setOpenQuestionDropdown(null)}
                                      />

                                      <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[70]">
                                        <button
                                          onClick={() => handleEditQuestion(question.id)}
                                          className={`w-full px-3 py-2 text-left text-sm flex items-center space-x-2 ${
                                          question.status === 'active'
                                            ? 'text-gray-700 hover:bg-gray-50'
                                            : 'text-green-600 hover:bg-green-50'
                                        }`}
                                        >
                                          <Edit className="h-4 w-4" />
                                          <span>Edit</span>
                                        </button>

                                        <button
                                          onClick={() => question.status === 'active' ? handleCloseQuestion(question.id) : handleReactiveQuestion(question.id)}
                                          className={`w-full px-3 py-2 text-left text-sm flex items-center space-x-2 ${
                                          question.status === 'active'
                                            ? 'text-gray-700 hover:bg-gray-50'
                                            : 'text-green-600 hover:bg-green-50'
                                        }`}
                                        >
                                          {question.status === 'active' ? <X className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                                        <span>{question.status === 'active' ? 'Close' : 'Re-active'}</span>
                                        </button>

                                        <button
                                          onClick={() => handleDeleteQuestion(question.id)}
                                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          <span>Delete</span>
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <span className={`inline-block px-2 py-1 text-xs rounded ${
                                  question.status === 'active' ? 'bg-green-100 text-green-800' :
                                  question.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {question.status.charAt(0).toUpperCase() + question.status.slice(1)}
                                </span>

                                <div className="text-xs text-gray-500 space-y-1">
                                  <p>Created: {new Date(question.createdDate).toLocaleDateString()}</p>
                                  <p>Modified: {new Date(question.modifiedDate).toLocaleDateString()}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2 mb-6">
                        {currentQuestions.map((question) => (
                          <div key={question.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">{question.title}</h3>
                              <div className="flex items-center space-x-4 mt-1">
                                <span className={`px-2 py-1 text-xs rounded ${
                                  question.status === 'active' ? 'bg-green-100 text-green-800' :
                                  question.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {question.status.charAt(0).toUpperCase() + question.status.slice(1)}
                                </span>
                                <span className="text-xs text-gray-500">Created: {new Date(question.createdDate).toLocaleDateString()}</span>
                                <span className="text-xs text-gray-500">Modified: {new Date(question.modifiedDate).toLocaleDateString()}</span>
                              </div>
                            </div>

                            {/* Dropdown Menu */}
                            <div className="relative flex-shrink-0 z-30">
                              <button
                                onClick={() => setOpenQuestionDropdown(openQuestionDropdown === question.id ? null : question.id)}
                                className="p-1 rounded hover:bg-gray-100 transition-colors"
                              >
                                <MoreVertical className="h-4 w-4 text-gray-600" />
                              </button>

                              {openQuestionDropdown === question.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-[60]"
                                    onClick={() => setOpenQuestionDropdown(null)}
                                  />

                                  <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[70]">
                                    <button
                                      onClick={() => handleEditQuestion(question.id)}
                                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                                    >
                                      <Edit className="h-4 w-4" />
                                      <span>Edit</span>
                                    </button>

                                    <button
                                      onClick={() => handleToggleQuestionStatus(question.id)}
                                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                                    >
                                      {question.status === 'active' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                      <span>{question.status === 'active' ? 'Deactivate' : 'Activate'}</span>
                                    </button>

                                    <button
                                      onClick={() => handleDeleteQuestion(question.id)}
                                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pagination for Question Bank */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Showing {((currentQuestionPage - 1) * questionsPerPage) + 1} to {Math.min(currentQuestionPage * questionsPerPage, sortedQuestions.length)} of {sortedQuestions.length} questions
                        {sortedQuestions.length !== questionBank.length && (
                          <span className="text-blue-600 ml-1">(filtered from {questionBank.length})</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setCurrentQuestionPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentQuestionPage === 1}
                          className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Previous
                        </button>

                        <div className="flex space-x-1">
                          {Array.from({ length: totalQuestionPages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => setCurrentQuestionPage(page)}
                              className={`px-3 py-1 text-sm border rounded ${
                                currentQuestionPage === page
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => setCurrentQuestionPage(prev => Math.min(prev + 1, totalQuestionPages))}
                          disabled={currentQuestionPage === totalQuestionPages}
                          className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Next
                        </button>
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
                        className={`p-4 rounded-lg border-2 transition-colors relative ${
                          room.status === "live"
                            ? "bg-green-50 border-green-200"
                            : room.status === "ready"
                            ? "bg-blue-50 border-blue-200"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900 truncate pr-2">{room.name}</h3>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded ${
                                room.status === "live"
                                  ? "bg-green-600 text-white"
                                  : room.status === "ready"
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-600 text-white"
                              }`}
                            >
                              {room.status === "live" ? "Live" : room.status === "ready" ? "Ready" : "Close"}
                            </span>

                            {/* Dropdown Menu */}
                            <div className="relative">
                              <button
                                onClick={() => setOpenDropdown(openDropdown === room.id ? null : room.id)}
                                className="p-1 rounded hover:bg-gray-200 transition-colors"
                              >
                                <MoreVertical className="h-4 w-4 text-gray-600" />
                              </button>

                              {openDropdown === room.id && (
                                <>
                                  {/* Overlay to close dropdown */}
                                  <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setOpenDropdown(null)}
                                  />

                                  {/* Dropdown Menu */}
                                  <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                    {(room.status === "live" || room.status === "ready") && (
                                      <>
                                        <button
                                          onClick={() => handleJoinRoom(room.id)}
                                          className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center space-x-2"
                                        >
                                          <LogIn className="h-4 w-4" />
                                          <span>Join</span>
                                        </button>
                                        <button
                                          onClick={() => handleCloseRoom(room.id)}
                                          className={`w-full px-3 py-2 text-left text-sm flex items-center space-x-2 ${
                                          question.status === 'active'
                                            ? 'text-gray-700 hover:bg-gray-50'
                                            : 'text-green-600 hover:bg-green-50'
                                        }`}
                                        >
                                          <X className="h-4 w-4" />
                                          <span>Close</span>
                                        </button>
                                      </>
                                    )}

                                    {room.status === "close" && (
                                      <button
                                        onClick={() => handleReactiveRoom(room.id)}
                                        className="w-full px-3 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center space-x-2"
                                      >
                                        <RotateCcw className="h-4 w-4" />
                                        <span>Re-active</span>
                                      </button>
                                    )}

                                    <button
                                      onClick={() => handleDeleteRoom(room.id)}
                                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>{room.players} players • {room.timeAgo}</p>
                          <p>Created: {new Date(room.createdDate).toLocaleDateString()}</p>
                        </div>
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
                <div className="p-6 space-y-8">
                  {/* Monthly Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Questions Created This Month */}
                    <div className="bg-blue-50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-blue-900">Questions Created</h3>
                          <p className="text-sm text-blue-600">This Month</p>
                        </div>
                        <FileQuestion className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="text-3xl font-bold text-blue-800 mb-2">156</div>
                      <div className="text-sm text-green-600">+23% from last month</div>
                    </div>

                    {/* Lobbies Created This Month */}
                    <div className="bg-green-50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-green-900">Lobbies Created</h3>
                          <p className="text-sm text-green-600">This Month</p>
                        </div>
                        <Users className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="text-3xl font-bold text-green-800 mb-2">89</div>
                      <div className="text-sm text-green-600">+12% from last month</div>
                    </div>

                    {/* Players Joined This Month */}
                    <div className="bg-purple-50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-purple-900">Players Joined</h3>
                          <p className="text-sm text-purple-600">This Month</p>
                        </div>
                        <UserIcon className="h-8 w-8 text-purple-600" />
                      </div>
                      <div className="text-3xl font-bold text-purple-800 mb-2">2,847</div>
                      <div className="text-sm text-green-600">+18% from last month</div>
                    </div>
                  </div>

                  {/* Questions Created Chart (Last 6 Months) */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Questions Created (Last 6 Months)</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-end justify-between h-48 space-x-4">
                        {[{month: 'Aug', value: 89}, {month: 'Sep', value: 124}, {month: 'Oct', value: 167}, {month: 'Nov', value: 143}, {month: 'Dec', value: 189}, {month: 'Jan', value: 156}].map((data, index) => (
                          <div key={index} className="flex flex-col items-center flex-1">
                            <div
                              className="bg-blue-600 rounded-t w-full transition-all duration-300 hover:bg-blue-700 flex items-end justify-center pb-2"
                              style={{height: `${(data.value / 200) * 100}%`, minHeight: '30px'}}
                            >
                              <span className="text-xs text-white font-semibold">{data.value}</span>
                            </div>
                            <span className="text-sm text-gray-600 mt-2 font-medium">{data.month}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Lobbies and Players Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Lobbies Created Chart */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Lobbies Created (Last 6 Months)</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-end justify-between h-32 space-x-2">
                          {[{month: 'Aug', value: 45}, {month: 'Sep', value: 67}, {month: 'Oct', value: 83}, {month: 'Nov', value: 72}, {month: 'Dec', value: 94}, {month: 'Jan', value: 89}].map((data, index) => (
                            <div key={index} className="flex flex-col items-center flex-1">
                              <div
                                className="bg-green-600 rounded-t w-full transition-all duration-300 hover:bg-green-700 flex items-end justify-center pb-1"
                                style={{height: `${(data.value / 100) * 100}%`, minHeight: '20px'}}
                              >
                                <span className="text-xs text-white font-semibold">{data.value}</span>
                              </div>
                              <span className="text-xs text-gray-600 mt-1">{data.month}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Players Joined Chart */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Players Joined (Last 6 Months)</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-end justify-between h-32 space-x-2">
                          {[{month: 'Aug', value: 1890}, {month: 'Sep', value: 2234}, {month: 'Oct', value: 2567}, {month: 'Nov', value: 2123}, {month: 'Dec', value: 2989}, {month: 'Jan', value: 2847}].map((data, index) => (
                            <div key={index} className="flex flex-col items-center flex-1">
                              <div
                                className="bg-purple-600 rounded-t w-full transition-all duration-300 hover:bg-purple-700 flex items-end justify-center pb-1"
                                style={{height: `${(data.value / 3000) * 100}%`, minHeight: '20px'}}
                              >
                                <span className="text-xs text-white font-semibold">{Math.round(data.value/1000*10)/10}k</span>
                              </div>
                              <span className="text-xs text-gray-600 mt-1">{data.month}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900">567</div>
                        <div className="text-sm text-gray-600">Total Questions</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900">234</div>
                        <div className="text-sm text-gray-600">Total Lobbies</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900">12.4k</div>
                        <div className="text-sm text-gray-600">Total Players</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900">8.5 min</div>
                        <div className="text-sm text-gray-600">Avg Session</div>
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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* General Settings */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>

                      {/* Theme Toggle */}
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {darkMode ? <Moon className="h-5 w-5 text-gray-600" /> : <Sun className="h-5 w-5 text-gray-600" />}
                          <div>
                            <p className="font-medium text-gray-900">Theme</p>
                            <p className="text-sm text-gray-500">
                              {darkMode ? 'Dark mode is enabled' : 'Light mode is enabled'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setDarkMode(!darkMode)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            darkMode ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              darkMode ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* System Information */}
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
                        <div className="flex justify-between">
                          <span className="text-gray-600">Uptime:</span>
                          <span className="font-semibold">7 days, 14 hours</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Memory usage:</span>
                          <span className="font-semibold">68%</span>
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

      {/* Profile Popup */}
      {showProfilePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">User Profile</h3>
              <button
                onClick={() => setShowProfilePopup(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex flex-col items-center space-y-6">
                {/* Avatar */}
                <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center">
                  <UserIcon className="h-10 w-10 text-white" />
                </div>

                {/* User Info */}
                <div className="w-full space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value="John"
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value="Doe"
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                    <div className="flex items-center space-x-2">
                      <Hash className="h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value="ADM001"
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        value="john.doe@admin.com"
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Popup */}
      {showSettingsPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Settings</h3>
              <button
                onClick={() => setShowSettingsPopup(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* General Settings */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h4>

                  {/* Theme Toggle */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {darkMode ? <Moon className="h-5 w-5 text-gray-600" /> : <Sun className="h-5 w-5 text-gray-600" />}
                      <div>
                        <p className="font-medium text-gray-900">Theme</p>
                        <p className="text-sm text-gray-500">{darkMode ? 'Dark mode' : 'Light mode'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDarkMode(!darkMode)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        darkMode ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          darkMode ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* System Information */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">System Information</h4>
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
                    <div className="flex justify-between">
                      <span className="text-gray-600">Uptime:</span>
                      <span className="font-semibold">7 days, 14 hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Memory usage:</span>
                      <span className="font-semibold">68%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
