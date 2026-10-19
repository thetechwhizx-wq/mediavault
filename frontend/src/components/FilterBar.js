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

function FilterBar({ typeFilter, statusFilter, onTypeChange, onStatusChange, counts }) {
  return (
    <div className="filter-bar">
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
      <select
        className="status-filter"
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}

export default FilterBar;
