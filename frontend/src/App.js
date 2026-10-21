import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  fetchMedia,
  addMedia,
  updateMedia,
  deleteMedia,
  bulkAddMedia,
  bulkDeleteMedia,
  refreshMissingCovers,
} from './api';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import ActiveMediaShelf from './components/ActiveMediaShelf';
import MediaList from './components/MediaList';
import AddMediaForm from './components/AddMediaForm';
import EditMediaModal from './components/EditMediaModal';
import CoverPickerModal from './components/CoverPickerModal';
import ImportModal from './components/ImportModal';
import VaultInsightsModal from './components/VaultInsightsModal';
import DuplicateCleanerModal from './components/DuplicateCleanerModal';
import GamesPage from './components/GamesPage';
import WeeklyRecapBanner from './components/WeeklyRecapBanner';
import './App.css';

function App() {
  // ── State ──────────────────────────────────────────
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Vault Switcher (Cinema & TV vs Games Vault)
  const [activeVaultTab, setActiveVaultTab] = useState('cinema'); // 'cinema' or 'games'

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [genreFilter, setGenreFilter] = useState('All Genres');
  const [theatreOnly, setTheatreOnly] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('mediavault_view_mode') || 'grid';
    } catch (e) {
      return 'grid';
    }
  });

  // Modals
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [coverPickerItem, setCoverPickerItem] = useState(null);
  const [isFixingCovers, setIsFixingCovers] = useState(false);

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

  // ── Save view mode preference ──────────────────────
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('mediavault_view_mode', mode);
    } catch (e) {}
  };

  // ── Segregated Media ───────────────────────────────
  const gamesMedia = useMemo(() => media.filter((m) => m.type === 'game'), [media]);
  const cinemaMedia = useMemo(() => media.filter((m) => m.type !== 'game'), [media]);

  // ── Dynamic Years & Venue Counts ───────────────────
  const availableYears = useMemo(() => {
    const set = new Set();
    media.forEach((m) => {
      const d = m.watchedDate || m.playedFrom || m.playedMonth;
      if (d && /^\d{4}/.test(d)) {
        set.add(d.slice(0, 4));
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [media]);

  const theatreCount = useMemo(() => {
    return media.filter(
      (m) =>
        m.venue === 'theatre' ||
        (m.notes && /theatre|theater|cinema|imax/i.test(m.notes))
    ).length;
  }, [media]);

  // ── In-Progress Active Items (Cinema & TV) ──────────
  const inProgressItems = useMemo(() => {
    return cinemaMedia.filter((m) => m.status === 'in_progress');
  }, [cinemaMedia]);

  // ── Top Ticker Stats Summary (Real Watch Hours) ────
  const statsSummary = useMemo(() => {
    const targetItems =
      yearFilter === 'all'
        ? media
        : media.filter((m) => {
            const d = m.watchedDate || m.playedFrom || m.playedMonth;
            return d && d.startsWith(yearFilter);
          });

    let gamingHours = 0;
    let watchHours = 0;
    let totalRatings = 0;
    let ratingCount = 0;

    targetItems.forEach((m) => {
      if (m.type === 'game') {
        gamingHours += Number(m.hoursPlayed) || 0;
      } else {
        const runtime = Number(m.runtimeMinutes) || (m.type === 'movie' ? 120 : 45 * 4);
        watchHours += runtime / 60;
      }
      if (m.rating && Number(m.rating) > 0) {
        totalRatings += Number(m.rating);
        ratingCount++;
      }
    });

    const meanRating =
      ratingCount > 0 ? (totalRatings / ratingCount).toFixed(2) : 0;

    return {
      total: targetItems.length,
      watchHours: Number(watchHours.toFixed(1)),
      gamingHours: Number(gamingHours.toFixed(1)),
      meanRating,
    };
  }, [media, yearFilter]);

  // ── Duplicate Groups Count (Excludes intentional rewatches & replays) ──
  const duplicateCount = useMemo(() => {
    const counts = {};
    let dups = 0;
    const candidates = media.filter(
      (m) => m.status !== 'rewatch' && !m.replay && !(m.notes && /rewatch|replay/i.test(m.notes))
    );
    candidates.forEach((m) => {
      const norm = (m.title || '')
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const key = `${norm}|${m.type}`;
      counts[key] = (counts[key] || 0) + 1;
      if (counts[key] === 2) {
        dups++;
      }
    });
    return dups;
  }, [media]);

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

  const handleBulkImport = async (items, onProgress) => {
    try {
      const CHUNK_SIZE = 50;

      for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        const chunk = items.slice(i, i + CHUNK_SIZE);
        try {
          const res = await bulkAddMedia(chunk);
          if (res && res.items) {
            setMedia((prev) => [...prev, ...res.items]);
          }
        } catch (chunkErr) {
          console.error('Error importing chunk:', chunkErr);
        }
        if (onProgress) {
          onProgress(Math.min(items.length, i + CHUNK_SIZE), items.length);
        }
      }

      setShowImportModal(false);
      loadMedia();
    } catch (err) {
      console.error(err);
      alert('Failed to import items: ' + err.message);
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

  const handleBulkDelete = async (ids) => {
    try {
      await bulkDeleteMedia(ids);
      const idSet = new Set(ids);
      setMedia((prev) => prev.filter((m) => !idSet.has(m.id)));
    } catch (err) {
      console.error(err);
      alert('Failed to bulk delete media: ' + err.message);
    }
  };

  // Instant playtime update (e.g. Stop Session or +30m / +1h quick tap)
  const handleLogSession = async (id, newTotalHours) => {
    try {
      setMedia((prev) =>
        prev.map((m) => (m.id === id ? { ...m, hoursPlayed: newTotalHours } : m))
      );
      await updateMedia(id, { hoursPlayed: newTotalHours });
    } catch (err) {
      console.error(err);
      loadMedia();
    }
  };

  // Cover picker handler
  const handleApplyCover = async (posterUrl) => {
    if (!coverPickerItem) return;
    try {
      const updated = await updateMedia(coverPickerItem.id, { poster: posterUrl });
      setMedia((prev) => prev.map((m) => (m.id === coverPickerItem.id ? updated : m)));
      setCoverPickerItem(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update cover picture');
    }
  };

  // 1-Click Auto Fix for Missing Covers
  const handleFixMissingCovers = async () => {
    const missingCount = media.filter((m) => !m.poster || m.poster === '').length;
    if (missingCount === 0) {
      alert(
        'All items already have cover pictures! If any item has the wrong cover, click the 🖼️ button on its card to pick from candidates.'
      );
      return;
    }

    try {
      setIsFixingCovers(true);
      const res = await refreshMissingCovers();
      if (res && res.media) {
        setMedia(res.media);
      }
      alert(
        `Auto-fix complete! Successfully found & updated ${res.updated || 0} covers out of ${missingCount} missing.`
      );
    } catch (err) {
      console.error(err);
      alert('Auto-fix encountered an error: ' + err.message);
    } finally {
      setIsFixingCovers(false);
    }
  };

  // ── Cinema & TV Filtering logic ────────────────────
  const filteredCinema = cinemaMedia.filter((item) => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;

    // Filter by theatre
    if (theatreOnly) {
      const isTheatre =
        item.venue === 'theatre' ||
        (item.notes && /theatre|theater|cinema|imax/i.test(item.notes));
      if (!isTheatre) return false;
    }

    // Filter by year
    if (yearFilter !== 'all') {
      if (!item.watchedDate || !item.watchedDate.startsWith(yearFilter)) {
        return false;
      }
    }

    // Filter by genre (checks item.genres array and fallback text)
    if (genreFilter !== 'All Genres') {
      const g = genreFilter.toLowerCase();
      const hasGenre =
        Array.isArray(item.genres) &&
        item.genres.some(
          (genreName) =>
            genreName.toLowerCase().includes(g) || g.includes(genreName.toLowerCase())
        );
      const textToSearch = `${item.title} ${item.notes || ''} ${item.review || ''}`.toLowerCase();
      if (!hasGenre && !textToSearch.includes(g)) return false;
    }

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!item.title.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // ── Counts for filter badges ───────────────────────
  const counts = {
    all: cinemaMedia.length,
    movie: cinemaMedia.filter((m) => m.type === 'movie').length,
    show: cinemaMedia.filter((m) => m.type === 'show').length,
    game: gamesMedia.length,
  };

  const handleTypeChange = (newType) => {
    if (newType === 'game') {
      setActiveVaultTab('games');
      setTypeFilter('all');
    } else {
      setActiveVaultTab('cinema');
      setTypeFilter(newType);
    }
  };

  // ── Keyboard: Escape to close modals ───────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setShowAddForm(false);
        setShowImportModal(false);
        setShowInsightsModal(false);
        setShowDuplicatesModal(false);
        setEditingItem(null);
        setCoverPickerItem(null);
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
        onImportClick={() => setShowImportModal(true)}
        onFixCovers={handleFixMissingCovers}
        onInsightsClick={() => setShowInsightsModal(true)}
        duplicateCount={duplicateCount}
        onDuplicatesClick={() => setShowDuplicatesModal(true)}
        activeTab={activeVaultTab}
        onTabChange={setActiveVaultTab}
        gamesCount={gamesMedia.length}
        cinemaCount={cinemaMedia.length}
      />

      <main className="main-content">
        {/* Weekly Recap Dismissible Greeting Banner */}
        <WeeklyRecapBanner media={media} />

        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={loadMedia}>Retry</button>
          </div>
        )}

        {isFixingCovers && (
          <div
            className="error-banner"
            style={{
              borderColor: 'rgba(128, 131, 255, 0.4)',
              background: 'rgba(128, 131, 255, 0.15)',
              color: '#c0c1ff',
            }}
          >
            <span>
              ⏳ Searching databases and auto-fetching missing covers for your vault... Please wait a moment.
            </span>
          </div>
        )}

        {/* ── Vault Switcher Body ── */}
        {activeVaultTab === 'games' ? (
          <GamesPage
            games={gamesMedia}
            onUpdateGame={handleUpdate}
            onDeleteGame={handleDelete}
            onEditGame={setEditingItem}
            onOpenAddModal={() => setShowAddForm(true)}
            onLogSession={handleLogSession}
            onFixCover={(item) => setCoverPickerItem(item)}
            onSwitchToCinema={() => {
              setActiveVaultTab('cinema');
              setTypeFilter('all');
            }}
            searchQuery={searchQuery}
          />
        ) : (
          <>
            {/* Ticker & Filter Bar for Cinema & TV */}
            <FilterBar
              typeFilter={typeFilter}
              statusFilter={statusFilter}
              onTypeChange={handleTypeChange}
              onStatusChange={setStatusFilter}
              counts={counts}
              yearFilter={yearFilter}
              onYearChange={setYearFilter}
              availableYears={availableYears}
              theatreOnly={theatreOnly}
              onTheatreToggle={() => setTheatreOnly((prev) => !prev)}
              theatreCount={theatreCount}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              statsSummary={statsSummary}
              genreFilter={genreFilter}
              onGenreChange={setGenreFilter}
            />

            {/* Active Media Shelf ("In Progress" Cinema & TV) */}
            {!searchQuery && statusFilter === 'all' && viewMode === 'grid' && inProgressItems.length > 0 && (
              <ActiveMediaShelf
                inProgressItems={inProgressItems}
                onEdit={setEditingItem}
                onLogSession={handleLogSession}
              />
            )}

            {/* Main Vault Archive Grid / Timeline */}
            <MediaList
              items={filteredCinema}
              onEdit={setEditingItem}
              onDelete={(item) => setEditingItem(item)}
              onLogSession={handleLogSession}
              onPickCover={(item) => setCoverPickerItem(item)}
              viewMode={viewMode}
            />
          </>
        )}
      </main>

      {/* ── Modals ── */}
      {showDuplicatesModal && (
        <DuplicateCleanerModal
          media={media}
          onDeleteOne={handleDelete}
          onBulkDelete={handleBulkDelete}
          onUpdateOne={handleUpdate}
          onClose={() => setShowDuplicatesModal(false)}
        />
      )}

      {showInsightsModal && (
        <VaultInsightsModal
          initialYear={yearFilter === 'all' ? (availableYears[0] || 'all') : yearFilter}
          availableYears={availableYears}
          onClose={() => setShowInsightsModal(false)}
        />
      )}

      {coverPickerItem && (
        <CoverPickerModal
          item={coverPickerItem}
          onSelect={handleApplyCover}
          onClose={() => setCoverPickerItem(null)}
        />
      )}

      {showImportModal && (
        <ImportModal
          onImport={handleBulkImport}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {showAddForm && (
        <AddMediaForm
          onSubmit={handleAdd}
          onClose={() => setShowAddForm(false)}
          defaultType={activeVaultTab === 'games' ? 'game' : 'movie'}
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
