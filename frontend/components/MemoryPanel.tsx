import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Loader2, Brain } from 'lucide-react';
import { useResearchStore } from '../store';

export const MemoryPanel: React.FC = () => {
  const [newMemory, setNewMemory] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const memories = useResearchStore((s) => s.memories);
  const fetchMemories = useResearchStore((s) => s.fetchMemories);
  const addMemory = useResearchStore((s) => s.addMemory);
  const deleteMemory = useResearchStore((s) => s.deleteMemory);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const handleAdd = async () => {
    if (!newMemory.trim()) return;

    setIsAdding(true);
    try {
      await addMemory(newMemory.trim());
      setNewMemory('');
    } catch (err) {
      console.error('Failed to add memory:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: number) => {


    setDeletingId(id);
    try {
      await deleteMemory(id);
    } catch (err) {
      console.error('Failed to delete memory:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  const getSourceBadgeColor = (source: string): string => {
    switch (source) {
      case 'manual':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'chat':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'research':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'search':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default:
        return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
    }
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-light-300 dark:border-dark-300 bg-light-primary dark:bg-dark-secondary overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-light-300 dark:border-dark-300">
        <Brain className="w-4 h-4 text-indigo-500" />
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Memory
        </h3>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          ({memories.length})
        </span>
      </div>

      {/* Memory List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Brain className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-3" />
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-1">
              No memories yet
            </p>
            <p className="text-xs text-zinc-300 dark:text-zinc-600">
              Add context the AI should remember across conversations.
            </p>
          </div>
        ) : (
          memories.map((memory) => (
            <div
              key={memory.id}
              className="group flex items-start gap-2 p-3 rounded-lg
                border border-light-200 dark:border-dark-300
                bg-light-secondary dark:bg-dark-primary
                hover:border-light-300 dark:hover:border-dark-200
                transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed break-words">
                  {memory.content}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide ${getSourceBadgeColor(
                      memory.source
                    )}`}
                  >
                    {memory.source}
                  </span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                    {new Date(memory.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleDelete(memory.id)}
                disabled={deletingId === memory.id}
                className="p-1.5 rounded-md opacity-0 group-hover:opacity-100
                  text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20
                  transition-all duration-200 flex-shrink-0
                  focus:outline-none focus:opacity-100 focus:ring-2 focus:ring-red-500/50
                  disabled:opacity-50"
                aria-label="Delete memory"
              >
                {deletingId === memory.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Memory Input */}
      <div className="p-3 border-t border-light-300 dark:border-dark-300">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMemory}
            onChange={(e) => setNewMemory(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a memory..."
            disabled={isAdding}
            className="flex-1 px-3 py-2 rounded-lg text-sm
              bg-light-secondary dark:bg-dark-primary
              border border-light-300 dark:border-dark-300
              text-zinc-800 dark:text-zinc-200
              placeholder-zinc-400 dark:placeholder-zinc-500
              focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500
              disabled:opacity-50
              transition-colors"
          />
          <button
            onClick={handleAdd}
            disabled={!newMemory.trim() || isAdding}
            className="p-2 rounded-lg
              bg-indigo-500 hover:bg-indigo-600 text-white
              disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            aria-label="Add memory"
          >
            {isAdding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
