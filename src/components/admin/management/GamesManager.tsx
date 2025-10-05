"use client";

import { useState, useMemo } from 'react';
import { useGames, useGameMutations } from '@/hooks/useGames';
import { Game, GameState } from '@/types/api';
import { Plus, RefreshCw, Edit2, Trash2, Filter } from 'lucide-react';

interface GamesManagerProps { onSelectGame?: (game: Game) => void; }

export function GamesManager({ onSelectGame }: GamesManagerProps) {
  const params = useMemo(() => ({ take: 100 }), []);
  const { games: rawGames, loading, error, refetch } = useGames(params);
  const games = Array.isArray(rawGames) ? rawGames : [];
  const { createGame, updateGame, deleteGame, loading: mutating, error: mutationError } = useGameMutations();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Game | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [filter, setFilter] = useState('');

  const filtered = games.filter(g => (g.title || '').toLowerCase().includes(filter.toLowerCase()));

  const resetForm = () => { setEditing(null); setTitle(''); setDescription(''); setShowForm(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      if (editing?.id) {
        await updateGame(editing.id, { id: editing.id, title: title.trim(), description: description.trim() || null, userNTID: 'current-user-id' });
      } else {
        await createGame({ title: title.trim(), description: description.trim() || null, userNTID: 'current-user-id' });
      }
      resetForm();
      refetch();
    } catch {}
  };

  const handleEdit = (g: Game) => { setEditing(g); setTitle(g.title || ''); setDescription(g.description || ''); setShowForm(true); };
  const handleDelete = async (g: Game) => { if (!g.id || !confirm('Delete this game?')) return; try { await deleteGame(g.id); refetch(); } catch {} };

  return (
    <div className="bg-white border rounded-xl p-5 space-y-5 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-bold tracking-wide uppercase text-gray-700">Games ({games.length})</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter" className="pl-7 pr-2 py-1.5 text-xs border rounded-md bg-gray-50 focus:bg-white" />
          </div>
          <button onClick={() => refetch()} className="px-3 py-1.5 text-xs rounded bg-gray-200 hover:bg-gray-300 font-semibold flex items-center gap-1"><RefreshCw className="w-3 h-3" />Refresh</button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="px-3 py-1.5 text-xs rounded bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-1"><Plus className="w-3 h-3" />New</button>
        </div>
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
      {mutationError && <div className="text-xs text-red-600">{mutationError}</div>}

      <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
        {filtered.map(g => (
          <div key={g.id} className="flex items-center justify-between text-xs border rounded px-2 py-1 bg-gray-50 hover:bg-white transition">
            <div className="flex flex-col flex-1 min-w-0 cursor-pointer" onClick={() => onSelectGame?.(g)}>
              <span className="font-semibold truncate">{g.title || 'Untitled'}</span>
              <span className="text-[10px] text-gray-500 truncate">{g.description || 'No description'}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => handleEdit(g)} className="p-1 rounded hover:bg-gray-200" title="Edit"><Edit2 className="w-3 h-3" /></button>
              <button onClick={() => handleDelete(g)} className="p-1 rounded hover:bg-red-100 text-red-600" title="Delete"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
        {!filtered.length && !loading && <div className="text-[11px] text-gray-400">No games</div>}
        {loading && <div className="text-[11px] text-gray-400 animate-pulse">Loading...</div>}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <h4 className="text-xs font-bold uppercase tracking-wide text-gray-600">{editing ? 'Edit Game' : 'Create Game'}</h4>
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-600 mb-1">Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="w-full text-xs px-2 py-1.5 border rounded focus:ring-red-500 focus:border-red-500" maxLength={100} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-600 mb-1">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full text-xs px-2 py-1.5 border rounded resize-none h-20 focus:ring-red-500 focus:border-red-500" maxLength={500} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={mutating || !title.trim()} className="px-3 py-1.5 text-xs rounded bg-green-600 text-white font-semibold disabled:opacity-40">{mutating ? 'Saving...' : 'Save'}</button>
            <button type="button" onClick={resetForm} className="px-3 py-1.5 text-xs rounded border font-medium">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
