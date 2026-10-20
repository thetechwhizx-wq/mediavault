import React from 'react';
import './FilterBar.css';

const TYPE_FILTERS = [
  { value: 'all', label: 'All', icon: '📚' },
  { value: 'movie', label: 'Movies', icon: '🎬' },
  { value: 'show', label: 'Shows', icon: '📺' },
  { value: 'game', label: 'Games', icon: '🎮' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'plan_to_watch', label: 'Plan to Watch/Play' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'rewatch', label: '🔄 Rewatch' },
  { value: 'dropped', label: 'Dropped' },
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
}) {
  return (
    <div className="filter-container">
      {/* Primary Type Tabs */}
      <div className="filter-bar-primary">
        <div className="type-tabs">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`type-tab ${typeFilter === f.value ? 'active' : ''}`}
              onClick={() => onTypeChange(f.value)}
            >
              <span className="tab-icon">{f.icon}</span>
              <span className="tab-label">{f.label}</span>
              {counts && counts[f.value] !== undefined && (
                <span className="tab-count">{counts[f.value]}</span>
              )}
            </button>
          ))}
        </div>

        {/* View Mode Toggle: Grid vs Timeline */}
        {onViewModeChange && (
          <div className="view-mode-toggle">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => onViewModeChange('grid')}
              title="Grid View"
            >
              <span>🗂️</span> Grid
            </button>
            <button
              className={`view-btn ${viewMode === 'timeline' ? 'active' : ''}`}
              onClick={() => onViewModeChange('timeline')}
              title="Timeline (Month by Month) View"
            >
              <span>📅</span> Timeline
            </button>
          </div>
        )}
      </div>

      {/* Secondary Bar: Year Filter, Theatre Toggle, Status Dropdown */}
      <div className="filter-bar-secondary">
        {/* Year Pills */}
        <div className="year-pills">
          <span className="filter-label">Year:</span>
          <button
            className={`year-pill ${yearFilter === 'all' ? 'active' : ''}`}
            onClick={() => onYearChange('all')}
          >
            All
          </button>
          {availableYears.map((yr) => (
            <button
              key={yr}
              className={`year-pill ${yearFilter === yr ? 'active' : ''}`}
              onClick={() => onYearChange(yr)}
            >
              {yr}
            </button>
          ))}
        </div>

        {/* Quick Venue & Status Controls */}
        <div className="secondary-right">
          {/* Theatre Toggle */}
          <button
            className={`theatre-filter-btn ${theatreOnly ? 'active' : ''}`}
            onClick={onTheatreToggle}
            title="Filter movies watched in theatres/cinemas"
          >
            <span className="theatre-icon">🎭</span>
            <span>Theatres</span>
            {theatreCount > 0 && <span className="theatre-count">{theatreCount}</span>}
          </button>

          {/* Status Dropdown */}
          <select
            className="status-filter"
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
    </div>
  );
}

export default FilterBar;
