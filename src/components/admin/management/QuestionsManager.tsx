"use client";

import { useState, useEffect } from 'react';
import { useQuestions, useQuestionMutations } from '@/hooks/useQuestions';
import { useQuestion } from '@/hooks/useQuestions';
import { Question, QuestionType } from '@/types/api';
import { Plus, RefreshCw, Edit2, Trash2, ArrowLeft, ListChecks } from 'lucide-react';
import { AnswersManager } from '@/components/admin';

interface QuestionsManagerProps { gameId: string | null; onBack?: () => void; }

export function QuestionsManager({ gameId, onBack }: QuestionsManagerProps) {
  const { questions, loading, error, refetch } = useQuestions(gameId);
  const { createQuestion, updateQuestion, deleteQuestion, loading: mutating, error: mutationError } = useQuestionMutations();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [title, setTitle] = useState('');
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(20);
  const [type, setType] = useState<QuestionType>(QuestionType.SingleChoice);
  const [manageAnswersFor, setManageAnswersFor] = useState<Question | null>(null);

  useEffect(() => { if (!showForm) { setEditing(null); setTitle(''); setTimeLimitSeconds(20); setType(QuestionType.SingleChoice); } }, [showForm]);
  useEffect(() => { if (!gameId) setShowForm(false); }, [gameId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameId || !title.trim()) return;
    try {
      if (editing?.id) {
        await updateQuestion(gameId, editing.id, { gameId, questionId: editing.id, title: title.trim(), timeLimitSeconds, userNTID: 'current-user-id' });
      } else {
        await createQuestion(gameId, { gameId, title: title.trim(), timeLimitSeconds, type, userNTID: 'current-user-id' });
      }
      setShowForm(false);
      refetch();
    } catch {}
  };

  const handleEdit = (q: Question) => { setEditing(q); setTitle(q.title || ''); setTimeLimitSeconds(q.timeLimitSeconds || 20); setType(q.type ?? QuestionType.SingleChoice); setShowForm(true); };
  const handleDelete = async (q: Question) => { if (!gameId || !q.id || !confirm('Delete this question?')) return; try { await deleteQuestion(gameId, q.id); refetch(); } catch {} };

  if (!gameId) {
    return <div className="p-6 text-xs text-gray-500 border rounded-xl bg-white">Select a game to manage its questions.</div>;
  }

  if (manageAnswersFor) {
    return (
      <div className="space-y-4">
        <AnswersManager
          gameId={gameId}
          questionId={manageAnswersFor.id || null}
          questionType={manageAnswersFor.type}
          onBack={() => setManageAnswersFor(null)}
        />
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl p-5 space-y-5 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {onBack && <button onClick={onBack} className="px-2 py-1.5 text-xs rounded border bg-gray-50 hover:bg-gray-100 flex items-center gap-1"><ArrowLeft className="w-3 h-3" />Back</button>}
          <h3 className="text-sm font-bold tracking-wide uppercase text-gray-700">Questions ({questions.length})</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="px-3 py-1.5 text-xs rounded bg-gray-200 hover:bg-gray-300 font-semibold flex items-center gap-1"><RefreshCw className="w-3 h-3" />Refresh</button>
          <button onClick={() => { setShowForm(true); setEditing(null); setTitle(''); setTimeLimitSeconds(20); setType(QuestionType.SingleChoice); }} className="px-3 py-1.5 text-xs rounded bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-1"><Plus className="w-3 h-3" />New</button>
        </div>
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
      {mutationError && <div className="text-xs text-red-600">{mutationError}</div>}

      <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
        {questions.map(q => (
          <div key={q.id} className="flex items-center justify-between text-xs border rounded px-2 py-1 bg-gray-50 hover:bg-white transition">
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-semibold truncate cursor-pointer" onClick={() => setManageAnswersFor(q)}>{q.title || 'Untitled Question'}</span>
              <span className="text-[10px] text-gray-500 truncate">{q.timeLimitSeconds}s • {(QuestionType[q.type ?? 0])}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setManageAnswersFor(q)} className="p-1 rounded hover:bg-gray-200" title="Manage Answers"><ListChecks className="w-3 h-3" /></button>
              <button onClick={() => handleEdit(q)} className="p-1 rounded hover:bg-gray-200" title="Edit"><Edit2 className="w-3 h-3" /></button>
              <button onClick={() => handleDelete(q)} className="p-1 rounded hover:bg-red-100 text-red-600" title="Delete"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
        {!questions.length && !loading && <div className="text-[11px] text-gray-400">No questions</div>}
        {loading && <div className="text-[11px] text-gray-400 animate-pulse">Loading...</div>}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <h4 className="text-xs font-bold uppercase tracking-wide text-gray-600">{editing ? 'Edit Question' : 'Create Question'}</h4>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-600 mb-1">Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="w-full text-xs px-2 py-1.5 border rounded focus:ring-red-500 focus:border-red-500" maxLength={160} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-600 mb-1">Time (s)</label>
              <input type="number" min={5} max={300} value={timeLimitSeconds} onChange={e => setTimeLimitSeconds(Number(e.target.value))} className="w-full text-xs px-2 py-1.5 border rounded focus:ring-red-500 focus:border-red-500" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-600 mb-1">Type</label>
            <select value={type} onChange={e => setType(Number(e.target.value) as QuestionType)} className="text-xs px-2 py-1.5 border rounded w-full focus:ring-red-500 focus:border-red-500">
              <option value={QuestionType.SingleChoice}>Single Choice</option>
              <option value={QuestionType.MultipleChoice}>Multiple Choice</option>
              <option value={QuestionType.TrueFalse}>True / False</option>
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={mutating || !title.trim()} className="px-3 py-1.5 text-xs rounded bg-green-600 text-white font-semibold disabled:opacity-40">{mutating ? 'Saving...' : 'Save'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs rounded border font-medium">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
