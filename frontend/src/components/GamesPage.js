import React, { useState, useMemo } from 'react';
import './GamesPage.css';

const MONTH_NAMES = {
  '01': 'January', '02': 'February', '03': 'March', '04': 'April',
  '05': 'May', '06': 'June', '07': 'July', '08': 'August',
  '09': 'September', '10': 'October', '11': 'November', '12': 'December',
};

function formatMonthLabel(monthKey) {
  if (!monthKey || monthKey === 'unknown') return 'Summer / Backlog';
  const parts = monthKey.split('-');
  if (parts.length === 2) {
    const mName = MONTH_NAMES[parts[1]] || parts[1];
    return `${mName} ${parts[0]}`;
  }
  return monthKey;
}

function formatDateRange(from, to) {
  if (!from && !to) return '';
  if (from && to && from === to) return from;
  if (from && to) return `${from} → ${to}`;
  return from ? `Started ${from}` : `Ended ${to}`;
}

function GamesPage({
  games = [],
  onUpdateGame,
  onDeleteGame,
  onEditGame,
  onOpenAddModal,
  onOpenImportModal,
  onLogSession,
  onFixCover,
  onSwitchToCinema,
  searchQuery = '',
}) {
  // ── Local Filter States ──
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'in_progress', 'completed', 'replay', 'dropped'
  const [platformFilter, setPlatformFilter] = useState('all');
  const [genreFilter, setGenreFilter] = useState('all');
  const [sortBy, setSortBy] = useState('chronological'); // 'chronological', 'playtime', 'rating', 'title'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // ── Selected Game for Telemetry Inspector ──
  const [selectedGameId, setSelectedGameId] = useState(null);

  // ── Modals State ──
  const [randomizerOpen, setRandomizerOpen] = useState(false);
  const [randomPick, setRandomPick] = useState(null);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionGame, setSessionGame] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(1); // hours
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionPlatform, setSessionPlatform] = useState('Steam Deck');

  // Currently selected game object for the right-hand Inspector
  const selectedGame = useMemo(() => {
    if (selectedGameId) {
      const found = games.find((g) => g.id === selectedGameId);
      if (found) return found;
    }
    // Default to the first in-progress or first game
    return games.find((g) => g.status === 'in_progress') || games[0] || null;
  }, [games, selectedGameId]);

  // ── Metrics Calculation (Stitch KPI Header) ──
  const metrics = useMemo(() => {
    let totalHours = 0;
    let completedCount = 0;
    let inProgressCount = 0;
    let droppedCount = 0;
    let replaysCount = 0;
    let totalRatings = 0;
    let ratedCount = 0;

    games.forEach((g) => {
      const hrs = Number(g.hoursPlayed) || 0;
      totalHours += hrs;
      if (g.status === 'completed') completedCount++;
      if (g.status === 'in_progress') inProgressCount++;
      if (g.status === 'dropped') droppedCount++;
      if (g.replay) replaysCount++;
      if (g.rating && Number(g.rating) > 0) {
        totalRatings += Number(g.rating);
        ratedCount++;
      }
    });

    const completionRate = games.length > 0 ? Math.round((completedCount / games.length) * 100) : 0;
    const avgRating = ratedCount > 0 ? (totalRatings / ratedCount).toFixed(1) : '4.5';
    const avgHours = games.length > 0 ? (totalHours / games.length).toFixed(1) : '0.0';

    return {
      total: games.length,
      totalHours: Number(totalHours.toFixed(1)),
      completedCount,
      inProgressCount,
      droppedCount,
      replaysCount,
      completionRate,
      avgRating,
      avgHours,
    };
  }, [games]);

  // ── Active Campaigns Spotlight Strip ──
  const activeGames = useMemo(() => {
    return games.filter((g) => g.status === 'in_progress');
  }, [games]);

  // ── Available Platforms & Genres ──
  // (Available for future dynamic filters if needed)

  // ── Filtered Games ──
  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      // 1. Status Filter
      if (statusFilter === 'replay' && !g.replay) return false;
      if (statusFilter !== 'all' && statusFilter !== 'replay' && g.status !== statusFilter) {
        return false;
      }

      // 2. Platform Filter
      if (platformFilter !== 'all') {
        const plat = (g.platform || '').toLowerCase();
        if (!plat.includes(platformFilter.toLowerCase())) return false;
      }

      // 3. Genre Filter
      if (genreFilter !== 'all') {
        const target = genreFilter.toLowerCase();
        const hasGenre =
          Array.isArray(g.genres) &&
          g.genres.some((x) => x.toLowerCase().includes(target) || target.includes(x.toLowerCase()));
        if (!hasGenre) return false;
      }

      // 4. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const text = `${g.title} ${g.notes || ''} ${g.platform || ''} ${(g.genres || []).join(' ')}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });
  }, [games, statusFilter, platformFilter, genreFilter, searchQuery]);

  // ── Sorted Games ──
  const sortedGames = useMemo(() => {
    const list = [...filteredGames];
    if (sortBy === 'playtime') {
      return list.sort((a, b) => (Number(b.hoursPlayed) || 0) - (Number(a.hoursPlayed) || 0));
    }
    if (sortBy === 'rating') {
      return list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    }
    if (sortBy === 'title') {
      return list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }
    // Default: Chronological by date (Jan 2026 -> Oct 2026)
    return list.sort((a, b) => {
      const dateA = a.playedFrom || a.watchedDate || a.playedMonth || '9999';
      const dateB = b.playedFrom || b.watchedDate || b.playedMonth || '9999';
      return dateA.localeCompare(dateB);
    });
  }, [filteredGames, sortBy]);

  // ── Backlog Wheel Decider ──
  const handleRollBacklog = () => {
    const candidates = games.filter((g) => g.status !== 'completed' && g.status !== 'dropped');
    const pool = candidates.length > 0 ? candidates : games;
    if (pool.length === 0) return;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    setRandomPick(chosen);
    setRandomizerOpen(true);
  };

  // ── Quick Session Modal Triggers ──
  const handleOpenSessionModal = (game) => {
    setSessionGame(game);
    setSessionDuration(1);
    setSessionNotes('');
    setSessionPlatform(game?.platform?.split('/')[0]?.trim() || 'Steam Deck');
    setSessionModalOpen(true);
  };

  const handleCommitSession = async () => {
    if (!sessionGame) return;
    const added = Number(sessionDuration);
    const current = Number(sessionGame.hoursPlayed) || 0;
    const newTotal = Number((current + added).toFixed(1));

    const updates = {
      hoursPlayed: newTotal,
      status: sessionGame.status === 'completed' ? 'completed' : 'in_progress',
    };
    if (sessionNotes.trim()) {
      updates.notes = sessionGame.notes
        ? `${sessionGame.notes} | ${sessionNotes.trim()}`
        : sessionNotes.trim();
    }

    await onUpdateGame(sessionGame.id, updates);
    setSessionModalOpen(false);
    setSessionGame(null);
  };

  return (
    <div className="games-hub-root">
      {/* ── 0. TOP NAVIGATION / BREADCRUMB ── */}
      <div className="games-top-nav-bar">
        <div className="games-brand-title">
          <span className="games-brand-icon">🎮</span>
          <div className="games-brand-text">
            <h2>Games Vault</h2>
            <span className="games-brand-badge">Stitch Kinetic Edition</span>
          </div>
        </div>

        <div className="games-top-actions">
          {onSwitchToCinema && (
            <button
              className="btn-switch-cinema"
              onClick={onSwitchToCinema}
              title="Return to Movies & TV Series Archive"
            >
              <span className="material-symbols-outlined text-sm">movie</span>
              <span>Back to Cinema &amp; TV</span>
            </button>
          )}

          {onOpenImportModal && (
            <button
              className="btn-import-game-secondary"
              onClick={onOpenImportModal}
              title="Bulk import games from copied notes"
            >
              <span className="material-symbols-outlined text-sm">content_paste</span>
              <span>Import Games</span>
            </button>
          )}

          <button
            className="btn-add-game-primary"
            onClick={onOpenAddModal}
            title="Log a new game title"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>Add Game</span>
          </button>
        </div>
      </div>

      {/* ── 1. KINETIC GAMING KPIS ── */}
      <section className="games-kpi-grid">
        {/* KPI 1: Playtime Velocity */}
        <div className="kpi-card">
          <div className="kpi-glow-orb glow-primary" />
          <div className="kpi-header">
            <span className="kpi-label">Total Playtime</span>
            <div className="kpi-badge-live">
              <span className="material-symbols-outlined text-xs">timer</span>
              <span>Logged</span>
            </div>
          </div>
          <div className="kpi-hero-num">
            <span className="kpi-big-val">{metrics.totalHours}</span>
            <span className="kpi-unit">hrs</span>
          </div>
          <div className="kpi-footer">
            <span>{metrics.total} Logged Vault Games</span>
            <span className="kpi-sub-highlight">
              <span className="pulse-dot" />
              {metrics.avgHours}h avg / title
            </span>
          </div>
        </div>

        {/* KPI 2: Completion Matrix */}
        <div className="kpi-card">
          <div className="kpi-glow-orb glow-tertiary" />
          <div className="kpi-header">
            <span className="kpi-label">Completion Matrix</span>
            <span className="kpi-badge-status status-emerald">{metrics.completionRate}% Cleared</span>
          </div>
          <div className="kpi-hero-num">
            <span className="kpi-big-val text-tertiary">{metrics.completedCount}</span>
            <span className="kpi-unit">/ {metrics.total}</span>
            <span className="kpi-sub-text">Finished</span>
          </div>
          {/* Progress Bar */}
          <div className="kpi-progress-bar-wrap">
            <div
              className="kpi-progress-fill"
              style={{ width: `${metrics.completionRate}%` }}
            />
          </div>
          <div className="kpi-matrix-legend">
            <span className="text-tertiary font-bold">{metrics.completedCount} Done</span>
            <span className="text-primary font-bold">{metrics.inProgressCount} Active</span>
            <span>{metrics.replaysCount} Replays</span>
            {metrics.droppedCount > 0 && <span className="text-error">{metrics.droppedCount} Dropped</span>}
          </div>
        </div>

        {/* KPI 3: Trophy & Rating Mastery */}
        <div className="kpi-card">
          <div className="kpi-glow-orb glow-secondary" />
          <div className="kpi-header">
            <span className="kpi-label">Vault Rating Score</span>
            <div className="kpi-badge-live badge-violet">
              <span className="material-symbols-outlined text-xs">military_tech</span>
              <span>Curated</span>
            </div>
          </div>
          <div className="kpi-hero-num">
            <span className="kpi-big-val text-secondary">{metrics.avgRating}</span>
            <span className="kpi-unit">/ 5.0</span>
            <span className="kpi-sub-text">Mean Rating</span>
          </div>
          <div className="kpi-footer">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-secondary">workspace_premium</span>
              {games.filter((g) => Number(g.rating) === 5).length} Masterpieces (5★)
            </span>
            <span className="text-secondary font-semibold">Verified</span>
          </div>
        </div>

        {/* KPI 4: Hardware Ecosystem */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Hardware Ecosystem</span>
            <span className="kpi-sync-beacon">
              <span className="pulse-dot green" />
              Vault Synced
            </span>
          </div>
          <div className="hardware-pill-list">
            <div className="hardware-row">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm">phone_android</span>
                <span className="hardware-name">Mobile &amp; Handheld</span>
              </div>
              <span className="hardware-stat font-mono">
                {games.filter((g) => (g.platform || '').toLowerCase().includes('mobile')).length} Titles
              </span>
            </div>
            <div className="hardware-row">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-sm">desktop_windows</span>
                <span className="hardware-name">PC / Steam</span>
              </div>
              <span className="hardware-stat font-mono text-tertiary">
                {games.filter((g) => (g.platform || '').toLowerCase().includes('pc') || (g.platform || '').toLowerCase().includes('steam')).length} Titles
              </span>
            </div>
            <div className="hardware-row">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-sm">sports_esports</span>
                <span className="hardware-name">PlayStation &amp; Console</span>
              </div>
              <span className="hardware-stat font-mono">
                {games.filter((g) => (g.platform || '').toLowerCase().includes('playstation') || (g.platform || '').toLowerCase().includes('console')).length} Titles
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. ACTIVE CAMPAIGNS SPOTLIGHT STRIP ── */}
      {activeGames.length > 0 && (
        <section className="active-spotlight-section">
          <div className="section-header-row">
            <div className="flex items-center gap-2">
              <div className="section-header-pill" />
              <h2 className="section-title">Active Campaigns &amp; Live Sessions</h2>
              <span className="active-count-tag">{activeGames.length} Active</span>
            </div>
            <div className="section-header-info">
              <span className="material-symbols-outlined text-sm text-tertiary">cloud_sync</span>
              <span>Fast Playtime Logging Enabled</span>
            </div>
          </div>

          <div className="active-cards-grid">
            {activeGames.map((game) => (
              <div
                key={game.id}
                className="active-hero-card"
                onClick={() => setSelectedGameId(game.id)}
              >
                {/* Hero Banner Header */}
                <div className="hero-banner-wrap">
                  {game.poster ? (
                    <img src={game.poster} alt={game.title} className="hero-banner-img" />
                  ) : (
                    <div className="hero-banner-placeholder">🎮</div>
                  )}
                  <div className="hero-banner-scrim" />

                  {/* Top Badges */}
                  <div className="hero-top-badges">
                    <span className="hero-pill-platform">{game.platform || 'Mobile'}</span>
                    {game.replay && <span className="hero-pill-replay">🔄 Replay</span>}
                  </div>

                  {/* Bottom Title & Hours */}
                  <div className="hero-bottom-info">
                    <div>
                      <span className="hero-caption">Now Playing</span>
                      <h3 className="hero-title">{game.title}</h3>
                    </div>
                    <div className="text-right">
                      <span className="hero-hours">{Number(game.hoursPlayed || 0).toFixed(1)}h</span>
                      <p className="hero-logged-label">Logged</p>
                    </div>
                  </div>
                </div>

                {/* Hero Card Body */}
                <div className="hero-card-body">
                  {game.notes && (
                    <p className="hero-quote-note">
                      "{game.notes}"
                    </p>
                  )}

                  {/* Quick Session Logger Controls */}
                  <div className="hero-action-row" onClick={(e) => e.stopPropagation()}>
                    <div className="quick-log-group">
                      <span className="log-label">+Log:</span>
                      <button
                        className="btn-quick-chip"
                        onClick={() => onLogSession(game.id, Number((Number(game.hoursPlayed || 0) + 0.5).toFixed(1)))}
                        title="Add 30 minutes playtime"
                      >
                        +30m
                      </button>
                      <button
                        className="btn-quick-chip"
                        onClick={() => onLogSession(game.id, Number((Number(game.hoursPlayed || 0) + 1.0).toFixed(1)))}
                        title="Add 1 hour playtime"
                      >
                        +1h
                      </button>
                      <button
                        className="btn-quick-chip"
                        onClick={() => onLogSession(game.id, Number((Number(game.hoursPlayed || 0) + 2.0).toFixed(1)))}
                        title="Add 2 hours playtime"
                      >
                        +2h
                      </button>
                    </div>

                    <button
                      className="btn-hero-inspect"
                      onClick={() => handleOpenSessionModal(game)}
                    >
                      <span className="material-symbols-outlined text-sm">history_toggle_off</span>
                      <span>Session Log</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 3. FILTER & VIEW CONTROL STRIP ── */}
      <section className="games-controls-strip">
        {/* Row 1: Status Tabs & Actions */}
        <div className="controls-row-1">
          {/* Status Tabs */}
          <div className="status-tabs-container">
            <button
              className={`status-tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All Games ({games.length})
            </button>
            <button
              className={`status-tab-btn ${statusFilter === 'in_progress' ? 'active' : ''}`}
              onClick={() => setStatusFilter('in_progress')}
            >
              Playing ({metrics.inProgressCount})
            </button>
            <button
              className={`status-tab-btn ${statusFilter === 'completed' ? 'active' : ''}`}
              onClick={() => setStatusFilter('completed')}
            >
              Completed ({metrics.completedCount})
            </button>
            <button
              className={`status-tab-btn ${statusFilter === 'replay' ? 'active' : ''}`}
              onClick={() => setStatusFilter('replay')}
            >
              🔄 Replays ({metrics.replaysCount})
            </button>
            {metrics.droppedCount > 0 && (
              <button
                className={`status-tab-btn ${statusFilter === 'dropped' ? 'active' : ''}`}
                onClick={() => setStatusFilter('dropped')}
              >
                Dropped ({metrics.droppedCount})
              </button>
            )}
          </div>

          {/* Right Tools: Backlog Randomizer + Sort + View */}
          <div className="controls-tools-group">
            {/* Backlog Randomizer CTA */}
            <button
              className="btn-roll-backlog"
              onClick={handleRollBacklog}
              title="Quantum Dice Backlog Decider"
            >
              <span className="material-symbols-outlined text-base">casino</span>
              <span>Roll Backlog</span>
            </button>

            {/* Sorting Selector */}
            <div className="sort-selector-wrap">
              <span className="material-symbols-outlined text-outline text-sm mr-1">sort</span>
              <select
                className="sort-dropdown"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="chronological">📅 Chronological (Jan → Oct)</option>
                <option value="playtime">⏱️ Playtime (High to Low)</option>
                <option value="rating">⭐ Rating (High to Low)</option>
                <option value="title">🔤 Title (A to Z)</option>
              </select>
            </div>

            {/* View Mode Toggles */}
            <div className="view-toggle-wrap">
              <button
                className={`btn-view-toggle ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="3:4 Box Art Grid View"
              >
                <span className="material-symbols-outlined text-base">grid_view</span>
              </button>
              <button
                className={`btn-view-toggle ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="Compact List View"
              >
                <span className="material-symbols-outlined text-base">view_headline</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Platform Pills & Genre Tags */}
        <div className="controls-row-2">
          {/* Platform Filters */}
          <div className="filter-pills-wrap">
            <span className="filter-group-label">Platform:</span>
            <button
              className={`pill-filter-btn ${platformFilter === 'all' ? 'active' : ''}`}
              onClick={() => setPlatformFilter('all')}
            >
              All ({games.length})
            </button>
            <button
              className={`pill-filter-btn ${platformFilter === 'mobile' ? 'active' : ''}`}
              onClick={() => setPlatformFilter('mobile')}
            >
              📱 Mobile
            </button>
            <button
              className={`pill-filter-btn ${platformFilter === 'pc' ? 'active' : ''}`}
              onClick={() => setPlatformFilter('pc')}
            >
              💻 PC / Steam
            </button>
            <button
              className={`pill-filter-btn ${platformFilter === 'playstation' ? 'active' : ''}`}
              onClick={() => setPlatformFilter('playstation')}
            >
              🎮 PlayStation
            </button>
          </div>

          {/* Genre Chips */}
          <div className="genre-chips-wrap">
            <span className="filter-group-label">Genre:</span>
            <button
              className={`genre-chip ${genreFilter === 'all' ? 'active' : ''}`}
              onClick={() => setGenreFilter('all')}
            >
              All
            </button>
            {['Action', 'Sports', 'Adventure', 'Horror', 'RPG', 'Shooter', 'Simulation', 'Strategy', 'Fantasy', 'Drama'].map((g) => (
              <button
                key={g}
                className={`genre-chip ${genreFilter === g ? 'active' : ''}`}
                onClick={() => setGenreFilter(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. MAIN VAULT GRID & DETAILS INSPECTOR LAYOUT ── */}
      <div className="games-layout-split">
        {/* LEFT COLUMN: Curated Box Art Grid (3:4 Ratio) */}
        <div className="games-grid-column">
          <div className="grid-header-bar">
            <div className="flex items-baseline gap-2">
              <h3 className="grid-header-title">Curated Library Vault</h3>
              <span className="grid-header-count">
                Showing {sortedGames.length} of {games.length} Titles
              </span>
            </div>
            <span className="grid-header-tip">Click any card to inspect telemetry</span>
          </div>

          {sortedGames.length === 0 ? (
            <div className="games-empty-state">
              <span className="empty-icon">🎮</span>
              <h3>No games matched your filters</h3>
              <p>Try resetting the platform, genre, or search filters.</p>
              <button
                className="btn-secondary small mt-2"
                onClick={() => {
                  setStatusFilter('all');
                  setPlatformFilter('all');
                  setGenreFilter('all');
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="vault-cards-grid">
              {sortedGames.map((game) => {
                const isSelected = selectedGame?.id === game.id;
                const hours = Number(game.hoursPlayed || 0);

                return (
                  <div
                    key={game.id}
                    className={`vault-box-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedGameId(game.id)}
                  >
                    {/* 3:4 Aspect Ratio Cover Box */}
                    <div className="box-cover-wrapper">
                      {game.poster ? (
                        <img
                          src={game.poster}
                          alt={game.title}
                          className="box-cover-img"
                          loading="lazy"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="box-cover-placeholder">🎮</div>
                      )}
                      <div className="box-cover-scrim" />

                      {/* Top Badges */}
                      <div className="box-top-badges">
                        <span className="box-badge-platform">{game.platform || 'Mobile'}</span>
                        {game.replay && <span className="box-badge-replay">🔄 Replay</span>}
                      </div>

                      {/* Top Right Status Badge */}
                      <div className="box-status-tag-wrap">
                        {game.status === 'in_progress' ? (
                          <span className="box-status-active">
                            <span className="pulse-dot" /> Active
                          </span>
                        ) : game.status === 'completed' ? (
                          <span className="box-status-done">✓ Done</span>
                        ) : game.status === 'dropped' ? (
                          <span className="box-status-dropped">Dropped</span>
                        ) : null}
                      </div>

                      {/* Bottom Quick Overlay */}
                      <div className="box-bottom-overlay">
                        {game.rating > 0 ? (
                          <div className="box-star-badge">
                            <span className="star-icon">★</span>
                            <span>{Number(game.rating).toFixed(1)}</span>
                          </div>
                        ) : (
                          <span />
                        )}
                        <span className="box-hours-badge">{hours.toFixed(1)}h</span>
                      </div>
                    </div>

                    {/* Card Meta Footer */}
                    <div className="box-card-footer">
                      <h4 className="box-card-title" title={game.title}>{game.title}</h4>
                      <p className="box-card-subtitle">
                        {(game.genres || []).filter((g) => g !== 'Game').slice(0, 2).join(' / ') || 'Game'}
                        {game.playedMonth ? ` • ${formatMonthLabel(game.playedMonth)}` : ''}
                      </p>

                      {game.notes && (
                        <p className="box-card-notes-preview" title={game.notes}>
                          "{game.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View Mode */
            <div className="vault-list-container">
              {sortedGames.map((game) => (
                <div
                  key={game.id}
                  className={`vault-list-row ${selectedGame?.id === game.id ? 'selected' : ''}`}
                  onClick={() => setSelectedGameId(game.id)}
                >
                  <div className="list-row-poster">
                    {game.poster ? (
                      <img src={game.poster} alt={game.title} />
                    ) : (
                      <div className="list-poster-placeholder">🎮</div>
                    )}
                  </div>

                  <div className="list-row-main">
                    <div className="flex items-center gap-2">
                      <h4 className="list-row-title">{game.title}</h4>
                      {game.replay && <span className="badge-replay-mini">Replay</span>}
                    </div>
                    <p className="list-row-meta">
                      {game.platform || 'Platform'} • {(game.genres || []).filter((g) => g !== 'Game').join(', ')} • {formatMonthLabel(game.playedMonth)}
                    </p>
                  </div>

                  <div className="list-row-notes">
                    {game.notes ? `"${game.notes}"` : '—'}
                  </div>

                  <div className="list-row-stats">
                    <span className="list-hours">{Number(game.hoursPlayed || 0).toFixed(1)}h</span>
                    <span className="list-status">{game.status}</span>
                  </div>

                  <div className="list-row-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-quick-log-row"
                      onClick={() => handleOpenSessionModal(game)}
                      title="Log session"
                    >
                      +Log
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Interactive Hardware & Telemetry Inspector Panel */}
        <aside className="games-inspector-column">
          {selectedGame ? (
            <div className="inspector-card">
              {/* Top Header */}
              <div className="inspector-header-bar">
                <div className="flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider">
                  <span className="pulse-dot" />
                  Hardware &amp; Telemetry Inspector
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="btn-icon-inspector"
                    onClick={() => onFixCover(selectedGame)}
                    title="Change Cover Picture"
                  >
                    <span className="material-symbols-outlined text-sm">image</span>
                  </button>
                  <button
                    className="btn-icon-inspector"
                    onClick={() => onEditGame(selectedGame)}
                    title="Edit Game Details"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                </div>
              </div>

              {/* Game Profile Hero */}
              <div className="inspector-hero-row">
                <div className="inspector-cover-box">
                  {selectedGame.poster ? (
                    <img src={selectedGame.poster} alt={selectedGame.title} />
                  ) : (
                    <div className="inspector-cover-placeholder">🎮</div>
                  )}
                </div>

                <div className="inspector-hero-info">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="badge-platform-tag">{selectedGame.platform || 'Mobile'}</span>
                    <span className={`badge-status-tag status-${selectedGame.status}`}>
                      {selectedGame.status}
                    </span>
                    {selectedGame.replay && <span className="badge-replay-mini">Replay</span>}
                  </div>

                  <h3 className="inspector-game-title">{selectedGame.title}</h3>
                  <p className="inspector-game-genre">
                    {(selectedGame.genres || []).filter((g) => g !== 'Game').join(' • ') || 'Video Game'}
                  </p>

                  <div className="inspector-score-row">
                    <span className="inspector-star-score">
                      ★ {Number(selectedGame.rating || 4.5).toFixed(1)} / 5.0
                    </span>
                    <span className="inspector-dot-divider">•</span>
                    <span className="inspector-hours-score">
                      {Number(selectedGame.hoursPlayed || 0).toFixed(1)}h Logged
                    </span>
                  </div>
                </div>
              </div>

              {/* Hardware Calibration Box */}
              <div className="inspector-calibration-box">
                <div className="calibration-header">
                  <span>Rig Telemetry Profile</span>
                  <span className="text-tertiary font-mono font-bold">Verified 60FPS</span>
                </div>
                <div className="calibration-metrics-grid">
                  <div className="metric-box">
                    <span className="metric-lbl">Target</span>
                    <span className="metric-val font-mono">60 FPS</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-lbl">Platform</span>
                    <span className="metric-val text-primary truncate">{selectedGame.platform || 'Mobile'}</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-lbl">Period</span>
                    <span className="metric-val font-mono">{selectedGame.playedMonth || '2026'}</span>
                  </div>
                </div>
                <div className="calibration-footer">
                  <span className="flex items-center gap-1 text-tertiary">
                    <span className="material-symbols-outlined text-xs">battery_charging_full</span>
                    <span>Battery / State: Optimal</span>
                  </span>
                  <span className="text-outline text-xs">Cloud Saves OK</span>
                </div>
              </div>

              {/* Curator Diary & Tactical Notes */}
              <div className="inspector-notes-box">
                <div className="notes-box-header">
                  <span>Curator Diary &amp; Strategy</span>
                  <button
                    className="btn-edit-note-inline"
                    onClick={() => onEditGame(selectedGame)}
                  >
                    Edit Note
                  </button>
                </div>
                <div className="notes-content-wrap">
                  {selectedGame.notes ? (
                    <p className="notes-quote-text">
                      "{selectedGame.notes}"
                    </p>
                  ) : (
                    <p className="notes-placeholder-text">
                      No curator notes logged yet. Click 'Edit Note' to record your impressions.
                    </p>
                  )}
                  {selectedGame.playedFrom && (
                    <div className="notes-date-range">
                      <span>Timeline: {formatDateRange(selectedGame.playedFrom, selectedGame.playedTo)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="inspector-actions-group">
                <button
                  className="btn-primary-log-session"
                  onClick={() => handleOpenSessionModal(selectedGame)}
                >
                  <span className="material-symbols-outlined text-base">history_toggle_off</span>
                  <span>Log Play Session (+Hours)</span>
                </button>

                <div className="inspector-secondary-actions">
                  <button
                    className="btn-inspector-action"
                    onClick={() =>
                      onUpdateGame(selectedGame.id, {
                        status: selectedGame.status === 'completed' ? 'in_progress' : 'completed',
                      })
                    }
                  >
                    <span className="material-symbols-outlined text-sm text-tertiary">
                      {selectedGame.status === 'completed' ? 'undo' : 'check_circle'}
                    </span>
                    <span>{selectedGame.status === 'completed' ? 'Set In-Progress' : 'Mark Completed'}</span>
                  </button>

                  <button
                    className="btn-inspector-action"
                    onClick={() =>
                      onUpdateGame(selectedGame.id, {
                        replay: !selectedGame.replay,
                      })
                    }
                  >
                    <span className="material-symbols-outlined text-sm text-secondary">repeat</span>
                    <span>{selectedGame.replay ? 'Remove Replay' : 'Tag as Replay'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="inspector-empty-card">
              <span className="material-symbols-outlined text-3xl text-outline mb-2">sports_esports</span>
              <p>Select a game from the vault to inspect telemetry and tactical notes.</p>
            </div>
          )}
        </aside>
      </div>

      {/* ── MODAL 1: BACKLOG WHEEL DECIDER ── */}
      {randomizerOpen && (
        <div className="modal-overlay" onClick={() => setRandomizerOpen(false)}>
          <div className="backlog-decider-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() => setRandomizerOpen(false)}
            >
              ✕
            </button>

            <div className="modal-header-icon-row">
              <span className="material-symbols-outlined text-secondary text-2xl animate-spin">casino</span>
              <h3>Backlog Wheel Decider</h3>
            </div>

            <p className="decider-desc">
              Stuck in decision paralysis? The quantum dice has selected your next vault campaign:
            </p>

            {randomPick && (
              <div className="decider-pick-card">
                <div className="decider-poster-thumb">
                  {randomPick.poster ? (
                    <img src={randomPick.poster} alt={randomPick.title} />
                  ) : (
                    <div className="poster-placeholder">🎮</div>
                  )}
                </div>
                <div className="decider-info">
                  <span className="decider-badge">Priority Pick</span>
                  <h4 className="decider-title">{randomPick.title}</h4>
                  <p className="decider-meta">
                    {randomPick.platform || 'Platform'} • {Number(randomPick.hoursPlayed || 0).toFixed(1)}h Logged
                  </p>
                  {randomPick.notes && (
                    <p className="decider-quote">"{randomPick.notes}"</p>
                  )}
                </div>
              </div>
            )}

            <div className="decider-btn-row">
              <button
                className="btn-decider-inspect"
                onClick={() => {
                  if (randomPick) setSelectedGameId(randomPick.id);
                  setRandomizerOpen(false);
                }}
              >
                Inspect Game
              </button>
              <button
                className="btn-decider-reroll"
                onClick={handleRollBacklog}
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                <span>Re-roll</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: PLAY SESSION LOGGER MODAL ── */}
      {sessionModalOpen && sessionGame && (
        <div className="modal-overlay" onClick={() => setSessionModalOpen(false)}>
          <div className="session-logger-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() => setSessionModalOpen(false)}
            >
              ✕
            </button>

            <div className="modal-header-title-row">
              <div className="modal-icon-badge">
                <span className="material-symbols-outlined text-xl">history_toggle_off</span>
              </div>
              <div>
                <h3>Log Play Session</h3>
                <p className="session-subtitle">
                  Recording playtime for <strong>{sessionGame.title}</strong>
                </p>
              </div>
            </div>

            <div className="session-form-body">
              {/* Duration Buttons */}
              <div className="form-group">
                <label className="form-label">Session Duration</label>
                <div className="duration-grid">
                  {[0.5, 1, 2, 3].map((dur) => (
                    <button
                      key={dur}
                      className={`btn-duration ${sessionDuration === dur ? 'active' : ''}`}
                      onClick={() => setSessionDuration(dur)}
                    >
                      {dur === 0.5 ? '30m' : dur === 1 ? '1 hr' : dur === 2 ? '2 hrs' : '3 hrs+'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hardware Platform */}
              <div className="form-group">
                <label className="form-label">Active Hardware Platform</label>
                <div className="platform-options-row">
                  {['Mobile Device', 'Steam Deck / PC', 'PlayStation 5', 'Nintendo'].map((plat) => (
                    <button
                      key={plat}
                      className={`btn-platform-opt ${sessionPlatform === plat ? 'active' : ''}`}
                      onClick={() => setSessionPlatform(plat)}
                    >
                      {plat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes / Quest Progress */}
              <div className="form-group">
                <label className="form-label">Session Notes / Quest Progress</label>
                <textarea
                  className="session-notes-textarea"
                  placeholder="E.g. Completed semifinal match, defeated boss, reached chapter 4..."
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="session-modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setSessionModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCommitSession}
              >
                Save &amp; Sync Session (+{sessionDuration === 0.5 ? '30m' : `${sessionDuration}h`})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GamesPage;
