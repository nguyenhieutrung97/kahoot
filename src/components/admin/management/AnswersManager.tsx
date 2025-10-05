"use client";

import { useState, useEffect, useCallback } from 'react';
import { answersApi, apiUtils } from '@/lib/api-client';
import { Answer, QuestionType, CreateAnswerCommand, UpdateAnswerCommand, DeleteAnswersCommand } from '@/types/api';
import { Plus, RefreshCw, Edit2, Trash2, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';

interface AnswersManagerProps {
  gameId: string | null;
  questionId: string | null;
  questionType?: QuestionType;
  onBack?: () => void;
}

interface EditableAnswer extends Answer { __tempId?: string; }

export function AnswersManager({ gameId, questionId, questionType = QuestionType.SingleChoice, onBack }: AnswersManagerProps) {
  const [answers, setAnswers] = useState<EditableAnswer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [isCorrectDraft, setIsCorrectDraft] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const canMultiCorrect = questionType === QuestionType.MultipleChoice;

  const fetchAnswers = useCallback(async () => {
    if (!gameId || !questionId) return;
    setLoading(true); setError(null);
    try {
      const res = await answersApi.getAnswers(gameId, questionId);
      if (res.success && Array.isArray(res.data)) {
        setAnswers(res.data);
      }
    } catch (e) { setError(apiUtils.handleApiError(e)); }
    finally { setLoading(false); }
  }, [gameId, questionId]);

  useEffect(() => { fetchAnswers(); }, [fetchAnswers]);
  useEffect(() => { if (!questionId) { setAnswers([]); } }, [questionId]);

  const startCreate = () => { setCreating(true); setEditingId(null); setTitleDraft(''); setIsCorrectDraft(false); };
  const cancelCreate = () => { setCreating(false); setTitleDraft(''); setIsCorrectDraft(false); };

  const startEdit = (a: EditableAnswer) => { setEditingId(a.id || a.__tempId || ''); setTitleDraft(a.title || ''); setIsCorrectDraft(!!a.isCorrect); setCreating(false); };
  const cancelEdit = () => { setEditingId(null); setTitleDraft(''); setIsCorrectDraft(false); };

  const submitCreate = async () => {
    if (!gameId || !questionId || !titleDraft.trim()) return;
    setSaving(true); setError(null);
    try {
      // API expects an array (bulk semantics). We'll append to existing list.
      const newAnswer: Answer = { title: titleDraft.trim(), isCorrect: isCorrectDraft };
      const command: CreateAnswerCommand = { gameId, questionId, questionType, userNTID: 'current-user-id', answers: [newAnswer] };
      const res = await answersApi.createAnswers(gameId, questionId, command);
      if (res.success && Array.isArray(res.data)) {
        // Merge (backend may return full list or just created subset)
        const returned = res.data;
        // If returned includes the new one, replace; else append
        const titles = new Set(returned.map(a => a.title));
        setAnswers(prev => {
          const base = Array.isArray(res.data) && res.data.length >= prev.length ? res.data : [...prev, ...returned.filter(a => !prev.some(p => p.id === a.id))];
          return base;
        });
      } else {
        // Optimistic fallback
        setAnswers(prev => [...prev, { ...newAnswer, __tempId: crypto.randomUUID() }]);
      }
      cancelCreate();
    } catch (e) { setError(apiUtils.handleApiError(e)); }
    finally { setSaving(false); }
  };

  const submitEdit = async () => {
    if (!gameId || !questionId || !titleDraft.trim()) return;
    if (!editingId) return;
    setSaving(true); setError(null);
    try {
      // Build updated answers array for bulk update call (PATCH replaces subset)
      const updatedList = answers.map(a => a.id === editingId ? { ...a, title: titleDraft.trim(), isCorrect: isCorrectDraft } : a);
      const command: UpdateAnswerCommand = { gameId, questionId, questionType, userNTID: 'current-user-id', answers: updatedList.map(({ id, title, isCorrect }) => ({ id, title, isCorrect })) };
      const res = await answersApi.updateAnswers(gameId, questionId, command);
      if (res.success && Array.isArray(res.data)) {
        setAnswers(res.data);
      } else {
        setAnswers(updatedList);
      }
      cancelEdit();
    } catch (e) { setError(apiUtils.handleApiError(e)); }
    finally { setSaving(false); }
  };

  const toggleCorrect = (a: EditableAnswer) => {
    if (editingId || creating || saving) return;
    if (!canMultiCorrect && a.isCorrect) return; // avoid accidental unmark when single choice? optional rule
    if (!gameId || !questionId) return;
    // Build command toggling this answer
    const updated = answers.map(x => {
      if ((x.id || x.__tempId) === (a.id || a.__tempId)) {
        return { ...x, isCorrect: !x.isCorrect };
      }
      // If single choice and marking new correct, others become false
      if (!canMultiCorrect && !a.isCorrect) {
        return { ...x, isCorrect: false };
      }
      return x;
    });
    setAnswers(updated);
  };

  const handleDelete = async (a: EditableAnswer) => {
    if (!gameId || !questionId) return;
    if (!confirm('Delete this answer?')) return;
    setSaving(true); setError(null);
    try {
      if (a.id) {
        await answersApi.deleteAnswer(gameId, questionId, a.id);
        setAnswers(prev => prev.filter(x => x.id !== a.id));
      } else {
        setAnswers(prev => prev.filter(x => x.__tempId !== a.__tempId));
      }
    } catch (e) { setError(apiUtils.handleApiError(e)); }
    finally { setSaving(false); }
  };

  const bulkDeleteUnchecked = async () => {
    if (!gameId || !questionId) return;
    const toDelete = answers.filter(a => !a.isCorrect);
    if (!toDelete.length) return;
    if (!confirm(`Delete ${toDelete.length} non-correct answers?`)) return;
    setSaving(true); setError(null);
    try {
      const command: DeleteAnswersCommand = { gameId, questionId, userNTID: 'current-user-id', answers: toDelete.map(a => ({ id: a.id, title: a.title, isCorrect: a.isCorrect })) };
      await answersApi.deleteAnswers(gameId, questionId, command);
      setAnswers(prev => prev.filter(a => a.isCorrect));
    } catch (e) { setError(apiUtils.handleApiError(e)); }
    finally { setSaving(false); }
  };

  if (!gameId || !questionId) {
    return <div className="p-6 text-xs text-gray-500 border rounded-xl bg-white">Select a question to manage its answers.</div>;
  }

  return (
    <div className="bg-white border rounded-xl p-5 space-y-5 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {onBack && <button onClick={onBack} className="px-2 py-1.5 text-xs rounded border bg-gray-50 hover:bg-gray-100 flex items-center gap-1"><ArrowLeft className="w-3 h-3" />Back</button>}
          <h3 className="text-sm font-bold tracking-wide uppercase text-gray-700">Answers ({answers.length})</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAnswers} disabled={loading} className="px-3 py-1.5 text-xs rounded bg-gray-200 hover:bg-gray-300 font-semibold flex items-center gap-1 disabled:opacity-40"><RefreshCw className="w-3 h-3" />Refresh</button>
          <button onClick={startCreate} disabled={creating || !!editingId} className="px-3 py-1.5 text-xs rounded bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-1 disabled:opacity-40"><Plus className="w-3 h-3" />New</button>
          <button onClick={bulkDeleteUnchecked} disabled={saving || !answers.some(a => !a.isCorrect)} className="px-3 py-1.5 text-xs rounded border font-semibold disabled:opacity-40">Delete Non-Correct</button>
        </div>
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}

      <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
        {answers.map(a => {
          const isEditing = (a.id || a.__tempId) === editingId;
          return (
            <div key={a.id || a.__tempId} className={`flex items-center justify-between text-xs border rounded px-2 py-1 bg-gray-50 hover:bg-white transition ${a.isCorrect ? 'border-green-400' : ''}`}> 
              {isEditing ? (
                <div className="flex-1 flex items-center gap-2">
                  <input value={titleDraft} onChange={e => setTitleDraft(e.target.value)} className="flex-1 text-xs px-2 py-1 border rounded" />
                  <label className="flex items-center gap-1 text-[10px] select-none"><input type="checkbox" checked={isCorrectDraft} onChange={e => setIsCorrectDraft(e.target.checked)} />Correct</label>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer" onClick={() => toggleCorrect(a)}>
                  {a.isCorrect ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                  <span className={`truncate ${a.isCorrect ? 'font-semibold text-green-700' : ''}`}>{a.title || 'Untitled Answer'}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                {isEditing ? (
                  <>
                    <button onClick={submitEdit} disabled={saving || !titleDraft.trim()} className="px-2 py-1 bg-green-600 text-white rounded disabled:opacity-40">Save</button>
                    <button onClick={cancelEdit} className="px-2 py-1 border rounded">Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(a)} disabled={creating || saving} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30" title="Edit"><Edit2 className="w-3 h-3" /></button>
                    <button onClick={() => handleDelete(a)} disabled={saving} className="p-1 rounded hover:bg-red-100 text-red-600 disabled:opacity-30" title="Delete"><Trash2 className="w-3 h-3" /></button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {!answers.length && !loading && <div className="text-[11px] text-gray-400">No answers</div>}
        {loading && <div className="text-[11px] text-gray-400 animate-pulse">Loading...</div>}
      </div>

      {creating && (
        <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <h4 className="text-xs font-bold uppercase tracking-wide text-gray-600">New Answer</h4>
          <div className="flex items-center gap-3">
            <input value={titleDraft} onChange={e => setTitleDraft(e.target.value)} placeholder="Answer text" className="flex-1 text-xs px-2 py-1.5 border rounded" />
            <label className="flex items-center gap-1 text-[10px] select-none"><input type="checkbox" checked={isCorrectDraft} onChange={e => setIsCorrectDraft(e.target.checked)} />Correct</label>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={submitCreate} disabled={saving || !titleDraft.trim()} className="px-3 py-1.5 text-xs rounded bg-green-600 text-white font-semibold disabled:opacity-40">{saving ? 'Adding...' : 'Add'}</button>
            <button type="button" onClick={cancelCreate} className="px-3 py-1.5 text-xs rounded border font-medium">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
