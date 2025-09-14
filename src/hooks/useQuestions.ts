import { useState, useEffect, useCallback } from 'react';
import { questionsApi, apiUtils } from '@/lib/api-client';
import { Question, CreateQuestionCommand, UpdateQuestionCommand } from '@/types/api';

// Hook for managing questions list for a game
export const useQuestions = (gameId: string | null) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    if (!gameId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await questionsApi.getQuestions(gameId);
      if (response.success && response.data) {
        setQuestions(response.data);
      }
    } catch (err) {
      setError(apiUtils.handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  return {
    questions,
    loading,
    error,
    refetch: fetchQuestions,
  };
};

// Hook for managing a single question
export const useQuestion = (gameId: string | null, questionId: string | null) => {
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestion = useCallback(async () => {
    if (!gameId || !questionId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await questionsApi.getQuestion(gameId, questionId);
      if (response.success && response.data) {
        setQuestion(response.data);
      }
    } catch (err) {
      setError(apiUtils.handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [gameId, questionId]);

  useEffect(() => {
    fetchQuestion();
  }, [fetchQuestion]);

  return {
    question,
    loading,
    error,
    refetch: fetchQuestion,
  };
};

// Hook for question mutations
export const useQuestionMutations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createQuestion = useCallback(async (gameId: string, command: CreateQuestionCommand) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await questionsApi.createQuestion(gameId, command);
      if (response.success) {
        return response.data;
      }
      throw new Error('Failed to create question');
    } catch (err) {
      const errorMessage = apiUtils.handleApiError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateQuestion = useCallback(async (gameId: string, questionId: string, command: UpdateQuestionCommand) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await questionsApi.updateQuestion(gameId, questionId, command);
      if (response.success) {
        return response.data;
      }
      throw new Error('Failed to update question');
    } catch (err) {
      const errorMessage = apiUtils.handleApiError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteQuestion = useCallback(async (gameId: string, questionId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await questionsApi.deleteQuestion(gameId, questionId);
      if (response.success) {
        return true;
      }
      throw new Error('Failed to delete question');
    } catch (err) {
      const errorMessage = apiUtils.handleApiError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createQuestion,
    updateQuestion,
    deleteQuestion,
  };
};
