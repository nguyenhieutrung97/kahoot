"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function QuestionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = searchParams.get("roomId") || "ROOM123";
  const playerName = searchParams.get("name") || "Player";

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const [hasAnswered, setHasAnswered] = useState(false);

  // Mock question data
  const question = {
    text: "What is the capital of France?",
    answers: [
      {
        id: 1,
        text: "London",
        color: "bg-red-500",
        hoverColor: "hover:bg-red-600",
      },
      {
        id: 2,
        text: "Paris",
        color: "bg-green-500",
        hoverColor: "hover:bg-green-600",
      },
      {
        id: 3,
        text: "Berlin",
        color: "bg-yellow-500",
        hoverColor: "hover:bg-yellow-600",
      },
      {
        id: 4,
        text: "Madrid",
        color: "bg-blue-500",
        hoverColor: "hover:bg-blue-600",
      },
    ],
  };

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && !hasAnswered) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !hasAnswered) {
      // Navigate to results when time runs out
      setTimeout(() => {
        router.push(
          `/results?roomId=${encodeURIComponent(roomId)}&name=${encodeURIComponent(playerName)}&answer=0`,
        );
      }, 1000);
    }
  }, [timeLeft, hasAnswered, router, roomId, playerName]);

  const handleAnswerSelect = (answerId: number) => {
    if (!hasAnswered && timeLeft > 0) {
      setSelectedAnswer(answerId);
      setHasAnswered(true);
      console.log(`Player ${playerName} selected answer ${answerId}`);

      // Redirect to results page after 2 seconds
      setTimeout(() => {
        router.push(
          `/results?roomId=${encodeURIComponent(roomId)}&name=${encodeURIComponent(playerName)}&answer=${answerId}`,
        );
      }, 2000);
    }
  };

  const getQuestionIconTheme = (questionNumber: number) => {
    const themes = [
      { 1: "🌟", 2: "🔥", 3: "💧", 4: "🌪️" }
    ];

    return themes[questionNumber % themes.length];
  };

  const getAnswerIcon = (answerId: number, questionNumber: number = 1) => {
    const themeIcons = getQuestionIconTheme(questionNumber);
    return themeIcons[answerId as keyof typeof themeIcons];
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm p-6 flex justify-between items-center text-gray-800 border-b-4 border-red-600">
        <div className="text-lg font-semibold text-gray-600">Room: {roomId}</div>
        <div className="text-lg font-bold text-red-600 uppercase tracking-wide">TIME: {timeLeft}S</div>
      </header>

      {/* Question Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="bg-white rounded-lg p-8 mb-8 max-w-4xl w-full text-center shadow-lg border-2 border-gray-200">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 uppercase tracking-wide">
            {question.text}
          </h1>
          <div className="w-24 h-1 bg-red-600 mx-auto mb-4"></div>
          {hasAnswered && (
            <div className="text-green-600 font-bold uppercase tracking-wide">
              ANSWER SUBMITTED! PROCESSING...
            </div>
          )}
        </div>

        {/* Answer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl w-full">
          {question.answers.map((answer) => (
            <button
              key={answer.id}
              onClick={() => handleAnswerSelect(answer.id)}
              disabled={hasAnswered || timeLeft === 0}
              className={`
                ${answer.color} ${answer.hoverColor}
                text-white p-6 rounded font-bold text-lg uppercase tracking-wide
                flex items-center justify-between
                transition-all duration-200 transform border-4 border-transparent
                ${selectedAnswer === answer.id ? "border-white scale-105 shadow-xl" : ""}
                ${hasAnswered || timeLeft === 0 ? "opacity-60 cursor-not-allowed" : "hover:scale-105 active:scale-95 shadow-lg"}
              `}
            >
              <div className="flex items-center space-x-4">
                <div className="text-2xl font-bold bg-white bg-opacity-20 rounded w-12 h-12 flex items-center justify-center">
                  {getAnswerIcon(answer.id)}
                </div>
                <span>{answer.text}</span>
              </div>
              <div className="text-2xl">
                {selectedAnswer === answer.id ? "✓" : "○"}
              </div>
            </button>
          ))}
        </div>

        {/* Player Info */}
        <div className="mt-8 bg-white rounded-lg p-4 shadow border-2 border-gray-200 text-center">
          <div className="text-sm text-gray-500 uppercase tracking-wide font-medium">PARTICIPANT</div>
          <div className="text-lg font-bold text-gray-900 uppercase tracking-wide">{playerName}</div>
        </div>

        {/* Time up message */}
        {timeLeft === 0 && !hasAnswered && (
          <div className="mt-4 bg-red-600 text-white px-6 py-3 rounded font-bold uppercase tracking-wide border-2 border-red-600">
            TIME EXPIRED - NO RESPONSE RECORDED
          </div>
        )}
      </div>
    </div>
  );
}
