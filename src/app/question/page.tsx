"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GameHeader } from '@/components/ui/GameHeader';
import { GameButton } from '@/components/ui/GameButton';
import { useGameHub } from '@/hooks/useGameHub';
import { useFinalResult } from '@/context/FinalResultContext';

type Answer = {
  id: string;
  text: string;
};

export default function QuestionPage() {
  const { setResult } = useFinalResult();
  const searchParams = useSearchParams();
  const router = useRouter();
  const gameId = searchParams.get('gameId') || '';
  const playerName = searchParams.get('name') || '';
  const questionNumber = Number(searchParams.get('questionNumber') || '1');

  const [questionText, setQuestionText] = useState('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // for MultipleChoice
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showResult, setShowResult] = useState<{ correct: boolean; message: string } | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);
  const timerRef = useRef<number | null>(null);

  const { connected, client, submitAnswer, submitMultipleAnswers } = useGameHub({
    onFinalResults: (payload) => {
      setResult(payload);
      router.push('/final');
    },
    onNewQuestion: (payload) => {
      try {
        // Robustly extract question text from common payload shapes
        const qText = payload?.questionText || payload?.question?.text || payload?.text || payload?.question || '';
        setQuestionText(typeof qText === 'string' ? qText : JSON.stringify(qText));

        // Helper to extract display text from answer objects or strings
        const extractAnswerText = (a: any) => {
          if (a == null) return '';
          if (typeof a === 'string') return a;
          if (typeof a === 'number') return String(a);
          // common fields
          const candidates = [a.title, a.text, a.answer, a.value, a.label, a.display, a.content];
          for (const c of candidates) {
            if (c == null) continue;
            if (typeof c === 'string') return c;
            if (typeof c === 'number') return String(c);
            if (typeof c === 'object' && c.text) return String(c.text);
          }
          // fallback to JSON so we don't render [object Object]
          try { return JSON.stringify(a); } catch { return String(a); }
        };

        const opts = (payload?.answers || payload?.choices || []).map((a: any, idx: number) => ({ id: String(a?.id ?? a?.answerId ?? a?.key ?? idx), text: extractAnswerText(a) }));
        setAnswers(opts);
        // set multiple choice flag if server indicates
        const multi = !!(
          payload?.isMultipleChoice ||
          payload?.isMultiple ||
          payload?.isMultipleAnswers ||
          payload?.multiple ||
          payload?.questionType === 'MultipleChoice' ||
          payload?.type === 'MultipleChoice'
        );
        setIsMultipleChoice(multi);
        setSelectedIds([]);
        setHasSubmitted(false);
        setSelected(null);
        // time in seconds
        const t = payload?.timeLimit || payload?.time || 20;
        setTimeLeft(Number(t));
        // start ticking
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
          setTimeLeft((prev) => {
            if (prev === null) return null;
            if (prev <= 1) {
              if (timerRef.current) window.clearInterval(timerRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000) as any;
      } catch (e) {
        console.error('Failed to handle NewQuestion', e);
      }
    },
    onQuestionTimeEnded: (payload) => {
      setTimeLeft(0);
      // If player hasn't submitted, show result/feedback if available
      if (!hasSubmitted) {
        // Try to extract correctness, message, and correct answers from payload
        let correct = false;
        let message = 'Time is up!';
        let correctAns: string[] = [];
        if (payload && typeof payload === 'object') {
          if ('correct' in payload) correct = !!payload.correct;
          if ('isCorrect' in payload) correct = !!payload.isCorrect;
          if ('message' in payload && typeof payload.message === 'string') message = payload.message;
          // Try to extract correct answers (array of ids or texts)
          if (Array.isArray(payload.correctAnswers)) {
            correctAns = payload.correctAnswers.map((a: any) => typeof a === 'object' && a.id ? String(a.id) : String(a));
          } else if (Array.isArray(payload.answers)) {
            // fallback: look for answers with isCorrect flag
            correctAns = payload.answers.filter((a: any) => a.isCorrect || a.correct).map((a: any) => String(a.id ?? a.answerId ?? a.key ?? a.text ?? a));
          }
        }
        setShowResult({ correct, message });
        setCorrectAnswers(correctAns);
      }
    },
    onProceedingToNextQuestion: (payload) => {
      try {
        // Host told clients to proceed. Navigate to next question index if available.
        const next = Number(payload?.nextQuestionIndex ?? (questionNumber + 1));
        // Preserve gameId and name in query
        const params = new URLSearchParams();
        if (gameId) params.set('gameId', gameId);
        if (playerName) params.set('name', playerName);
        params.set('questionNumber', String(next));
        router.push(`/question?${params.toString()}`);
      } catch (e) {
        console.warn('Failed to navigate to next question', e);
      }
    }
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const handleSelect = (id: string) => {
    if (hasSubmitted || (timeLeft !== null && timeLeft <= 0)) return;
    if (isMultipleChoice) {
      if (selectedIds.includes(id)) return; // cannot deselect
      setSelectedIds((prev) => [...prev, id]);
      return;
    }
    // SingleChoice: just select, do not submit yet
    setSelected(id);
  };

  const handleSubmitSingle = async () => {
    if (hasSubmitted || !selected) return;
    setHasSubmitted(true);
    setShowResult(null);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      await submitAnswer(selected);
    } catch (e) {
      console.error('Submit failed', e);
      setHasSubmitted(false);
    }
  };

  const handleSubmitMultiple = async () => {
    if (hasSubmitted || selectedIds.length === 0) return;
    setHasSubmitted(true);
    setShowResult(null);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      await submitMultipleAnswers(selectedIds);
      // show confirmation (hasSubmitted already true)
    } catch (e) {
      console.error('Submit multiple failed', e);
      setHasSubmitted(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <GameHeader title="QUESTION" withSvgBorder />
      <main className="px-6 py-6 max-w-3xl mx-auto">
        <div className="bg-white rounded-lg p-6 shadow-lg border-2 border-gray-200">
          <h2 className="text-xl font-bold mb-2">Question {questionNumber}</h2>
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-700">{questionText || 'Waiting for question...'}</p>
            <div className="text-sm px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-100">{isMultipleChoice ? 'Multiple Choice' : 'Single Choice'}</div>
          </div>
          <div className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {answers.length > 0 ? answers.map((a) => {
                const isSelected = selectedIds.includes(a.id) || selected === a.id;
                const disabled = hasSubmitted || (timeLeft !== null && timeLeft <= 0) || (isMultipleChoice && isSelected);
                return (
                  <button
                    key={a.id}
                    onClick={() => handleSelect(a.id)}
                    disabled={disabled}
                    className={`p-4 rounded border-2 text-left ${isSelected ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-white'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>{a.text}</div>
                      {isSelected ? <div className="text-sm text-green-700 font-bold">✓</div> : null}
                    </div>
                  </button>
                );
              }) : (
                <div className="text-gray-500 italic">No answers available</div>
              )}
            </div>
          </div>


          {/* Submit control for both types */}
          {isMultipleChoice ? (
            <div className="mt-3">
              <GameButton onClick={handleSubmitMultiple} disabled={hasSubmitted || selectedIds.length === 0}>
                {hasSubmitted ? 'Submitted' : `Submit Selected (${selectedIds.length})`}
              </GameButton>
              {hasSubmitted ? <div className="text-sm text-green-600 mt-2">Answer submitted!</div> : null}
            </div>
          ) : (
            <div className="mt-3">
              <GameButton onClick={handleSubmitSingle} disabled={hasSubmitted || !selected}>
                {hasSubmitted ? 'Submitted' : 'Submit'}
              </GameButton>
              {hasSubmitted ? <div className="text-sm text-green-600 mt-2">Answer submitted!</div> : null}
            </div>
          )}

          {/* Show result/feedback if time's up and not submitted */}
          {showResult && (
            <div className={`mt-4 p-3 rounded text-center font-bold ${showResult.correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {showResult.message}
              {correctAnswers.length > 0 && (
                <div className="mt-2 text-base font-normal">
                  Correct answer{correctAnswers.length > 1 ? 's' : ''}: {answers.filter(a => correctAnswers.includes(a.id) || correctAnswers.includes(a.text)).map(a => a.text).join(', ')}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Player: {playerName || 'You'}</div>
            <div className="text-sm font-bold text-red-600">Time: {timeLeft ?? '--'}</div>
          </div>

          {/* Removed Back to Lobby button as requested */}
        </div>
      </main>
    </div>
  );
}
