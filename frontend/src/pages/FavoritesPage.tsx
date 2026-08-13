import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { FavoriteAccount } from '../types';
import { Star, Plus, Send, Edit2, Trash2, X, Check, ShieldAlert } from 'lucide-react';

export const FavoritesPage: React.FC = () => {
  const [favorites, setFavorites] = useState<FavoriteAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newAccNum, setNewAccNum] = useState<string>('');
  const [newAlias, setNewAlias] = useState<string>('');

  const [editId, setEditId] = useState<string | null>(null);
  const [editAlias, setEditAlias] = useState<string>('');

  const [error, setError] = useState<string>('');

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const list = await api.favorites.listFavorites();
      setFavorites(list || []);
    } catch (err) {
      console.error('Failed to query favorite accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newAccNum.trim() || !newAlias.trim()) {
      setError('Account number and alias name are required');
      return;
    }

    try {
      await api.favorites.addFavorite({
        account_number: newAccNum.trim(),
        alias_name: newAlias.trim(),
      });
      setNewAccNum('');
      setNewAlias('');
      setIsAddOpen(false);
      await loadFavorites();
    } catch (err: any) {
      setError(err.message || 'Failed to add favorite account');
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editAlias.trim()) return;
    try {
      await api.favorites.updateFavorite(id, editAlias.trim());
      setEditId(null);
      await loadFavorites();
    } catch (err) {
      console.error('Failed to update alias:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this account from favorites?')) {
      try {
        await api.favorites.deleteFavorite(id);
        await loadFavorites();
      } catch (err) {
        console.error('Failed to delete favorite:', err);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            Favorite Transfer Accounts
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Save frequent destination accounts for fast transfer selection
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/20 flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Favorite</span>
        </button>
      </div>

      {/* Favorites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-10 text-xs text-gray-400">Loading favorites...</div>
        ) : favorites.length === 0 ? (
          <div className="col-span-2 text-center py-10 text-xs text-gray-400 bg-white dark:bg-navy-800 rounded-3xl border border-gray-200 dark:border-gray-800">
            No favorite accounts saved yet. Click "Add Favorite" to save one!
          </div>
        ) : (
          favorites.map((fav) => (
            <div
              key={fav.id}
              className="bg-white dark:bg-navy-800 rounded-3xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between hover:border-brand-500 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center">
                  <Star className="w-6 h-6 fill-amber-400 text-amber-500" />
                </div>

                <div>
                  {editId === fav.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editAlias}
                        onChange={(e) => setEditAlias(e.target.value)}
                        className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-navy-900 text-gray-900 dark:text-white"
                      />
                      <button onClick={() => handleSaveEdit(fav.id)} className="p-1 text-emerald-500">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditId(null)} className="p-1 text-gray-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                      {fav.alias_name}
                    </h3>
                  )}

                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5">
                    {fav.account_number}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Link
                  to={`/transfer?dest=${fav.account_number}`}
                  className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-emerald-400 hover:bg-brand-600 hover:text-white transition-colors"
                  title="Instant Transfer"
                >
                  <Send className="w-4 h-4" />
                </Link>

                <button
                  onClick={() => {
                    setEditId(fav.id);
                    setEditAlias(fav.alias_name);
                  }}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-navy-900 transition-colors"
                  title="Edit Alias"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(fav.id)}
                  className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Delete Favorite"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Favorite Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-navy-800 rounded-3xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-800 shadow-2xl relative">
            <button
              onClick={() => setIsAddOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add Favorite Target Account</h3>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Target Account Number
                </label>
                <input
                  type="text"
                  required
                  value={newAccNum}
                  onChange={(e) => setNewAccNum(e.target.value)}
                  placeholder="e.g. 1000888002"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-navy-900 font-mono text-xs text-gray-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Alias / Recipient Name
                </label>
                <input
                  type="text"
                  required
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  placeholder="e.g. Andi Wijaya"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-navy-900 text-xs text-gray-900 dark:text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md mt-4"
              >
                Save Favorite Account
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
