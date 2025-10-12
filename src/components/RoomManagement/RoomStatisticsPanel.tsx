import React from 'react';
import { RoomStatistics } from '../../services/roomManagementService';
import { Users, Clock, Target, TrendingUp, BarChart3 } from 'lucide-react';

interface RoomStatisticsPanelProps {
  statistics: RoomStatistics;
  className?: string;
}

export const RoomStatisticsPanel: React.FC<RoomStatisticsPanelProps> = ({
  statistics,
  className = ''
}) => {
  const formatTime = (timeString: string) => {
    try {
      const time = new Date(`1970-01-01T${timeString}Z`);
      const minutes = time.getMinutes();
      const seconds = time.getSeconds();
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } catch {
      return timeString;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 space-y-6 ${className}`}>
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">Room Statistics</h3>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Total Players</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">{statistics.totalPlayers}</div>
          <div className="text-xs text-blue-600">
            {statistics.activePlayers} active
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Questions</span>
          </div>
          <div className="text-2xl font-bold text-green-900">{statistics.questionsAnswered}</div>
          <div className="text-xs text-green-600">answered</div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Avg Score</span>
          </div>
          <div className={`text-2xl font-bold ${getScoreColor(statistics.averageScore)}`}>
            {statistics.averageScore.toFixed(1)}%
          </div>
          <div className="text-xs text-purple-600">across all players</div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-800">Avg Time</span>
          </div>
          <div className="text-2xl font-bold text-orange-900">
            {formatTime(statistics.averageResponseTime)}
          </div>
          <div className="text-xs text-orange-600">per question</div>
        </div>
      </div>

      {/* Answer Distribution */}
      {Object.keys(statistics.answerDistribution).length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-800">Answer Distribution</h4>
          <div className="space-y-3">
            {Object.entries(statistics.answerDistribution)
              .sort(([, a], [, b]) => b - a)
              .map(([pattern, count]) => {
                const percentage = statistics.totalPlayers > 0 
                  ? (count / statistics.totalPlayers) * 100 
                  : 0;
                
                return (
                  <div key={pattern} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{pattern} correct</span>
                      <span className="font-medium text-gray-800">
                        {count} player{count !== 1 ? 's' : ''} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Last Activity */}
      {statistics.lastActivity && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Last activity: {new Date(statistics.lastActivity).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};
