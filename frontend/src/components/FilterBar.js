import React from 'react';
import './FilterBar.css';

const TYPE_FILTERS = [
  { value: 'all', label: 'All Media', icon: 'apps' },
  { value: 'movie', label: 'Movies', icon: 'movie' },
  { value: 'show', label: 'Shows', icon: 'tv' },
  { value: 'game', label: 'Games', icon: 'sports_esports' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'plan_to_watch', label: 'Plan to Watch' },
  { value: 'rewatch', label: 'Rewatch' },
  { value: 'dropped', label: 'Dropped' },
];

const GENRE_PILLS = [
  'All Genres',
  'Action',
  'Sci-Fi',
  'Drama',
  'Comedy',
  'Anime',
  'Thriller',
  'Indian Cinema',
  'Animation',
];

function FilterBar({
  typeFilter,
  statusFilter,
  onTypeChange,
  onStatusChange,
  counts,
  yearFilter,
  onYearChange,
  availableYears = [],
  theatreOnly,
  onTheatreToggle,
  theatreCount = 0,
  viewMode = 'grid',
  onViewModeChange,
  statsSummary,
  genreFilter = 'All Genres',
  onGenreChange,
}) {
  return (
    <div className="filter-wrapper">
      {/* ── Stitch Ticker / Summary Bar ── */}
      {statsSummary && (
        <section className="stats-ticker-bar">
          <div className="ticker-left">
            <div className="ticker-stat-hero">
              <span className="ticker-sparkle">✨</span>
              <div className="ticker-hero-text">
                <span className="ticker-hero-number">{statsSummary.total}</span>
                <span className="ticker-hero-label">
                  Logged {yearFilter === 'all' ? 'All-Time' : yearFilter}
                </span>
              </div>
            </div>

            <div className="ticker-divider" />

            <div className="ticker-metrics">
              <div className="ticker-metric-item">
                <span className="metric-icon">⏱️</span>
                <span>
                  <strong>{statsSummary.watchHours || 0}h</strong> Watch
                </span>
              </div>
              <div className="ticker-metric-item">
                <span className="metric-icon">🎮</span>
                <span>
                  <strong>{statsSummary.gamingHours || 0}h</strong> Gaming
                </span>
              </div>
              {statsSummary.meanRating > 0 && (
                <div className="ticker-metric-item">
                  <span className="metric-icon">⭐</span>
                  <span>
                    <strong>{statsSummary.meanRating}</strong> Mean Rating
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick View Controls & Year Picker */}
          <div className="ticker-right">
            {/* Year Selector */}
            <div className="ticker-year-group">
              <button
                className={`ticker-year-btn ${yearFilter === 'all' ? 'active' : ''}`}
                onClick={() => onYearChange('all')}
              >
                All
              </button>
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  className={`ticker-year-btn ${yearFilter === yr ? 'active' : ''}`}
                  onClick={() => onYearChange(yr)}
                >
                  {yr}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            {onViewModeChange && (
              <div className="ticker-view-group">
                <button
                  className={`ticker-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => onViewModeChange('grid')}
                  title="Grid View"
                >
                  🗂️
                </button>
                <button
                  className={`ticker-view-btn ${viewMode === 'timeline' ? 'active' : ''}`}
                  onClick={() => onViewModeChange('timeline')}
                  title="Timeline View"
                >
                  📅
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Main Filter Bar (Media Types + Status + Venue) ── */}
      <section className="main-filter-bar">
        <div className="filter-controls-row">
          {/* Media Type Tabs */}
          <div className="type-segmented-control">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                className={`type-segment-btn ${typeFilter === f.value ? 'active' : ''}`}
                onClick={() => onTypeChange(f.value)}
              >
                <span>{f.label}</span>
                {counts && counts[f.value] !== undefined && (
                  <span className="type-count-pill">{counts[f.value]}</span>
                )}
              </button>
            ))}
          </div>

          {/* Right Filters: Theatres + Status */}
          <div className="filter-secondary-controls">
            {/* Theatres Toggle */}
            <button
              className={`theatre-filter-btn ${theatreOnly ? 'active' : ''}`}
              onClick={onTheatreToggle}
              title="Movies watched in Theatres / Cinemas"
            >
              <span className="theatre-icon">🎭</span>
              <span>Theatres</span>
              {theatreCount > 0 && <span className="theatre-badge">{theatreCount}</span>}
            </button>

            {/* Status Select */}
            <select
              className="status-dropdown"
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Quick Genre Pills Row ── */}
        {onGenreChange && (
          <div className="genre-pills-row">
            {GENRE_PILLS.map((genre) => (
              <button
                key={genre}
                className={`genre-pill-btn ${genreFilter === genre ? 'active' : ''}`}
                onClick={() => onGenreChange(genre)}
              >
                {genre}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default FilterBar;
