"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Eye,
  Play,
  Plus,
  Trash2,
  Image as ImageIcon,
  Type,
  Circle,
  Square,
  Triangle,
  Palette,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Upload,
  X,
  Check,
  MoreHorizontal
} from "lucide-react";

interface Answer {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuestionSlide {
  id: string;
  question: string;
  answers: Answer[];
  backgroundColor: string;
  textColor: string;
  fontSize: string;
  backgroundImage?: string;
  questionImage?: string;
  questionType: 'single-choice' | 'multiple-choice' | 'true-false';
  timeLimit: number;
  points: number;
}

export default function NewQuestionPage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedTool, setSelectedTool] = useState('select');
  const [showPreview, setShowPreview] = useState(false);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const questionImageInputRef = useRef<HTMLInputElement>(null);

  // New question with default values
  const [slides, setSlides] = useState<QuestionSlide[]>([
    {
      id: '1',
      question: 'Enter your question here...',
      answers: [
        { id: 'a1', text: 'Answer 1', isCorrect: false },
        { id: 'a2', text: 'Answer 2', isCorrect: true },
        { id: 'a3', text: 'Answer 3', isCorrect: false },
        { id: 'a4', text: 'Answer 4', isCorrect: false }
      ],
      backgroundColor: '#ffffff',
      textColor: '#000000',
      fontSize: 'text-2xl',
      questionType: 'single-choice',
      timeLimit: 30,
      points: 100
    }
  ]);

  const updateSlide = (slideIndex: number, updates: Partial<QuestionSlide>) => {
    setSlides(prev => prev.map((slide, index) =>
      index === slideIndex ? { ...slide, ...updates } : slide
    ));
  };

  const addAnswer = () => {
    const newAnswer: Answer = {
      id: `a${Date.now()}`,
      text: 'New Answer',
      isCorrect: false
    };

    updateSlide(currentSlide, {
      answers: [...slides[currentSlide].answers, newAnswer]
    });
  };

  const removeAnswer = (answerId: string) => {
    updateSlide(currentSlide, {
      answers: slides[currentSlide].answers.filter(a => a.id !== answerId)
    });
  };

  const updateAnswer = (answerId: string, text: string) => {
    updateSlide(currentSlide, {
      answers: slides[currentSlide].answers.map(a =>
        a.id === answerId ? { ...a, text } : a
      )
    });
  };

  const toggleCorrectAnswer = (answerId: string) => {
    updateSlide(currentSlide, {
      answers: slides[currentSlide].answers.map(a =>
        a.id === answerId ? { ...a, isCorrect: !a.isCorrect } : a
      )
    });
  };

  const addSlide = () => {
    const newSlide: QuestionSlide = {
      id: Date.now().toString(),
      question: 'New Question',
      answers: [
        { id: 'a1', text: 'Answer 1', isCorrect: false },
        { id: 'a2', text: 'Answer 2', isCorrect: true }
      ],
      backgroundColor: '#ffffff',
      textColor: '#000000',
      fontSize: 'text-2xl',
      questionType: 'single-choice',
      timeLimit: 30,
      points: 100
    };

    setSlides(prev => [...prev, newSlide]);
    setCurrentSlide(slides.length);
  };

  const handleBackgroundImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        updateSlide(currentSlide, {
          backgroundImage: e.target?.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuestionImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        updateSlide(currentSlide, {
          questionImage: e.target?.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSlide = (slideIndex: number) => {
    if (slides.length === 1) return; // Don't remove last slide

    setSlides(prev => prev.filter((_, index) => index !== slideIndex));
    if (currentSlide >= slideIndex && currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSave = () => {
    // In real app, save to API
    console.log('Saving new question:', slides);
    alert('Question created successfully!');
    router.push('/admin');
  };

  const handleBackToAdmin = () => {
    router.push('/admin');
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        updateSlide(currentSlide, {
          backgroundImage: e.target?.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const currentSlideData = slides[currentSlide];

  if (showPreview) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          {/* Preview Header */}
          <div className="bg-white p-4 rounded-t-lg flex items-center justify-between">
            <h2 className="text-xl font-bold">Preview Mode</h2>
            <button
              onClick={() => setShowPreview(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Exit Preview
            </button>
          </div>

          {/* Preview Slide */}
          <div
            className="relative aspect-video rounded-b-lg overflow-hidden"
            style={{
              backgroundColor: currentSlideData.backgroundColor,
              backgroundImage: currentSlideData.backgroundImage ? `url(${currentSlideData.backgroundImage})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              <h1
                className={`${currentSlideData.fontSize} font-bold mb-8`}
                style={{ color: currentSlideData.textColor }}
              >
                {currentSlideData.question}
              </h1>

              <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
                {currentSlideData.answers.map((answer, index) => (
                  <button
                    key={answer.id}
                    className={`p-4 rounded-lg text-white font-semibold text-lg transition-colors hover:opacity-80 ${
                      ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'][index % 4]
                    }`}
                  >
                    {answer.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToAdmin}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Admin</span>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">
              Create New Question
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                // For new questions, redirect to a general history page or disable
                alert('Save the question first to view history');
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg cursor-not-allowed opacity-50"
              disabled
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>History</span>
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Eye className="h-4 w-4" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => {
                // For new questions, save first then redirect
                alert('Save the question first to start a lobby');
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg cursor-not-allowed opacity-50"
              disabled
            >
              <Play className="h-4 w-4" />
              <span>Start Lobby</span>
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>Create</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar - Slide Navigation */}
        <div className="w-64 bg-white border-r border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Slides</h3>
            <button
              onClick={addSlide}
              className="p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className={`relative p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  currentSlide === index
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setCurrentSlide(index)}
              >
                <div className="text-sm font-medium text-gray-900 truncate">
                  {slide.question}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {slide.answers.length} answers
                </div>

                {slides.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSlide(index);
                    }}
                    className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Editor */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center space-x-6">
              {/* Question Type */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Type:</label>
                <select
                  value={currentSlideData.questionType}
                  onChange={(e) => updateSlide(currentSlide, { questionType: e.target.value as any })}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="multiple-choice">Multiple Choice</option>
                  <option value="true-false">True/False</option>
                  <option value="text">Text Answer</option>
                </select>
              </div>

              {/* Time Limit */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Time:</label>
                <input
                  type="number"
                  value={currentSlideData.timeLimit}
                  onChange={(e) => updateSlide(currentSlide, { timeLimit: parseInt(e.target.value) })}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                  min="5"
                  max="300"
                />
                <span className="text-sm text-gray-500">sec</span>
              </div>

              {/* Points */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Points:</label>
                <input
                  type="number"
                  value={currentSlideData.points}
                  onChange={(e) => updateSlide(currentSlide, { points: parseInt(e.target.value) })}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                  min="10"
                  max="2000"
                  step="10"
                />
              </div>

              {/* Background Color */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Background:</label>
                <input
                  type="color"
                  value={currentSlideData.backgroundColor}
                  onChange={(e) => updateSlide(currentSlide, { backgroundColor: e.target.value })}
                  className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                />
              </div>

              {/* Text Color */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Text:</label>
                <input
                  type="color"
                  value={currentSlideData.textColor}
                  onChange={(e) => updateSlide(currentSlide, { textColor: e.target.value })}
                  className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                />
              </div>

              {/* Background Image */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <ImageIcon className="h-4 w-4" />
                <span className="text-sm">Background Image</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Editor Canvas */}
          <div className="flex-1 p-8 bg-gray-100">
            <div className="max-w-4xl mx-auto">
              {/* Slide Canvas */}
              <div
                className="relative aspect-video rounded-lg shadow-lg overflow-hidden"
                style={{
                  backgroundColor: currentSlideData.backgroundColor,
                  backgroundImage: currentSlideData.backgroundImage ? `url(${currentSlideData.backgroundImage})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {/* Question Input */}
                <div className="absolute top-8 left-8 right-8">
                  <textarea
                    value={currentSlideData.question}
                    onChange={(e) => updateSlide(currentSlide, { question: e.target.value })}
                    className={`w-full bg-transparent border-2 border-dashed border-gray-300 rounded p-4 ${currentSlideData.fontSize} font-bold text-center resize-none focus:border-blue-500 focus:outline-none`}
                    style={{ color: currentSlideData.textColor }}
                    placeholder="Enter your question here..."
                    rows={3}
                  />
                </div>

                {/* Answers Section */}
                <div className="absolute bottom-8 left-8 right-8">
                  <div className="grid grid-cols-2 gap-4">
                    {currentSlideData.answers.map((answer, index) => (
                      <div key={answer.id} className="relative group">
                        <div
                          className={`p-4 rounded-lg border-2 border-dashed border-gray-300 ${
                            ['bg-red-500/20', 'bg-blue-500/20', 'bg-yellow-500/20', 'bg-green-500/20'][index % 4]
                          }`}
                        >
                          <input
                            type="text"
                            value={answer.text}
                            onChange={(e) => updateAnswer(answer.id, e.target.value)}
                            className="w-full bg-transparent text-center font-semibold focus:outline-none"
                            style={{ color: currentSlideData.textColor }}
                            placeholder={`Answer ${index + 1}`}
                          />

                          {/* Correct Answer Toggle */}
                          <button
                            onClick={() => toggleCorrectAnswer(answer.id)}
                            className={`absolute top-2 right-2 p-1 rounded-full transition-colors ${
                              answer.isCorrect
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                            }`}
                          >
                            <Check className="h-3 w-3" />
                          </button>

                          {/* Remove Answer */}
                          {currentSlideData.answers.length > 2 && (
                            <button
                              onClick={() => removeAnswer(answer.id)}
                              className="absolute top-2 left-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Add Answer Button */}
                    {currentSlideData.answers.length < 6 && (
                      <button
                        onClick={addAnswer}
                        className="p-4 border-2 border-dashed border-gray-400 rounded-lg text-gray-600 hover:border-gray-600 hover:text-gray-800 transition-colors flex items-center justify-center"
                      >
                        <Plus className="h-6 w-6" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
