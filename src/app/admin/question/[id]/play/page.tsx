"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Square, 
  SkipForward,
  Users, 
  Timer,
  Trophy,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Settings,
  Share2,
  BarChart3
} from "lucide-react";

interface Player {
  id: string;
  name: string;
  score: number;
  isConnected: boolean;
  lastAnswered?: string;
}

interface Question {
  id: string;
  question: string;
  answers: string[];
  correctAnswers: number[];
  timeLimit: number;
  points: number;
  image?: string;
}

type GameState = 'lobby' | 'question' | 'results' | 'leaderboard' | 'finished';

export default function PlayAdminPage() {
  const params = useParams();
  const router = useRouter();
  
  const [gameState, setGameState] = useState<GameState>('lobby');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lobbyCode] = useState(() => {
    // Generate random lobby code
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    let code = '';
    for (let i = 0; i < 3; i++) {
      code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    for (let i = 0; i < 3; i++) {
      code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    return code;
  });
  
  // Sample questions - in real app, fetch based on question set ID
  const questions: Question[] = [
    {
      id: '1',
      question: 'What is the capital of Vietnam?',
      answers: ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hue'],
      correctAnswers: [1],
      timeLimit: 30,
      points: 1000,
      image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzNjNzBmNCIvPjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOHB4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkhhbm9pIENpdHkgSW1hZ2U8L3RleHQ+PC9zdmc+'
    },
    {
      id: '2',
      question: 'Which planet is known as the Red Planet?',
      answers: ['Mars', 'Venus', 'Jupiter', 'Saturn'],
      correctAnswers: [0],
      timeLimit: 25,
      points: 800,
      image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2U1MzMzNSIvPjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOHB4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk1hcnMgUGxhbmV0PC90ZXh0Pjwvc3ZnPg=='
    },
    {
      id: '3',
      question: 'What year did World War II end?',
      answers: ['1944', '1945', '1946', '1947'],
      correctAnswers: [1],
      timeLimit: 20,
      points: 600
    },
    {
      id: '4',
      question: 'Which of these are primary colors? (Multiple answers)',
      answers: ['Red', 'Green', 'Blue', 'Yellow'],
      correctAnswers: [0, 2, 3],
      timeLimit: 35,
      points: 1200
    },
    {
      id: '5',
      question: 'Mount Everest is the tallest mountain in the world.',
      answers: ['True', 'False'],
      correctAnswers: [0],
      timeLimit: 15,
      points: 400
    }
  ];

  // Sample players - in real app, this would be live data
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: 'AlexTheGenius', score: 2450, isConnected: true },
    { id: '2', name: 'MariaQuizMaster', score: 2380, isConnected: true },
    { id: '3', name: 'DavidBrainiac', score: 2200, isConnected: true },
    { id: '4', name: 'SarahSmart', score: 2100, isConnected: false },
    { id: '5', name: 'MikeTheThinker', score: 1950, isConnected: true },
    { id: '6', name: 'EmmaExpert', score: 1800, isConnected: true },
    { id: '7', name: 'QuizNinja', score: 1750, isConnected: true },
    { id: '8', name: 'BrainStorm', score: 1690, isConnected: true },
    { id: '9', name: 'SmartCookie', score: 1620, isConnected: true },
    { id: '10', name: 'ThinkFast', score: 1580, isConnected: true },
    { id: '11', name: 'KnowledgeSeeker', score: 1520, isConnected: false },
    { id: '12', name: 'QuizHero', score: 1450, isConnected: true },
    { id: '13', name: 'BrainPower', score: 1380, isConnected: true },
    { id: '14', name: 'MindReader', score: 1320, isConnected: true },
    { id: '15', name: 'QuickThink', score: 1250, isConnected: true },
  ]);

  const currentQuestion = questions[currentQuestionIndex];

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerRunning(false);
      handleShowResults();
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const handleStartGame = () => {
    setGameState('question');
    setTimeLeft(currentQuestion.timeLimit);
    setIsTimerRunning(true);
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const handleShowResults = () => {
    setGameState('results');
    setIsTimerRunning(false);
    setShowAnswers(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setGameState('question');
      setTimeLeft(questions[currentQuestionIndex + 1].timeLimit);
      setShowAnswers(false);
      setIsTimerRunning(true);
    } else {
      setGameState('finished');
    }
  };

  const handleShowLeaderboard = () => {
    setGameState('leaderboard');
  };

  const handleEndGame = () => {
    setGameState('finished');
    setIsTimerRunning(false);
  };

  const handleBackToEdit = () => {
    // Use window.location for more reliable navigation
    window.location.href = `/admin/question/${params.id}`;
  };

  const renderLobby = () => (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-4xl w-full">
        <h1 className="text-6xl font-bold text-white mb-4">Geography Quiz Challenge</h1>
        <p className="text-2xl text-white/80 mb-12">Get ready for an exciting quiz adventure!</p>

        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-white/30">
          <p className="text-2xl text-white mb-4">Join at: <span className="font-bold">kahoot.it</span></p>
          <div className="bg-white/30 rounded-xl p-6 mb-4">
            <p className="text-6xl font-bold text-yellow-300 tracking-wider">{lobbyCode}</p>
          </div>
          <p className="text-lg text-white/80">Or use your phone to scan QR code</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 rounded-lg p-4">
            <Users className="h-8 w-8 text-blue-300 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{players.filter(p => p.isConnected).length}</p>
            <p className="text-white/80">Players Joined</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <Trophy className="h-8 w-8 text-yellow-300 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{questions.length}</p>
            <p className="text-white/80">Questions</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <Timer className="h-8 w-8 text-green-300 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">~{Math.round(questions.reduce((sum, q) => sum + q.timeLimit, 0) / 60)}</p>
            <p className="text-white/80">Minutes</p>
          </div>
        </div>

        <button
          onClick={handleStartGame}
          disabled={players.filter(p => p.isConnected).length === 0}
          className="px-12 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl text-2xl font-bold hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
        >
          Start Game ({players.filter(p => p.isConnected).length} players)
        </button>

        {players.filter(p => p.isConnected).length === 0 && (
          <p className="text-yellow-300 mt-4">Waiting for players to join...</p>
        )}
      </div>
    </div>
  );

  const renderQuestion = () => (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl text-center">
          <h1 className="text-4xl font-bold text-white mb-8">{currentQuestion.question}</h1>
          
          {currentQuestion.image && (
            <div className="flex justify-center mb-8">
              <img 
                src={currentQuestion.image} 
                alt="Question" 
                className="max-w-md max-h-48 object-contain rounded-lg shadow-lg"
              />
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4 mt-8">
            {currentQuestion.answers.map((answer, index) => (
              <div
                key={index}
                className={`p-6 rounded-lg text-white font-semibold text-xl transition-all ${
                  showAnswers && currentQuestion.correctAnswers.includes(index)
                    ? 'bg-green-600 ring-4 ring-yellow-400'
                    : ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'][index]
                } ${showAnswers ? 'opacity-100' : 'hover:scale-105'}`}
              >
                {answer}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderResults = () => {
    const totalPlayers = players.filter(p => p.isConnected).length;
    const correctCount = Math.floor(totalPlayers * (Math.random() * 0.4 + 0.5)); // Random between 50-90%
    const incorrectCount = totalPlayers - correctCount;

    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl text-center">
          <h1 className="text-4xl font-bold text-white mb-8">Question {currentQuestionIndex + 1} Results</h1>

          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 mb-8 border border-white/30">
            <h2 className="text-2xl font-semibold text-white mb-4">Correct Answer{currentQuestion.correctAnswers.length > 1 ? 's' : ''}:</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {currentQuestion.correctAnswers.map(i => (
                <span key={i} className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold text-lg">
                  {currentQuestion.answers[i]}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-lg text-white">Total Players</p>
              <p className="text-3xl font-bold text-blue-400">{totalPlayers}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-lg text-white">Correct</p>
              <p className="text-3xl font-bold text-green-400">{correctCount}</p>
              <p className="text-sm text-green-300">{Math.round((correctCount / totalPlayers) * 100)}%</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-lg text-white">Incorrect</p>
              <p className="text-3xl font-bold text-red-400">{incorrectCount}</p>
              <p className="text-sm text-red-300">{Math.round((incorrectCount / totalPlayers) * 100)}%</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-lg text-white">Avg. Time</p>
              <p className="text-3xl font-bold text-yellow-400">{(Math.random() * 3 + 2).toFixed(1)}s</p>
            </div>
          </div>

          {/* Answer breakdown */}
          <div className="bg-white/10 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">Answer Breakdown</h3>
            <div className="grid grid-cols-2 gap-3">
              {currentQuestion.answers.map((answer, index) => {
                const isCorrect = currentQuestion.correctAnswers.includes(index);
                const percentage = isCorrect ? Math.random() * 40 + 30 : Math.random() * 20 + 5;
                return (
                  <div key={index} className={`p-3 rounded ${isCorrect ? 'bg-green-500/30' : 'bg-red-500/20'} border ${isCorrect ? 'border-green-400' : 'border-red-400'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-white font-medium">{answer}</span>
                      <span className="text-white font-bold">{Math.round(percentage)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={handleShowLeaderboard}
              className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg font-semibold hover:from-yellow-600 hover:to-yellow-700 transition-all transform hover:scale-105"
            >
              Show Leaderboard
            </button>
            <button
              onClick={handleNextQuestion}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105"
            >
              {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Game'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderLeaderboard = () => (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold text-white text-center mb-8">Leaderboard</h1>
        
        <div className="bg-white/20 rounded-lg p-6">
          {players
            .filter(p => p.isConnected)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map((player, index) => (
            <div key={player.id} className="flex items-center justify-between py-3 border-b border-white/20 last:border-b-0">
              <div className="flex items-center space-x-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                }`}>
                  {index + 1}
                </div>
                <span className="text-white font-semibold text-lg">{player.name}</span>
              </div>
              <span className="text-yellow-400 font-bold text-lg">{player.score.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <button
            onClick={handleNextQuestion}
            className="px-8 py-4 bg-green-600 text-white rounded-lg text-xl font-semibold hover:bg-green-700 transition-colors"
          >
            {currentQuestionIndex < questions.length - 1 ? 'Continue' : 'Finish Game'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderFinished = () => (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <Trophy className="h-24 w-24 text-yellow-400 mx-auto mb-8" />
        <h1 className="text-6xl font-bold text-white mb-8">Game Finished!</h1>
        
        <div className="bg-white/20 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Final Winner:</h2>
          <p className="text-4xl font-bold text-yellow-400">
            {players.sort((a, b) => b.score - a.score)[0]?.name || 'No players'}
          </p>
        </div>

        <div className="flex justify-center space-x-4">
          <button
            onClick={() => router.push(`/admin/question/${params.id}/history`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            View History
          </button>
          <button
            onClick={handleBackToEdit}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
          >
            Back to Edit
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-blue-800 flex flex-col">
      {/* Admin Control Panel */}
      <div className="bg-black/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToEdit}
              className="flex items-center space-x-2 px-3 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Exit</span>
            </button>
            
            <div className="flex items-center space-x-2 text-white">
              <span className="font-semibold">Question:</span>
              <span>{currentQuestionIndex + 1} / {questions.length}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {gameState === 'question' && (
              <>
                <div className="flex items-center space-x-2 bg-white/20 px-3 py-2 rounded-lg">
                  <Timer className="h-4 w-4 text-white" />
                  <span className="text-white font-bold">{timeLeft}s</span>
                </div>
                
                <button
                  onClick={handlePauseTimer}
                  className="p-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                >
                  {isTimerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                
                <button
                  onClick={handleShowResults}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Show Results
                </button>
              </>
            )}

            {(gameState === 'results' || gameState === 'leaderboard') && (
              <button
                onClick={handleNextQuestion}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            <button
              onClick={handleEndGame}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              End Game
            </button>
          </div>
        </div>
      </div>

      {/* Game Content */}
      {gameState === 'lobby' && renderLobby()}
      {gameState === 'question' && renderQuestion()}
      {gameState === 'results' && renderResults()}
      {gameState === 'leaderboard' && renderLeaderboard()}
      {gameState === 'finished' && renderFinished()}

      {/* Players Panel */}
      <div className="bg-black/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Users className="h-5 w-5 text-white" />
            <span className="text-white font-semibold">
              {players.filter(p => p.isConnected).length} Players Connected
            </span>
          </div>
          
          <div className="flex space-x-2">
            {players.filter(p => p.isConnected).slice(0, 6).map((player) => (
              <div key={player.id} className="bg-white/20 px-3 py-1 rounded text-white text-sm">
                {player.name}
              </div>
            ))}
            {players.filter(p => p.isConnected).length > 6 && (
              <div className="bg-white/20 px-3 py-1 rounded text-white text-sm">
                +{players.filter(p => p.isConnected).length - 6} more
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
