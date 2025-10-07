"use client";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGameMutations } from '@/hooks/useGames';
import { questionsApi, answersApi } from '@/lib/api-client';
import type { CreateGameCommand, CreateQuestionCommand, Game } from '@/types/api';

interface ChatMessage { role: 'user' | 'assistant' | 'system'; content: string; }
interface AIGameChatProps { open: boolean; onClose: () => void; onGameCreated?: (game: Game) => void; }

// Draft structure
interface DraftQuestion { text: string; answers: { text: string; correct: boolean }[] }
interface Draft { title: string; description: string; questions: DraftQuestion[] }

// Constants / regex helpers
const SPEC_PATTERN = /(topic\s*:|difficulty\s*:|questions?\s*:)/i;
const TOPIC_REGEX = /topic\s*:\s*([^,;\n]+)/i;
const DIFF_REGEX = /difficulty\s*:\s*(easy|medium|hard)/i;
const COUNT_REGEX = /questions?\s*:\s*(\d{1,2})/i;

// Utility helpers
const hasSpecInMessages = (messages: ChatMessage[]) => messages.some(m => SPEC_PATTERN.test(m.content));
const extractLastSpecLine = (messages: ChatMessage[]): string => ([...messages].reverse().find(m => SPEC_PATTERN.test(m.content))?.content || '');

// Build heuristic draft if server unavailable
function synthesizeQuestions(messages: ChatMessage[]): Draft {
  const spec = extractLastSpecLine(messages);
  const topic = TOPIC_REGEX.exec(spec)?.[1]?.trim() || 'General Knowledge';
  const diff = DIFF_REGEX.exec(spec)?.[1]?.trim() || 'medium';
  const count = Math.min(10, Math.max(3, parseInt(COUNT_REGEX.exec(spec)?.[1] || '5', 10)));
  const baseTitle = `${topic} Quiz (${diff.charAt(0).toUpperCase() + diff.slice(1)})`;
  const questions: DraftQuestion[] = Array.from({ length: count }).map((_, i) => {
    const qText = `Q${i + 1}. ${topic} fact check #${i + 1}?`;
    const correctIndex = i % 4;
    const answers = Array.from({ length: 4 }).map((__, a) => ({
      text: a === correctIndex ? `Correct insight about ${topic} #${i + 1}` : `Distractor ${a + 1} for ${topic} #${i + 1}`,
      correct: a === correctIndex
    }));
    return { text: qText, answers };
  });
  return { title: baseTitle, description: `Auto-generated ${diff} difficulty quiz about ${topic}.`, questions };
}

// Server AI suggestion
async function fetchServerSuggestion(specMessage: string): Promise<Draft | null> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://localhost:7007';
  try {
    const res = await fetch(`${base}/api/OpenAI/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ message: specMessage, type: 3 })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const suggestion = data?.gameSuggestion?.gameSuggestion;
    if (!suggestion?.game) return null;
    const g = suggestion.game;
    const qsRaw = Array.isArray(suggestion.questions) ? suggestion.questions : [];
    const questions: DraftQuestion[] = qsRaw.map((q: any, idx: number) => {
      const qq = q.question || {};
      const answers = (q.answers || []).map((a: any, i: number) => ({
        text: a.title || a.text || `Answer ${i + 1}`,
        correct: !!a.isCorrect
      }));
      return { text: qq.title || `Question ${idx + 1}`, answers };
    });
    if (!questions.length) return null;
    return {
      title: g.title || 'Untitled AI Game',
      description: g.description || 'AI generated game',
      questions
    };
  } catch (e) {
    console.error('AI server suggestion failed', e);
    return null;
  }
}

const extractGameId = (created: unknown): string | undefined => {
  if (!created) return undefined;
  return (created as any).id || (typeof created === 'string' ? created : (created as any).gameId);
};

const extractQuestionId = (qRes: any): string | undefined => {
  if (!qRes?.data) return undefined;
  const d = qRes.data;
  return d.id || (typeof d === 'string' ? d : d.questionId);
};

export const AIGameChat: React.FC<AIGameChatProps> = ({ open, onClose, onGameCreated }) => {
  const { createGame } = useGameMutations();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hi! Provide spec: topic: <subject>, difficulty: easy|medium|hard, questions: <1-10>. Then type build.' }
  ]);
  const [input, setInput] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const scrollBottom = () => { requestAnimationFrame(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }); };
  useEffect(scrollBottom, [messages, open]);

  const sendMessage = useCallback(async () => {
    const content = input.trim();
    if (!content) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', content }]);
    const lower = content.toLowerCase();
    const fullHistory = [...messages, { role: 'user', content }] as ChatMessage[];
    const hasSpec = hasSpecInMessages(fullHistory);

    if (SPEC_PATTERN.test(content) && lower !== 'build') {
      setMessages(m => [...m, { role: 'assistant', content: 'Spec noted. Type build when ready.' }]);
      return;
    }
    if (lower === 'help') {
      setMessages(m => [...m, { role: 'assistant', content: 'Format: topic: <subject>, difficulty: easy|medium|hard, questions: <1-10>. Then type build.' }]);
      return;
    }
    if (lower === 'build') {
      if (!hasSpec) {
        setMessages(m => [...m, { role: 'assistant', content: 'Need a spec first. Example: topic: space, difficulty: medium, questions: 5' }]);
        return;
      }
      const specLine = extractLastSpecLine(fullHistory as ChatMessage[]);
      setMessages(m => [...m, { role: 'assistant', content: 'Generating draft via AI service...' }]);
      const serverDraft = await fetchServerSuggestion(specLine);
      if (serverDraft) {
        setDraft(serverDraft);
        setMessages(m => [...m, { role: 'assistant', content: `AI generated '${serverDraft.title}' with ${serverDraft.questions.length} questions. Refine spec & build again to regenerate.` }]);
      } else {
        const heuristic = synthesizeQuestions(fullHistory as ChatMessage[]);
        setDraft(heuristic);
        setMessages(m => [...m, { role: 'assistant', content: 'Server unavailable. Generated heuristic draft.' }]);
      }
      return;
    }
    setMessages(m => [...m, { role: 'assistant', content: 'Provide or refine spec, then type build.' }]);
  }, [input, messages]);

  const handleCreate = useCallback(async () => {
    if (!draft || saving) return;
    setSaving(true);
    setError(null);
    try {
      setMessages(m => [...m, { role: 'assistant', content: `Creating game '${draft.title}' (${draft.questions.length} questions)...` }]);
      const gameCmd: CreateGameCommand = { title: draft.title, description: draft.description, userNTID: 'ai-builder' } as CreateGameCommand;
      const created = await createGame(gameCmd as any); // createGame typing may differ
      const gameId = extractGameId(created);
      if (!gameId) {
        const msg = 'Game created but response missing id';
        setError(msg);
        setMessages(m => [...m, { role: 'assistant', content: `Failed: ${msg}` }]);
        return;
      }
      let successQuestions = 0;
      for (const [idx, q] of draft.questions.entries()) {
        const qCmd: CreateQuestionCommand = { gameId, title: q.text, timeLimitSeconds: 20, userNTID: 'ai-builder' } as CreateQuestionCommand;
        let qRes: any;
        try {
          qRes = await questionsApi.createQuestion(gameId, qCmd);
        } catch (e) {
          console.error('Create question failed', q.text, e);
          setMessages(m => [...m, { role: 'assistant', content: `⚠️ Question ${idx + 1} failed` }]);
          continue;
        }
        const questionId = extractQuestionId(qRes);
        if (!questionId) {
          setMessages(m => [...m, { role: 'assistant', content: `⚠️ No id for question ${idx + 1}` }]);
          continue;
        }
        const answersPayload = q.answers.map(a => ({ title: a.text, isCorrect: a.correct }));
        try {
          await answersApi.createAnswers(gameId, questionId, { gameId, questionId, answers: answersPayload, userNTID: 'ai-builder' } as any);
        } catch (e) {
          console.error('Create answers failed', questionId, e);
          setMessages(m => [...m, { role: 'assistant', content: `⚠️ Answers failed Q${idx + 1}` }]);
          continue;
        }
        successQuestions++;
        if ((idx + 1) % 3 === 0 || idx === draft.questions.length - 1) {
          setMessages(m => [...m, { role: 'assistant', content: `Progress: ${successQuestions}/${draft.questions.length}` }]);
        }
      }
      setMessages(m => [...m, { role: 'assistant', content: `✅ Game '${draft.title}' created (${successQuestions}/${draft.questions.length} questions).` }]);
      onGameCreated?.({ ...(created as any), id: gameId } as any);
    } catch (e: any) {
      console.error('AI Builder create flow failed', e);
      const msg = e?.message || 'Failed to create game';
      setError(msg);
      setMessages(m => [...m, { role: 'assistant', content: 'Creation failed.' }]);
    } finally {
      setSaving(false);
    }
  }, [draft, saving, createGame, onGameCreated]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-6">
      <div className="bg-white w-full sm:max-w-2xl h-[90vh] sm:h-[600px] rounded-t-2xl sm:rounded-2xl shadow-xl border flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-3 bg-indigo-600 text-white">
          <h3 className="font-semibold tracking-wide text-sm">AI Game Builder</h3>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Experimental</span>
          <button onClick={onClose} className="ml-auto text-xs px-2 py-1 rounded bg-white/20 hover:bg-white/30">Close</button>
        </div>
        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
          {messages.map((m, i) => (
            <div key={i} className={`text-sm max-w-[90%] sm:max-w-[80%] rounded-lg px-3 py-2 shadow ${m.role === 'user' ? 'ml-auto bg-indigo-600 text-white' : 'bg-white border text-gray-800'}`}>{m.content}</div>
          ))}
          {draft && (
            <div className="bg-white border rounded-lg p-3 text-xs space-y-2">
              <div className="font-semibold text-gray-700">Draft Preview</div>
              <div className="text-gray-600"><span className="font-semibold">Title:</span> {draft.title}</div>
              <div className="text-gray-600"><span className="font-semibold">Questions:</span> {draft.questions.length}</div>
              <ol className="list-decimal ml-4 space-y-1">
                {draft.questions.slice(0, 5).map((q, i) => (<li key={i} className="truncate">{q.text}</li>))}
              </ol>
            </div>
          )}
        </div>
        <div className="border-t p-3 space-y-3">
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded">{error}</div>}
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Describe your quiz..."
              className="flex-1 resize-none h-16 text-sm border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex flex-col gap-2 w-28">
              <button onClick={sendMessage} disabled={!input.trim()} className="w-full px-3 py-2 rounded bg-indigo-600 text-white text-xs font-semibold disabled:opacity-40">Send</button>
              <button onClick={handleCreate} disabled={!draft || saving} className="w-full px-3 py-2 rounded bg-green-600 text-white text-xs font-semibold disabled:opacity-40 flex items-center justify-center gap-1">
                {saving && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? 'Saving...' : 'Create Game'}
              </button>
            </div>
          </div>
          <div className="flex gap-2 text-[10px] text-gray-500 flex-wrap">
            <span>Commands: help • build • refine spec anytime.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIGameChat;
