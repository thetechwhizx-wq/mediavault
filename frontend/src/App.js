import React, { useState, useEffect, useCallback } from 'react';
import { fetchMedia, addMedia, updateMedia, deleteMedia } from './api';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import MediaList from './components/MediaList';
import AddMediaForm from './components/AddMediaForm';
import EditMediaModal from './components/EditMediaModal';
import './App.css';

function App() {
  // ── State ──────────────────────────────────────────
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // ── Data fetching ──────────────────────────────────
  const loadMedia = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchMedia();
      setMedia(data);
    } catch (err) {
      setError('Failed to load media. Is the backend running on port 5000?');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  // ── CRUD handlers ──────────────────────────────────
  const handleAdd = async (item) => {
    try {
      const newItem = await addMedia(item);
      setMedia((prev) => [...prev, newItem]);
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
      alert('Failed to add media. Please try again.');
    }
  };

  const handleUpdate = async (id, updates) => {
    try {
      const updated = await updateMedia(id, updates);
      setMedia((prev) => prev.map((m) => (m.id === id ? updated : m)));
      setEditingItem(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update media. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMedia(id);
      setMedia((prev) => prev.filter((m) => m.id !== id));
      setEditingItem(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete media. Please try again.');
    }
  };

  // Instant playtime update (e.g. Stop Session or +30m / +1h quick tap)
  const handleLogSession = async (id, newTotalHours) => {
    try {
      // Optimistic update
      setMedia((prev) =>
        prev.map((m) => (m.id === id ? { ...m, hoursPlayed: newTotalHours } : m))
      );
      await updateMedia(id, { hoursPlayed: newTotalHours });
    } catch (err) {
      console.error(err);
      loadMedia(); // Revert on failure
    }
  };

  // ── Filtering logic ────────────────────────────────
  const filtered = media.filter((item) => {
    // Type filter
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    // Status filter
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!item.title.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // ── Counts for filter badges ───────────────────────
  const counts = {
    all: media.length,
    movie: media.filter((m) => m.type === 'movie').length,
    show: media.filter((m) => m.type === 'show').length,
    game: media.filter((m) => m.type === 'game').length,
  };

  // ── Keyboard: Escape to close modals ───────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setShowAddForm(false);
        setEditingItem(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // ── Render ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <p>Loading your media vault...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddClick={() => setShowAddForm(true)}
      />

      <main className="main-content">
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={loadMedia}>Retry</button>
          </div>
        )}

        <FilterBar
          typeFilter={typeFilter}
          statusFilter={statusFilter}
          onTypeChange={setTypeFilter}
          onStatusChange={setStatusFilter}
          counts={counts}
        />

        <MediaList
          items={filtered}
          onEdit={setEditingItem}
          onDelete={(item) => setEditingItem(item)}
          onLogSession={handleLogSession}
        />
      </main>

      {/* ── Modals ── */}
      {showAddForm && (
        <AddMediaForm
          onSubmit={handleAdd}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {editingItem && (
        <EditMediaModal
          item={editingItem}
          onSubmit={handleUpdate}
          onDelete={handleDelete}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}

export default App;
