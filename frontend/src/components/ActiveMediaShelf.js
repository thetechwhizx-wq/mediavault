import React from 'react';
import './ActiveMediaShelf.css';

function ActiveMediaShelf({ inProgressItems = [], onEdit, onLogSession }) {
  if (!inProgressItems || inProgressItems.length === 0) {
    return null;
  }

  return (
    <section className="active-shelf-section">
      <div className="active-shelf-header">
        <div className="active-shelf-title-wrap">
          <span className="active-shelf-beacon" />
          <h2 className="active-shelf-title">Currently In Progress</h2>
          <span className="active-shelf-count-tag">
            {inProgressItems.length} {inProgressItems.length === 1 ? 'Active' : 'Active'}
          </span>
        </div>
      </div>

      <div className="active-shelf-grid">
        {inProgressItems.map((item) => {
          const hoursPlayed = Number(item.hoursPlayed) || 0;
          const targetHours = Number(item.targetHours) || 0;
          const progressPct =
            targetHours > 0
              ? Math.min(100, Math.round((hoursPlayed / targetHours) * 100))
              : item.progress && item.progress.includes('%')
              ? parseInt(item.progress, 10)
              : 50;

          return (
            <div
              key={item.id}
              className="active-hero-card"
              onClick={() => onEdit && onEdit(item)}
            >
              <div className="active-card-top">
                {/* Poster */}
                <div className="active-poster-wrap">
                  {item.poster ? (
                    <img
                      src={item.poster}
                      alt={item.title}
                      className="active-poster-img"
                      onError={(e) => (e.target.style.display = 'none')}
                    />
                  ) : (
                    <div className="active-poster-ph">
                      {item.type === 'game' ? '🎮' : item.type === 'show' ? '📺' : '🎬'}
                    </div>
                  )}
                  <span className="active-type-pill">
                    {item.type === 'game' ? 'GAME' : item.type === 'show' ? 'SHOW' : 'MOVIE'}
                  </span>
                </div>

                {/* Details */}
                <div className="active-details">
                  <div className="active-status-row">
                    <span className="active-status-badge">
                      <span className="active-dot" />
                      In Progress
                    </span>
                    {item.rating > 0 && (
                      <span className="active-rating">⭐ {item.rating}</span>
                    )}
                  </div>

                  <h3 className="active-card-title">{item.title}</h3>

                  <p className="active-card-subtitle">
                    {item.progress || item.notes || (item.venue ? `At ${item.venue}` : 'Active session')}
                  </p>
                </div>
              </div>

              {/* Progress & Quick Controls */}
              <div
                className="active-card-bottom"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="active-progress-info">
                  <span className="progress-label">
                    {item.type === 'game'
                      ? `${hoursPlayed}h played ${targetHours > 0 ? `/ ${targetHours}h` : ''}`
                      : item.progress || 'In Progress'}
                  </span>
                  <span className="progress-percent">{progressPct}%</span>
                </div>

                <div className="active-progress-track">
                  <div
                    className="active-progress-fill"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                {/* Quick actions row */}
                <div className="active-quick-actions">
                  {item.type === 'game' ? (
                    <div className="game-quick-pills">
                      <button
                        className="btn-quick-log"
                        onClick={() => {
                          const newTotal = Number((hoursPlayed + 0.5).toFixed(2));
                          if (onLogSession) onLogSession(item.id, newTotal);
                        }}
                      >
                        +30m
                      </button>
                      <button
                        className="btn-quick-log"
                        onClick={() => {
                          const newTotal = Number((hoursPlayed + 1.0).toFixed(2));
                          if (onLogSession) onLogSession(item.id, newTotal);
                        }}
                      >
                        +1h
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn-resume-action"
                      onClick={() => onEdit && onEdit(item)}
                    >
                      <span>▶️</span> Update Progress
                    </button>
                  )}
                  <span className="active-venue-tag">
                    {item.venue === 'theatre' ? '🎭 Cinema' : item.importedFrom === 'bulk_import' ? 'Vault' : ''}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default ActiveMediaShelf;
