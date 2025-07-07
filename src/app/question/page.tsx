"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function QuestionPage() {
  const searchParams = useSearchParams();
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
    }
  }, [timeLeft, hasAnswered]);

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

  const getAnswerIcon = (answerId: number) => {
    const icons = {
      1: "△", // Triangle
      2: "◯", // Circle
      3: "⬜", // Square
      4: "◇", // Diamond
    };
    return icons[answerId as keyof typeof icons];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex flex-col">
      {/* Header */}
      <header className="p-6 flex justify-between items-center text-white">
        <div className="text-lg font-semibold">Room: {roomId}</div>
        <div className="text-lg font-semibold">Time: {timeLeft}s</div>
      </header>

      {/* Question Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="bg-white rounded-lg p-8 mb-8 max-w-4xl w-full text-center shadow-lg">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
            {question.text}
          </h1>
          {hasAnswered && (
            <div className="text-green-600 font-semibold">
              Answer submitted! Waiting for other players...
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
                text-white p-6 rounded-lg font-bold text-lg
                flex items-center justify-between
                transition-all duration-200 transform
                ${selectedAnswer === answer.id ? "ring-4 ring-white scale-105" : ""}
                ${hasAnswered || timeLeft === 0 ? "opacity-60 cursor-not-allowed" : "hover:scale-105 active:scale-95"}
              `}
            >
              <div className="flex items-center space-x-4">
                <div className="text-2xl font-bold bg-white bg-opacity-20 rounded-full w-12 h-12 flex items-center justify-center">
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
        <div className="mt-8 text-white text-center">
          <div className="text-sm opacity-80">Playing as</div>
          <div className="text-lg font-semibold">{playerName}</div>
        </div>

        {/* Time up message */}
        {timeLeft === 0 && !hasAnswered && (
          <div className="mt-4 bg-red-500 text-white px-6 py-3 rounded-lg font-semibold">
            Time's up! No answer submitted.
          </div>
        )}
      </div>
    </div>
  );
}
