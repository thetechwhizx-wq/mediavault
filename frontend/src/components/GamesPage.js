import React, { useState, useMemo } from 'react';
import './GamesPage.css';

const MONTH_NAMES = {
  '01': 'January', '02': 'February', '03': 'March', '04': 'April',
  '05': 'May', '06': 'June', '07': 'July', '08': 'August',
  '09': 'September', '10': 'October', '11': 'November', '12': 'December',
};

function formatMonthLabel(monthKey) {
  if (!monthKey || monthKey === 'unknown') return 'Undated / Backlog';
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
  onLogSession,
  onFixCover,
  searchQuery = '',
}) {
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'in_progress', 'completed', 'replay', 'dropped'
  const [monthFilter, setMonthFilter] = useState('all');

  // ── Top Metrics ────────────────────────────────────
  const metrics = useMemo(() => {
    let totalHours = 0;
    let completedCount = 0;
    let inProgressCount = 0;
    let droppedCount = 0;
    let replaysCount = 0;

    games.forEach((g) => {
      totalHours += Number(g.hoursPlayed) || 0;
      if (g.status === 'completed') completedCount++;
      if (g.status === 'in_progress') inProgressCount++;
      if (g.status === 'dropped') droppedCount++;
      if (g.replay) replaysCount++;
    });

    return {
      total: games.length,
      totalHours: Number(totalHours.toFixed(1)),
      completedCount,
      inProgressCount,
      droppedCount,
      replaysCount,
    };
  }, [games]);

  // ── Available Months ───────────────────────────────
  const availableMonths = useMemo(() => {
    const set = new Set();
    games.forEach((g) => {
      if (g.playedMonth) set.add(g.playedMonth);
      else if (g.playedFrom && g.playedFrom.length >= 7) set.add(g.playedFrom.slice(0, 7));
      else if (g.watchedDate && g.watchedDate.length >= 7) set.add(g.watchedDate.slice(0, 7));
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [games]);

  // ── Filtered Games ─────────────────────────────────
  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      // Status filter
      if (statusFilter === 'replay' && !g.replay) return false;
      if (statusFilter !== 'all' && statusFilter !== 'replay' && g.status !== statusFilter) {
        return false;
      }

      // Month filter
      if (monthFilter !== 'all') {
        const itemMonth = g.playedMonth || (g.playedFrom ? g.playedFrom.slice(0, 7) : '') || (g.watchedDate ? g.watchedDate.slice(0, 7) : '');
        if (itemMonth !== monthFilter) return false;
      }

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const text = `${g.title} ${g.notes || ''} ${g.platform || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });
  }, [games, statusFilter, monthFilter, searchQuery]);

  // ── Group By Month ─────────────────────────────────
  const groupedByMonth = useMemo(() => {
    const map = new Map();

    filteredGames.forEach((g) => {
      const monthKey = g.playedMonth || (g.playedFrom ? g.playedFrom.slice(0, 7) : '') || (g.watchedDate ? g.watchedDate.slice(0, 7) : '') || 'unknown';
      if (!map.has(monthKey)) {
        map.set(monthKey, []);
      }
      map.get(monthKey).push(g);
    });

    // Sort months descending (newest first, 'unknown' at end)
    const sortedKeys = Array.from(map.keys()).sort((a, b) => {
      if (a === 'unknown') return 1;
      if (b === 'unknown') return -1;
      return b.localeCompare(a);
    });

    return sortedKeys.map((key) => ({
      monthKey: key,
      monthLabel: formatMonthLabel(key),
      items: map.get(key),
    }));
  }, [filteredGames]);

  // In-progress active playing shelf
  const activeGames = useMemo(() => {
    return games.filter((g) => g.status === 'in_progress');
  }, [games]);

  return (
    <div className="games-page-container">
      {/* ── 1. Games Curator Ticker & Metrics ── */}
      <section className="games-ticker-bar">
        <div className="ticker-left">
          <div className="ticker-stat-hero">
            <span className="ticker-sparkle">🎮</span>
            <div className="ticker-hero-text">
              <span className="ticker-hero-number">{metrics.total}</span>
              <span className="ticker-hero-label">Games Vault</span>
            </div>
          </div>

          <div className="ticker-divider" />

          <div className="ticker-metrics">
            <div className="ticker-metric-item">
              <span className="metric-icon">⏱️</span>
              <span>
                <strong>{metrics.totalHours}h</strong> Logged Playtime
              </span>
            </div>
            <div className="ticker-metric-item">
              <span className="metric-icon text-tertiary">✅</span>
              <span>
                <strong>{metrics.completedCount}</strong> Finished
              </span>
            </div>
            <div className="ticker-metric-item">
              <span className="metric-icon">🔄</span>
              <span>
                <strong>{metrics.replaysCount}</strong> Replays / Returns
              </span>
            </div>
            {metrics.droppedCount > 0 && (
              <div className="ticker-metric-item">
                <span className="metric-icon text-error">⏸️</span>
                <span>
                  <strong>{metrics.droppedCount}</strong> Dropped
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="ticker-right">
          <button
            className="btn-add-game-hero"
            onClick={onOpenAddModal}
            title="Log a new game playthrough"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>Add Game</span>
          </button>
        </div>
      </section>

      {/* ── 2. Currently Playing Active Shelf ── */}
      {activeGames.length > 0 && (
        <section className="active-games-shelf">
          <div className="shelf-header">
            <div className="shelf-title-wrap">
              <span className="active-pulse-beacon"></span>
              <h3>Currently Playing ({activeGames.length})</h3>
            </div>
            <span className="shelf-subtitle">Live Playtime & Fast Session Logger</span>
          </div>

          <div className="active-games-grid">
            {activeGames.map((g) => (
              <div key={g.id} className="active-game-card">
                <div className="active-game-poster">
                  {g.poster ? (
                    <img src={g.poster} alt={g.title} />
                  ) : (
                    <div className="poster-placeholder">🎮</div>
                  )}
                  {g.replay && <span className="active-replay-badge">🔄 Replay</span>}
                </div>
                <div className="active-game-details">
                  <h4 title={g.title}>{g.title}</h4>
                  <div className="active-hours-row">
                    <span className="hours-num">{Number(g.hoursPlayed || 0).toFixed(1)}h</span>
                    {g.targetHours > 0 && (
                      <span className="target-num">/ {g.targetHours}h Goal</span>
                    )}
                  </div>
                  <div className="active-quick-actions">
                    <button
                      className="btn-quick-log"
                      onClick={() => onLogSession(g.id, Number((Number(g.hoursPlayed || 0) + 0.5).toFixed(1)))}
                      title="Add 30 minutes playtime"
                    >
                      +30m
                    </button>
                    <button
                      className="btn-quick-log"
                      onClick={() => onLogSession(g.id, Number((Number(g.hoursPlayed || 0) + 1.0).toFixed(1)))}
                      title="Add 1 hour playtime"
                    >
                      +1h
                    </button>
                    <button
                      className="btn-mark-completed"
                      onClick={() => onUpdateGame(g.id, { status: 'completed' })}
                      title="Mark game completed"
                    >
                      ✓ Done
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 3. Filters Bar (Status & Month) ── */}
      <div className="games-filter-bar">
        {/* Status Filters */}
        <div className="status-pills">
          <button
            className={`status-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({games.length})
          </button>
          <button
            className={`status-pill ${statusFilter === 'in_progress' ? 'active' : ''}`}
            onClick={() => setStatusFilter('in_progress')}
          >
            Playing ({metrics.inProgressCount})
          </button>
          <button
            className={`status-pill ${statusFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setStatusFilter('completed')}
          >
            Completed ({metrics.completedCount})
          </button>
          <button
            className={`status-pill ${statusFilter === 'replay' ? 'active' : ''}`}
            onClick={() => setStatusFilter('replay')}
          >
            🔄 Replays ({metrics.replaysCount})
          </button>
          {metrics.droppedCount > 0 && (
            <button
              className={`status-pill ${statusFilter === 'dropped' ? 'active' : ''}`}
              onClick={() => setStatusFilter('dropped')}
            >
              Dropped ({metrics.droppedCount})
            </button>
          )}
        </div>

        {/* Month Selector */}
        {availableMonths.length > 0 && (
          <div className="month-select-wrap">
            <span className="month-label">Timeline Month:</span>
            <select
              className="month-dropdown"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            >
              <option value="all">All Months ({games.length})</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── 4. Monthly Timeline & Game Cards ── */}
      {groupedByMonth.length === 0 ? (
        <div className="games-empty-state">
          <span className="empty-icon">🎮</span>
          <h3>No games found</h3>
          <p>No titles matched your current filter criteria.</p>
        </div>
      ) : (
        <div className="games-timeline">
          {groupedByMonth.map((group) => (
            <div key={group.monthKey} className="timeline-month-block">
              <div className="month-header-row">
                <div className="month-badge-pill">
                  <span className="material-symbols-outlined text-xs">calendar_month</span>
                  <span>{group.monthLabel}</span>
                </div>
                <span className="month-item-count">{group.items.length} titles logged</span>
              </div>

              <div className="games-grid">
                {group.items.map((game) => {
                  const dateRangeText = formatDateRange(game.playedFrom, game.playedTo);

                  return (
                    <div key={game.id} className="game-card">
                      {/* Poster Wrap with 2:3 Aspect Ratio */}
                      <div className="game-poster-wrap">
                        {game.poster ? (
                          <img
                            src={game.poster}
                            alt={game.title}
                            className="game-poster-img"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="game-placeholder">
                            <span className="material-symbols-outlined text-3xl">sports_esports</span>
                          </div>
                        )}

                        <div className="game-scrim-gradient"></div>

                        {/* Top Badges */}
                        <div className="game-badges-top">
                          {game.replay && (
                            <span className="game-badge-replay" title="Replay / Return">
                              🔄 Return
                            </span>
                          )}
                          {game.status === 'in_progress' && (
                            <span className="game-badge-playing">Playing</span>
                          )}
                          {game.status === 'dropped' && (
                            <span className="game-badge-dropped">Dropped</span>
                          )}
                          {game.rating > 0 && (
                            <span className="game-badge-rating">★ {game.rating}</span>
                          )}
                        </div>

                        {/* Hover Quick Actions */}
                        <div className="game-hover-actions">
                          <button
                            type="button"
                            className="hover-btn"
                            onClick={() => onFixCover(game)}
                            title="Choose cover image"
                          >
                            🖼️
                          </button>
                          <button
                            type="button"
                            className="hover-btn"
                            onClick={() => onEditGame(game)}
                            title="Edit game entry"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            className="hover-btn delete"
                            onClick={() => onDeleteGame(game.id)}
                            title="Delete game"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Info Body */}
                      <div className="game-info-body">
                        <h4 className="game-title" title={game.title}>
                          {game.title}
                        </h4>

                        {/* Date Range & Platform */}
                        {(dateRangeText || game.platform) && (
                          <div className="game-meta-row">
                            {dateRangeText && (
                              <span className="game-date" title="Play duration">
                                📅 {dateRangeText}
                              </span>
                            )}
                            {game.platform && (
                              <span className="game-platform-pill">{game.platform}</span>
                            )}
                          </div>
                        )}

                        {/* User Notes / Personal Impressions */}
                        {game.notes && (
                          <p className="game-user-notes" title={game.notes}>
                            "{game.notes}"
                          </p>
                        )}

                        {/* Needs Check Alert if flagged in logs */}
                        {game.needsCheck && (
                          <div className="game-needs-check" title={game.needsCheck}>
                            <span className="material-symbols-outlined text-xs">info</span>
                            <span className="truncate">{game.needsCheck}</span>
                          </div>
                        )}

                        {/* Playtime Logger Footer */}
                        <div className="game-footer-row">
                          <span className="game-playtime">
                            ⏱️ {Number(game.hoursPlayed || 0).toFixed(1)} hrs
                          </span>
                          <div className="game-quick-taps">
                            <button
                              className="btn-tap"
                              onClick={() => onLogSession(game.id, Number((Number(game.hoursPlayed || 0) + 0.5).toFixed(1)))}
                              title="Add 30 minutes"
                            >
                              +30m
                            </button>
                            <button
                              className="btn-tap"
                              onClick={() => onLogSession(game.id, Number((Number(game.hoursPlayed || 0) + 1.0).toFixed(1)))}
                              title="Add 1 hour"
                            >
                              +1h
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default GamesPage;
