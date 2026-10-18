import React from 'react';
import MediaCard from './MediaCard';
import EmptyState from './EmptyState';
import './MediaList.css';

function MediaList({ items, onEdit, onDelete, onLogSession }) {
  if (!items || items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="media-grid">
      {items.map((item) => (
        <MediaCard
          key={item.id}
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
          onLogSession={onLogSession}
        />
      ))}
    </div>
  );
}

export default MediaList;
