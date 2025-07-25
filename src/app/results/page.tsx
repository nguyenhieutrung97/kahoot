"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = searchParams.get("roomId") || "ROOM123";
  const playerName = searchParams.get("name") || "Player";
  const userAnswer = parseInt(searchParams.get("answer") || "0");

  const [showResults, setShowResults] = useState(false);

  // Mock question data - should match the question page
  const question = {
    text: "What is the capital of France?",
    correctAnswer: 2, // Paris is the correct answer
    answers: [
      { id: 1, text: "London", color: "bg-red-500", icon: "🌟" },
      { id: 2, text: "Paris", color: "bg-green-500", icon: "🔥" },
      { id: 3, text: "Berlin", color: "bg-yellow-500", icon: "💧" },
      { id: 4, text: "Madrid", color: "bg-blue-500", icon: "🌪️" },
    ],
  };

  const isCorrect = userAnswer === question.correctAnswer;
  const userAnswerText =
    question.answers.find((a) => a.id === userAnswer)?.text || "No answer";
  const correctAnswerText =
    question.answers.find((a) => a.id === question.correctAnswer)?.text || "";

  useEffect(() => {
    // Show results after a brief delay for dramatic effect
    const timer = setTimeout(() => setShowResults(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    // Navigate to next question or back to lobby
    router.push(
      `/lobby?roomId=${encodeURIComponent(roomId)}&name=${encodeURIComponent(playerName)}`,
    );
  };

  const getAnswerStyle = (answerId: number) => {
    const answer = question.answers.find((a) => a.id === answerId);
    if (!answer) return "";

    if (answerId === question.correctAnswer) {
      return `${answer.color} ring-4 ring-green-300`;
    } else if (answerId === userAnswer && answerId !== question.correctAnswer) {
      return `${answer.color} ring-4 ring-red-300 opacity-70`;
    } else {
      return `${answer.color} opacity-40`;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="p-6 flex justify-between items-center text-white">
        <div className="text-lg font-semibold">Room: {roomId}</div>
        <div className="text-lg font-semibold">Results</div>
      </header>

      {/* Results Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Feedback Message */}
        <div
          className={`text-center mb-8 transition-all duration-1000 ${showResults ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
        >
          {isCorrect ? (
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-4xl font-bold text-white mb-2">Excellent!</h1>
              <p className="text-xl text-green-200">You got it right!</p>
            </div>
          ) : userAnswer === 0 ? (
            <div className="text-center">
              <div className="text-6xl mb-4">⏰</div>
              <h1 className="text-4xl font-bold text-white mb-2">Time's Up!</h1>
              <p className="text-xl text-yellow-200">No answer submitted</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-6xl mb-4">💪</div>
              <h1 className="text-4xl font-bold text-white mb-2">Good Try!</h1>
              <p className="text-xl text-red-200">
                Keep going, you'll get the next one!
              </p>
            </div>
          )}
        </div>

        {/* Question */}
        <div className="bg-white rounded-lg p-6 mb-8 max-w-4xl w-full text-center shadow-lg">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
            {question.text}
          </h2>
          {userAnswer > 0 && (
            <div className="text-lg text-gray-600">
              Your answer:{" "}
              <span
                className={`font-semibold ${isCorrect ? "text-green-600" : "text-red-600"}`}
              >
                {userAnswerText}
              </span>
            </div>
          )}
          <div className="text-lg text-gray-600 mt-2">
            Correct answer:{" "}
            <span className="font-semibold text-green-600">
              {correctAnswerText}
            </span>
          </div>
        </div>

        {/* Answer Grid with Results */}
        <div
          className={`grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl w-full mb-8 transition-all duration-1000 delay-500 ${showResults ? "opacity-100" : "opacity-0"}`}
        >
          {question.answers.map((answer) => (
            <div
              key={answer.id}
              className={`
                ${getAnswerStyle(answer.id)}
                text-white p-6 rounded-lg font-bold text-lg
                flex items-center justify-between
                transition-all duration-500
                relative
              `}
            >
              <div className="flex items-center space-x-4">
                <div className="text-2xl font-bold bg-white bg-opacity-20 rounded-full w-12 h-12 flex items-center justify-center">
                  {answer.icon}
                </div>
                <span>{answer.text}</span>
              </div>
              <div className="text-2xl">
                {answer.id === question.correctAnswer && (
                  <span className="text-green-300">✓</span>
                )}
                {answer.id === userAnswer &&
                  answer.id !== question.correctAnswer && (
                    <span className="text-red-300">✗</span>
                  )}
              </div>

              {/* Correct answer indicator */}
              {answer.id === question.correctAnswer && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full px-3 py-1 text-sm font-bold">
                  Correct!
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Player Info and Continue Button */}
        <div
          className={`text-center transition-all duration-1000 delay-1000 ${showResults ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <div className="text-white mb-6">
            <div className="text-sm opacity-80">Playing as</div>
            <div className="text-lg font-semibold">{playerName}</div>
          </div>

          <button
            onClick={handleContinue}
            className="px-8 py-3 bg-white text-green-600 rounded-lg font-bold text-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-purple-600 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
