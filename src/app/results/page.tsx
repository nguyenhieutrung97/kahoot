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

  // Mock answer distribution data (normally would come from server)
  const answerStats = [
    { id: 1, count: 12, percentage: 24 },
    { id: 2, count: 30, percentage: 60 },
    { id: 3, count: 5, percentage: 10 },
    { id: 4, count: 3, percentage: 6 },
  ];

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

  // Mock - determine if this is the final question
  const currentQuestionNumber = parseInt(searchParams.get("questionNumber") || "1");
  const totalQuestions = 10;
  const isFinalQuestion = currentQuestionNumber >= totalQuestions;

  const handleContinue = () => {
    if (isFinalQuestion) {
      // Navigate to final leaderboard
      router.push(
        `/leaderboard?roomId=${encodeURIComponent(roomId)}&name=${encodeURIComponent(playerName)}`,
      );
    } else {
      // Navigate to next question or back to lobby
      router.push(
        `/lobby?roomId=${encodeURIComponent(roomId)}&name=${encodeURIComponent(playerName)}`,
      );
    }
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

        {/* Answer Distribution Chart */}
        <div
          className={`bg-white rounded-lg p-6 mb-8 max-w-4xl w-full shadow-lg transition-all duration-1000 delay-1000 ${showResults ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">
            Answer Distribution ({answerStats.reduce((sum, stat) => sum + stat.count, 0)} players)
          </h3>

          <div className="space-y-4">
            {question.answers.map((answer) => {
              const stat = answerStats.find(s => s.id === answer.id);
              const isCorrect = answer.id === question.correctAnswer;
              const isUserAnswer = answer.id === userAnswer;

              return (
                <div key={answer.id} className="flex items-center space-x-4">
                  {/* Answer Icon */}
                  <div className={`${answer.color} text-white rounded-lg p-2 flex items-center justify-center min-w-[48px] h-12`}>
                    <span className="text-lg font-bold">{answer.icon}</span>
                  </div>

                  {/* Answer Text */}
                  <div className="min-w-[100px] text-sm font-medium text-gray-700">
                    {answer.text}
                    {isCorrect && <span className="text-green-600 ml-2">✓</span>}
                    {isUserAnswer && !isCorrect && <span className="text-red-600 ml-2">✗</span>}
                  </div>

                  {/* Progress Bar */}
                  <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 delay-1500 ${
                        isCorrect
                          ? 'bg-green-500'
                          : answer.color.replace('bg-', 'bg-').replace('-500', '-400')
                      } ${showResults ? '' : 'w-0'}`}
                      style={{ width: showResults ? `${stat?.percentage || 0}%` : '0%' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-700">
                        {stat?.count || 0} ({stat?.percentage || 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-gray-600">Correct Answer</span>
            </div>
            {userAnswer > 0 && userAnswer !== question.correctAnswer && (
              <div className="flex items-center space-x-2">
                <span className="text-red-600">✗</span>
                <span className="text-gray-600">Your Answer</span>
              </div>
            )}
          </div>
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
            {isFinalQuestion ? "🏆 View Final Results" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
