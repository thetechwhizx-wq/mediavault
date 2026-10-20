import React, { useMemo } from 'react';
import MediaCard from './MediaCard';
import EmptyState from './EmptyState';
import './MediaList.css';

const MONTH_NAMES = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function getGroupKeyAndLabel(watchedDate) {
  if (!watchedDate || typeof watchedDate !== 'string') {
    return { key: '0000-00', label: 'Undated / Library Backlog' };
  }
  const match = watchedDate.match(/^(\d{4})-(\d{2})/);
  if (match) {
    const year = match[1];
    const monthNum = parseInt(match[2], 10);
    const monthName = MONTH_NAMES[monthNum] || match[2];
    return {
      key: `${year}-${match[2]}`,
      label: `${monthName} ${year}`,
    };
  }
  const yearOnly = watchedDate.match(/^(\d{4})/);
  if (yearOnly) {
    return {
      key: `${yearOnly[1]}-00`,
      label: `Year ${yearOnly[1]} (Undated Month)`,
    };
  }
  return { key: '0000-00', label: 'Undated / Library Backlog' };
}

function MediaList({
  items,
  onEdit,
  onDelete,
  onLogSession,
  onPickCover,
  viewMode = 'grid',
}) {
  const timelineGroups = useMemo(() => {
    if (viewMode !== 'timeline' || !items) return [];

    const map = new Map();
    items.forEach((item) => {
      const { key, label } = getGroupKeyAndLabel(item.watchedDate);
      if (!map.has(key)) {
        map.set(key, { key, label, items: [] });
      }
      map.get(key).items.push(item);
    });

    // Sort groups descending: newest months first, undated at bottom
    return Array.from(map.values()).sort((a, b) => {
      if (a.key === '0000-00') return 1;
      if (b.key === '0000-00') return -1;
      return b.key.localeCompare(a.key);
    });
  }, [items, viewMode]);

  if (!items || items.length === 0) {
    return <EmptyState />;
  }

  // ── Grid View ──
  if (viewMode === 'grid') {
    return (
      <div className="media-grid">
        {items.map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            onEdit={onEdit}
            onDelete={onDelete}
            onLogSession={onLogSession}
            onPickCover={onPickCover}
          />
        ))}
      </div>
    );
  }

  // ── Timeline View (Grouped by Month) ──
  return (
    <div className="timeline-container">
      {timelineGroups.map((group) => {
        const theatreCount = group.items.filter(
          (m) =>
            m.venue === 'theatre' ||
            (m.notes && /theatre|theater|cinema|imax/i.test(m.notes))
        ).length;

        const rewatchCount = group.items.filter(
          (m) => m.status === 'rewatch' || (m.notes && /rewatch/i.test(m.notes))
        ).length;

        return (
          <section key={group.key} className="timeline-group">
            <div className="timeline-header">
              <div className="timeline-title-area">
                <span className="timeline-pin">📅</span>
                <h3 className="timeline-month-title">{group.label}</h3>
              </div>
              <div className="timeline-badges">
                <span className="timeline-count-badge">
                  {group.items.length} {group.items.length === 1 ? 'title' : 'titles'}
                </span>
                {theatreCount > 0 && (
                  <span className="timeline-theatre-badge" title="Watched in theatre">
                    🎭 {theatreCount} theatre
                  </span>
                )}
                {rewatchCount > 0 && (
                  <span className="timeline-rewatch-badge" title="Rewatched">
                    🔄 {rewatchCount} rewatch
                  </span>
                )}
              </div>
            </div>

            <div className="media-grid">
              {group.items.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onLogSession={onLogSession}
                  onPickCover={onPickCover}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default MediaList;
