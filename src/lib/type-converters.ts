import { Question, Answer, GameState, QuestionType } from '@/types/api';
import { GameQuestion, GameAnswer } from '@/types/game';

// Color mapping for answer options
const ANSWER_COLORS = [
  { color: 'bg-red-500', hoverColor: 'bg-red-600' },
  { color: 'bg-blue-500', hoverColor: 'bg-blue-600' },
  { color: 'bg-yellow-500', hoverColor: 'bg-yellow-600' },
  { color: 'bg-green-500', hoverColor: 'bg-green-600' },
  { color: 'bg-purple-500', hoverColor: 'bg-purple-600' },
  { color: 'bg-pink-500', hoverColor: 'bg-pink-600' },
];

// Icon mapping for answer options
const ANSWER_ICONS = ['🌟', '🔥', '💧', '🌪️', '🎯', '⚡'];

/**
 * Convert API Answer to frontend GameAnswer
 */
export const convertApiAnswerToGameAnswer = (apiAnswer: Answer, index: number): GameAnswer => {
  const colorIndex = index % ANSWER_COLORS.length;
  const iconIndex = index % ANSWER_ICONS.length;
  const colorObj = (ANSWER_COLORS[colorIndex] ?? ANSWER_COLORS[0]) as { color: string; hoverColor: string };
  
  return {
    // Use stable 1-based index for UI answer IDs to prevent GUID->number collisions
    id: index + 1,
    text: apiAnswer.title || '',
  color: colorObj.color,
  hoverColor: colorObj.hoverColor,
    icon: ANSWER_ICONS[iconIndex] || '❓',
  };
};

/**
 * Convert API Question to frontend GameQuestion
 */
export const convertApiQuestionToGameQuestion = (apiQuestion: Question): GameQuestion => {
  const answers: GameAnswer[] = (apiQuestion.answers || []).map((answer, index) =>
    convertApiAnswerToGameAnswer(answer, index)
  );

  // Find the correct answer ID by index alignment
  const correctIndex = (apiQuestion.answers || []).findIndex(a => !!a.isCorrect);
  const correctAnswer = correctIndex >= 0 ? answers[correctIndex] : undefined;

  return {
    id: apiQuestion.id ?? '',
    text: apiQuestion.title || '',
    answers,
    correctAnswerId: correctAnswer?.id,
    timeLimit: apiQuestion.timeLimitSeconds ?? undefined,
  } as GameQuestion;
};

/**
 * Convert frontend GameAnswer to API Answer
 */
export const convertGameAnswerToApiAnswer = (gameAnswer: GameAnswer, gameId?: string, questionId?: string): Answer => {
  return {
    id: gameAnswer.id.toString(),
    title: gameAnswer.text,
    isCorrect: false, // This should be set based on the correct answer logic
    gameId: gameId || null,
    questionId: questionId || null,
  };
};

/**
 * Convert frontend GameQuestion to API Question
 */
export const convertGameQuestionToApiQuestion = (gameQuestion: GameQuestion, gameId?: string): Question => {
  const answers: Answer[] = gameQuestion.answers.map((answer, index) => {
    const apiAnswer = convertGameAnswerToApiAnswer(answer, gameId, gameQuestion.id);
    // Mark the correct answer
    apiAnswer.isCorrect = answer.id === gameQuestion.correctAnswerId;
    return apiAnswer;
  });

  const result: Question = {
    gameId: gameId || null,
    title: gameQuestion.text,
    type: QuestionType.SingleChoice,
    answers,
  };

  if (gameQuestion.id) result.id = gameQuestion.id;
  if (gameQuestion.timeLimit !== undefined) result.timeLimitSeconds = gameQuestion.timeLimit;

  return result;
};

/**
 * Get game state display text
 */
export const getGameStateDisplayText = (state: GameState): string => {
  switch (state) {
    case GameState.Draft:
      return 'Draft';
    case GameState.Ready:
      return 'Ready';
    case GameState.Live:
      return 'Live';
    case GameState.Closed:
      return 'Closed';
    default:
      return 'Unknown';
  }
};

/**
 * Get question type display text
 */
export const getQuestionTypeDisplayText = (type: QuestionType): string => {
  switch (type) {
    case QuestionType.SingleChoice:
      return 'Single Choice';
    case QuestionType.MultipleChoice:
      return 'Multiple Choice';
    case QuestionType.TrueFalse:
      return 'True/False';
    default:
      return 'Unknown';
  }
};

/**
 * Get game state color class
 */
export const getGameStateColorClass = (state: GameState): string => {
  switch (state) {
    case GameState.Draft:
      return 'bg-yellow-100 text-yellow-800';
    case GameState.Ready:
      return 'bg-blue-100 text-blue-800';
    case GameState.Live:
      return 'bg-green-100 text-green-800';
    case GameState.Closed:
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Format time limit for display
 */
export const formatTimeLimit = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  
  return `${minutes}m ${remainingSeconds}s`;
};

/**
 * Validate game data
 */
export const validateGameData = (title?: string | null, description?: string | null): string[] => {
  const errors: string[] = [];
  
  if (!title || title.trim().length === 0) {
    errors.push('Game title is required');
  }
  
  if (title && title.trim().length > 100) {
    errors.push('Game title must be less than 100 characters');
  }
  
  if (description && description.length > 500) {
    errors.push('Game description must be less than 500 characters');
  }
  
  return errors;
};

/**
 * Validate question data
 */
export const validateQuestionData = (title?: string | null, timeLimit?: number): string[] => {
  const errors: string[] = [];
  
  if (!title || title.trim().length === 0) {
    errors.push('Question title is required');
  }
  
  if (title && title.trim().length > 200) {
    errors.push('Question title must be less than 200 characters');
  }
  
  if (timeLimit !== undefined && (timeLimit < 5 || timeLimit > 300)) {
    errors.push('Time limit must be between 5 and 300 seconds');
  }
  
  return errors;
};

/**
 * Validate answer data
 */
export const validateAnswerData = (answers: Answer[]): string[] => {
  const errors: string[] = [];
  
  if (!answers || answers.length < 2) {
    errors.push('At least 2 answers are required');
  }
  
  if (answers && answers.length > 6) {
    errors.push('Maximum 6 answers allowed');
  }
  
  const correctAnswers = answers.filter(answer => answer.isCorrect);
  if (correctAnswers.length === 0) {
    errors.push('At least one correct answer is required');
  }
  
  const emptyAnswers = answers.filter(answer => !answer.title || answer.title.trim().length === 0);
  if (emptyAnswers.length > 0) {
    errors.push('All answers must have text');
  }
  
  return errors;
};
