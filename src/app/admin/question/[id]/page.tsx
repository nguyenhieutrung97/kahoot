"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function QuestionEditPage() {
  const params = useParams();
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedTool, setSelectedTool] = useState('select');
  const [showPreview, setShowPreview] = useState(false);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const questionImageInputRef = useRef<HTMLInputElement>(null);

  // Sample question data - in real app, this would come from API based on params.id
  const [slides, setSlides] = useState<QuestionSlide[]>([
    {
      id: '1',
      question: 'What is the capital of Vietnam?',
      answers: [
        { id: 'a1', text: 'Ho Chi Minh City', isCorrect: false },
        { id: 'a2', text: 'Hanoi', isCorrect: true },
        { id: 'a3', text: 'Da Nang', isCorrect: false },
        { id: 'a4', text: 'Hue', isCorrect: false }
      ],
      backgroundColor: '#ffffff',
      textColor: '#000000',
      fontSize: 'text-2xl',
      questionType: 'single-choice',
      timeLimit: 30,
      points: 100,
      questionImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzNjNzBmNCIvPjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOHB4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkhhbm9pIENpdHkgSW1hZ2U8L3RleHQ+PC9zdmc+'
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

  const removeSlide = (slideIndex: number) => {
    if (slides.length === 1) return; // Don't remove last slide
    
    setSlides(prev => prev.filter((_, index) => index !== slideIndex));
    if (currentSlide >= slideIndex && currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSave = () => {
    // In real app, save to API
    console.log('Saving slides:', slides);
    alert('Question saved successfully!');
  };

  const handleBackToAdmin = () => {
    try {
      router.push('/admin');
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to window navigation
      window.location.href = '/admin';
    }
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

  const currentSlideData = slides[currentSlide];

  if (showPreview) {
    const previewQuestion = slides[previewSlideIndex];

    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          {/* Preview Header */}
          <div className="bg-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold">Preview Mode</h2>
              <span className="text-gray-500">Question {previewSlideIndex + 1} of {slides.length}</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPreviewSlideIndex(prev => Math.max(0, prev - 1))}
                disabled={previewSlideIndex === 0}
                className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPreviewSlideIndex(prev => Math.min(slides.length - 1, prev + 1))}
                disabled={previewSlideIndex === slides.length - 1}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setPreviewSlideIndex(0);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Exit Preview
              </button>
            </div>
          </div>

          {/* Preview Question */}
          <div
            className="relative aspect-video rounded-b-lg overflow-hidden"
            style={{
              backgroundColor: previewQuestion.backgroundColor,
              backgroundImage: previewQuestion.backgroundImage ? `url(${previewQuestion.backgroundImage})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              {/* Question Text */}
              <div className="mb-8">
                <h1
                  className={`${previewQuestion.fontSize} font-bold mb-4`}
                  style={{ color: previewQuestion.textColor }}
                >
                  {previewQuestion.question}
                </h1>

                {/* Question Image */}
                {previewQuestion.questionImage && (
                  <div className="flex justify-center mb-4">
                    <img
                      src={previewQuestion.questionImage}
                      alt="Question"
                      className="max-w-md max-h-48 object-contain rounded-lg shadow-lg"
                    />
                  </div>
                )}
              </div>

              {/* Answers */}
              {previewQuestion.questionType === 'true-false' ? (
                <div className="flex gap-8">
                  <button className="px-8 py-4 bg-green-500 text-white font-semibold text-lg rounded-lg hover:opacity-80 transition-colors">
                    True
                  </button>
                  <button className="px-8 py-4 bg-red-500 text-white font-semibold text-lg rounded-lg hover:opacity-80 transition-colors">
                    False
                  </button>
                </div>
              ) : (
                <div className={`grid gap-4 w-full max-w-2xl ${
                  previewQuestion.answers.length <= 2 ? 'grid-cols-1' : 'grid-cols-2'
                }`}>
                  {previewQuestion.answers.map((answer, index) => (
                    <button
                      key={answer.id}
                      className={`p-4 rounded-lg text-white font-semibold text-lg transition-colors hover:opacity-80 ${
                        ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'][index % 6]
                      }`}
                    >
                      {answer.text}
                    </button>
                  ))}
                </div>
              )}

              {/* Question Info */}
              <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm">
                {previewQuestion.timeLimit}s • {previewQuestion.points} pts
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
              {params.id === 'new' ? 'Create New Question' : `Edit Question: ${currentSlideData.question}`}
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push(`/admin/question/${params.id}/history`)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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
              onClick={() => router.push(`/admin/question/${params.id}/play`)}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Play className="h-4 w-4" />
              <span>Start Lobby</span>
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>Save</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar - Question Navigation */}
        <div className="w-64 bg-white border-r border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Questions</h3>
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
            <div className="flex items-center space-x-6 flex-wrap gap-y-3">
              {/* Question Type */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Type:</label>
                <select
                  value={currentSlideData.questionType}
                  onChange={(e) => updateSlide(currentSlide, { questionType: e.target.value as any })}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="single-choice">Single Choice</option>
                  <option value="multiple-choice">Multiple Choice</option>
                  <option value="true-false">True/False</option>
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

              {/* Question Image */}
              <button
                onClick={() => questionImageInputRef.current?.click()}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <ImageIcon className="h-4 w-4" />
                <span className="text-sm">Question Image</span>
              </button>
              <input
                ref={questionImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleQuestionImageUpload}
                className="hidden"
              />

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
                onChange={handleBackgroundImageUpload}
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
                <div className="absolute top-4 left-8 right-8">
                  <textarea
                    value={currentSlideData.question}
                    onChange={(e) => updateSlide(currentSlide, { question: e.target.value })}
                    className={`w-full bg-transparent border-2 border-dashed border-gray-300 rounded p-3 ${currentSlideData.fontSize} font-bold text-center resize-none focus:border-blue-500 focus:outline-none`}
                    style={{ color: currentSlideData.textColor }}
                    placeholder="Enter your question here..."
                    rows={2}
                  />
                </div>

                {/* Question Image Section - Center of slide */}
                <div className={`absolute left-8 right-8 ${currentSlideData.questionImage ? 'top-24' : 'top-32'}`}>
                  {currentSlideData.questionImage ? (
                    <div className="flex justify-center mb-4">
                      <div className="relative">
                        <img
                          src={currentSlideData.questionImage}
                          alt="Question"
                          className="max-w-sm max-h-40 object-contain rounded-lg shadow-lg border-2 border-dashed border-blue-300"
                        />
                        <button
                          onClick={() => updateSlide(currentSlide, { questionImage: undefined })}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <button
                        onClick={() => questionImageInputRef.current?.click()}
                        className="px-6 py-4 border-2 border-dashed border-gray-400 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center space-x-2"
                        style={{ color: currentSlideData.textColor }}
                      >
                        <ImageIcon className="h-6 w-6" />
                        <span className="font-medium">Click to add question image</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Answers Section */}
                <div className={`absolute left-8 right-8 ${currentSlideData.questionImage ? 'bottom-4' : 'bottom-8'}`}>
                  {currentSlideData.questionType === 'true-false' ? (
                    /* True/False Answers */
                    <div className="flex justify-center gap-8">
                      <div className="relative group">
                        <div className="p-4 rounded-lg border-2 border-dashed border-gray-300 bg-green-500/20 min-w-[120px]">
                          <div className="text-center font-semibold" style={{ color: currentSlideData.textColor }}>
                            True
                          </div>
                          <button
                            onClick={() => {
                              updateSlide(currentSlide, {
                                answers: [
                                  { id: 'true', text: 'True', isCorrect: true },
                                  { id: 'false', text: 'False', isCorrect: false }
                                ]
                              });
                            }}
                            className={`absolute top-2 right-2 p-1 rounded-full transition-colors ${
                              currentSlideData.answers.find(a => a.id === 'true')?.isCorrect
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                            }`}
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <div className="relative group">
                        <div className="p-4 rounded-lg border-2 border-dashed border-gray-300 bg-red-500/20 min-w-[120px]">
                          <div className="text-center font-semibold" style={{ color: currentSlideData.textColor }}>
                            False
                          </div>
                          <button
                            onClick={() => {
                              updateSlide(currentSlide, {
                                answers: [
                                  { id: 'true', text: 'True', isCorrect: false },
                                  { id: 'false', text: 'False', isCorrect: true }
                                ]
                              });
                            }}
                            className={`absolute top-2 right-2 p-1 rounded-full transition-colors ${
                              currentSlideData.answers.find(a => a.id === 'false')?.isCorrect
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                            }`}
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Multiple Choice / Single Choice Answers */
                    <div className={`grid gap-4 ${
                      currentSlideData.answers.length <= 2 ? 'grid-cols-1' : 'grid-cols-2'
                    }`}>
                      {currentSlideData.answers.map((answer, index) => (
                        <div key={answer.id} className="relative group">
                          <div
                            className={`p-4 rounded-lg border-2 border-dashed border-gray-300 ${
                              ['bg-red-500/20', 'bg-blue-500/20', 'bg-yellow-500/20', 'bg-green-500/20', 'bg-purple-500/20', 'bg-orange-500/20'][index % 6]
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
                              onClick={() => {
                                if (currentSlideData.questionType === 'single-choice') {
                                  // For single choice, only one answer can be correct
                                  updateSlide(currentSlide, {
                                    answers: currentSlideData.answers.map(a => ({
                                      ...a,
                                      isCorrect: a.id === answer.id
                                    }))
                                  });
                                } else {
                                  // For multiple choice, multiple answers can be correct
                                  toggleCorrectAnswer(answer.id);
                                }
                              }}
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
                      {currentSlideData.answers.length < 6 && currentSlideData.questionType !== 'true-false' && (
                        <button
                          onClick={addAnswer}
                          className="p-4 border-2 border-dashed border-gray-400 rounded-lg text-gray-600 hover:border-gray-600 hover:text-gray-800 transition-colors flex items-center justify-center"
                        >
                          <Plus className="h-6 w-6" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
