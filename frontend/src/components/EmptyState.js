import React from 'react';
import './EmptyState.css';

function EmptyState({ message, sub }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">🎬</div>
      <h3>{message || 'No media found'}</h3>
      <p>{sub || 'Try adding something or changing your filters.'}</p>
    </div>
  );
}

export default EmptyState;
