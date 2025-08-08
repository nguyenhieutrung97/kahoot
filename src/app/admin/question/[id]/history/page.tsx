"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Trophy, 
  Calendar, 
  Users, 
  Clock, 
  Target,
  Medal,
  Eye,
  Download,
  RefreshCw
} from "lucide-react";

interface Player {
  id: string;
  name: string;
  score: number;
  correctAnswers: number;
  totalAnswers: number;
  avgResponseTime: number;
}

interface LobbySession {
  id: string;
  name: string;
  date: string;
  duration: string;
  totalPlayers: number;
  status: 'completed' | 'ongoing';
  leaderboard: Player[];
  questionsUsed: number;
}

export default function QuestionHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  // Sample data - in real app, fetch based on question ID
  const sessions: LobbySession[] = [
    {
      id: '1',
      name: 'Geography Quiz Championship',
      date: '2024-01-20',
      duration: '15:30',
      totalPlayers: 24,
      status: 'completed',
      questionsUsed: 5,
      leaderboard: [
        { id: '1', name: 'Alex Johnson', score: 4850, correctAnswers: 5, totalAnswers: 5, avgResponseTime: 2.3 },
        { id: '2', name: 'Maria Garcia', score: 4720, correctAnswers: 5, totalAnswers: 5, avgResponseTime: 2.8 },
        { id: '3', name: 'David Chen', score: 4650, correctAnswers: 4, totalAnswers: 5, avgResponseTime: 1.9 },
        { id: '4', name: 'Sarah Wilson', score: 4580, correctAnswers: 4, totalAnswers: 5, avgResponseTime: 2.1 },
        { id: '5', name: 'Mike Brown', score: 4200, correctAnswers: 4, totalAnswers: 5, avgResponseTime: 3.2 },
        { id: '6', name: 'Jennifer Lee', score: 4100, correctAnswers: 3, totalAnswers: 5, avgResponseTime: 3.8 },
        { id: '7', name: 'Robert Taylor', score: 3950, correctAnswers: 3, totalAnswers: 5, avgResponseTime: 4.1 },
        { id: '8', name: 'Lisa Anderson', score: 3800, correctAnswers: 3, totalAnswers: 5, avgResponseTime: 4.5 }
      ]
    },
    {
      id: '2',
      name: 'Vietnam Knowledge Test',
      date: '2024-01-18',
      duration: '12:45',
      totalPlayers: 18,
      status: 'completed',
      questionsUsed: 4,
      leaderboard: [
        { id: '9', name: 'Emma Davis', score: 3890, correctAnswers: 4, totalAnswers: 4, avgResponseTime: 2.5 },
        { id: '10', name: 'John Smith', score: 3750, correctAnswers: 3, totalAnswers: 4, avgResponseTime: 2.8 },
        { id: '11', name: 'Lisa Wang', score: 3680, correctAnswers: 3, totalAnswers: 4, avgResponseTime: 3.1 },
        { id: '12', name: 'Tom Miller', score: 3420, correctAnswers: 3, totalAnswers: 4, avgResponseTime: 3.5 },
        { id: '13', name: 'Anna Lee', score: 3200, correctAnswers: 2, totalAnswers: 4, avgResponseTime: 4.2 },
        { id: '14', name: 'Kevin Park', score: 2980, correctAnswers: 2, totalAnswers: 4, avgResponseTime: 4.8 }
      ]
    },
    {
      id: '3',
      name: 'Quick Geography Challenge',
      date: '2024-01-15',
      duration: '8:20',
      totalPlayers: 12,
      status: 'completed',
      questionsUsed: 3,
      leaderboard: [
        { id: '15', name: 'Chris Taylor', score: 2950, correctAnswers: 3, totalAnswers: 3, avgResponseTime: 1.8 },
        { id: '16', name: 'Rachel Green', score: 2850, correctAnswers: 3, totalAnswers: 3, avgResponseTime: 2.2 },
        { id: '17', name: 'Mark Johnson', score: 2700, correctAnswers: 2, totalAnswers: 3, avgResponseTime: 2.5 },
        { id: '18', name: 'Sophie Chen', score: 2650, correctAnswers: 2, totalAnswers: 3, avgResponseTime: 2.8 },
        { id: '19', name: 'Jake Williams', score: 2400, correctAnswers: 2, totalAnswers: 3, avgResponseTime: 3.2 }
      ]
    },
    {
      id: '4',
      name: 'Monday Morning Geography',
      date: '2024-01-12',
      duration: '18:15',
      totalPlayers: 32,
      status: 'completed',
      questionsUsed: 6,
      leaderboard: [
        { id: '20', name: 'Oliver Martinez', score: 5940, correctAnswers: 6, totalAnswers: 6, avgResponseTime: 2.1 },
        { id: '21', name: 'Isabella Rodriguez', score: 5820, correctAnswers: 6, totalAnswers: 6, avgResponseTime: 2.4 },
        { id: '22', name: 'Ethan Thompson', score: 5750, correctAnswers: 5, totalAnswers: 6, avgResponseTime: 1.9 },
        { id: '23', name: 'Sophia Kim', score: 5680, correctAnswers: 5, totalAnswers: 6, avgResponseTime: 2.2 },
        { id: '24', name: 'Lucas Wright', score: 5520, correctAnswers: 5, totalAnswers: 6, avgResponseTime: 2.7 },
        { id: '25', name: 'Ava Mitchell', score: 5400, correctAnswers: 4, totalAnswers: 6, avgResponseTime: 3.1 },
        { id: '26', name: 'Noah Garcia', score: 5200, correctAnswers: 4, totalAnswers: 6, avgResponseTime: 3.5 }
      ]
    },
    {
      id: '5',
      name: 'Geography Expert Challenge',
      date: '2024-01-10',
      duration: '22:40',
      totalPlayers: 45,
      status: 'completed',
      questionsUsed: 8,
      leaderboard: [
        { id: '27', name: 'Madison Cooper', score: 7850, correctAnswers: 8, totalAnswers: 8, avgResponseTime: 1.8 },
        { id: '28', name: 'Carter Adams', score: 7720, correctAnswers: 8, totalAnswers: 8, avgResponseTime: 2.1 },
        { id: '29', name: 'Zoe Bennett', score: 7650, correctAnswers: 7, totalAnswers: 8, avgResponseTime: 1.9 },
        { id: '30', name: 'Logan Foster', score: 7580, correctAnswers: 7, totalAnswers: 8, avgResponseTime: 2.3 },
        { id: '31', name: 'Lily Hayes', score: 7420, correctAnswers: 7, totalAnswers: 8, avgResponseTime: 2.6 },
        { id: '32', name: 'Mason Brooks', score: 7200, correctAnswers: 6, totalAnswers: 8, avgResponseTime: 2.9 },
        { id: '33', name: 'Harper Powell', score: 7100, correctAnswers: 6, totalAnswers: 8, avgResponseTime: 3.2 },
        { id: '34', name: 'Jackson Reed', score: 6950, correctAnswers: 6, totalAnswers: 8, avgResponseTime: 3.5 }
      ]
    },
    {
      id: '6',
      name: 'Friday Fun Geography',
      date: '2024-01-08',
      duration: '10:25',
      totalPlayers: 19,
      status: 'completed',
      questionsUsed: 4,
      leaderboard: [
        { id: '35', name: 'Scarlett Torres', score: 3920, correctAnswers: 4, totalAnswers: 4, avgResponseTime: 2.2 },
        { id: '36', name: 'Hunter Murphy', score: 3850, correctAnswers: 4, totalAnswers: 4, avgResponseTime: 2.5 },
        { id: '37', name: 'Layla Rivera', score: 3780, correctAnswers: 3, totalAnswers: 4, avgResponseTime: 2.8 },
        { id: '38', name: 'Grayson Cook', score: 3650, correctAnswers: 3, totalAnswers: 4, avgResponseTime: 3.1 },
        { id: '39', name: 'Victoria Bailey', score: 3520, correctAnswers: 3, totalAnswers: 4, avgResponseTime: 3.4 }
      ]
    }
  ];

  const handleBackToEdit = () => {
    // Use window.location for more reliable navigation
    window.location.href = `/admin/question/${params.id}`;
  };

  const handleViewSession = (sessionId: string) => {
    setSelectedSession(selectedSession === sessionId ? null : sessionId);
  };

  const handleExportData = (sessionId: string) => {
    // TODO: Implement export functionality
    console.log('Exporting session data:', sessionId);
    alert('Export functionality would be implemented here');
  };

  const selectedSessionData = sessions.find(s => s.id === selectedSession);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToEdit}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Edit</span>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">
              Question History & Leaderboards
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Players</p>
                <p className="text-2xl font-bold text-gray-900">
                  {sessions.reduce((sum, session) => sum + session.totalPlayers, 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Players/Session</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(sessions.reduce((sum, session) => sum + session.totalPlayers, 0) / sessions.length)}
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Last Session</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Date(sessions[0].date).toLocaleDateString()}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Lobby Sessions</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {sessions.map((session) => (
              <div key={session.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <h3 className="text-lg font-medium text-gray-900">{session.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        session.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                    
                    <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(session.date).toLocaleDateString()}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{session.duration}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{session.totalPlayers} players</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Target className="h-4 w-4" />
                        <span>{session.questionsUsed} questions</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleExportData(session.id)}
                      className="px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleViewSession(session.id)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Leaderboard</span>
                    </button>
                  </div>
                </div>

                {/* Leaderboard */}
                {selectedSession === session.id && (
                  <div className="mt-6 bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      <span>Leaderboard</span>
                    </h4>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Rank</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Player</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Score</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Correct/Total</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Avg. Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {session.leaderboard.map((player, index) => (
                            <tr key={player.id} className="hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <div className="flex items-center space-x-2">
                                  {index === 0 && <Medal className="h-5 w-5 text-yellow-500" />}
                                  {index === 1 && <Medal className="h-5 w-5 text-gray-400" />}
                                  {index === 2 && <Medal className="h-5 w-5 text-orange-600" />}
                                  <span className="font-medium">{index + 1}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-medium text-gray-900">{player.name}</td>
                              <td className="py-3 px-4 text-green-600 font-semibold">{player.score.toLocaleString()}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 text-xs rounded ${
                                  player.correctAnswers === player.totalAnswers 
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {player.correctAnswers}/{player.totalAnswers}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-600">{player.avgResponseTime}s</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
