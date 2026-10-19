import React, { useState, useEffect } from 'react';
import StarRating from './StarRating';
import './MediaCard.css';

const TYPE_META = {
  movie: { icon: '🎬', label: 'Movie' },
  show: { icon: '📺', label: 'Show' },
  game: { icon: '🎮', label: 'Game' },
};

const STATUS_META = {
  plan_to_watch: { label: 'Plan', className: 'status-planned' },
  in_progress: { label: 'In Progress', className: 'status-progress' },
  completed: { label: 'Completed', className: 'status-completed' },
  dropped: { label: 'Dropped', className: 'status-dropped' },
};

function formatWatchDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (parts.length === 3) {
    const day = parseInt(parts[2], 10);
    const m = months[parseInt(parts[1], 10)] || parts[1];
    return `${day} ${m} ${parts[0]}`;
  }
  if (parts.length === 2) {
    const m = months[parseInt(parts[1], 10)] || parts[1];
    return `${m} ${parts[0]}`;
  }
  return dateStr;
}

function MediaCard({ item, onEdit, onDelete, onLogSession }) {
  const typeMeta = TYPE_META[item.type] || { icon: '📦', label: item.type };
  const statusMeta = STATUS_META[item.status] || { label: item.status, className: '' };

  // Mobile Gaming active play session timer state
  const [timerActive, setTimerActive] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);

  useEffect(() => {
    let interval = null;
    if (timerActive) {
      interval = setInterval(() => {
        setSessionSeconds((sec) => sec + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  const handleStopSession = () => {
    setTimerActive(false);
    const addedHours = Number((sessionSeconds / 3600).toFixed(2));
    const currentHours = Number(item.hoursPlayed) || 0;
    const newTotal = Number((currentHours + addedHours).toFixed(2));
    setSessionSeconds(0);
    if (onLogSession) {
      onLogSession(item.id, newTotal);
    }
  };

  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const hoursPlayed = Number(item.hoursPlayed) || 0;
  const targetHours = Number(item.targetHours) || 0;
  const progressPct = targetHours > 0 ? Math.min(100, Math.round((hoursPlayed / targetHours) * 100)) : 0;
  const formattedDate = formatWatchDate(item.watchedDate);

  return (
    <div className={`media-card type-${item.type}`}>
      {/* Poster Image / Cover */}
      {item.poster ? (
        <div className="card-poster-wrapper">
          <img src={item.poster} alt={item.title} className="card-poster-img" loading="lazy" />
          <div className="card-poster-overlay">
            <span className="card-type-badge overlay-badge">
              {typeMeta.icon} {typeMeta.label}
            </span>
            {item.venue === 'theatre' && (
              <span className="card-theatre-badge overlay-theatre" title="Watched in Theatre">
                🎭 Theatre
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="card-header no-poster">
          <span className="card-type-badge">
            {typeMeta.icon} {typeMeta.label}
          </span>
          {item.venue === 'theatre' && (
            <span className="card-theatre-badge" title="Watched in Theatre">
              🎭 Theatre
            </span>
          )}
        </div>
      )}

      <div className="card-body">
        <div className="card-title-row">
          <h3 className="card-title">{item.title}</h3>
          <div className="card-actions">
            <button className="card-btn edit" onClick={() => onEdit(item)} title="Edit">
              ✏️
            </button>
            <button className="card-btn delete" onClick={() => onDelete(item)} title="Delete">
              🗑️
            </button>
          </div>
        </div>

        <div className="card-meta">
          <span className={`card-status ${statusMeta.className}`}>
            {statusMeta.label}
          </span>

          {formattedDate && (
            <span className="card-watch-date" title={`Watched on ${item.watchedDate}`}>
              📅 {formattedDate}
            </span>
          )}

          {item.venue === 'theatre' && !item.poster && (
            <span className="card-theatre-badge">🎭 Theatre</span>
          )}

          {item.progress && (
            <span className="card-progress">{item.progress}</span>
          )}

          {item.notes && item.notes.includes('Rewatch') && (
            <span className="card-rewatch-badge" title="Rewatched">
              🔄 Rewatch
            </span>
          )}

          {item.notes && !item.notes.includes('Rewatch') && (
            <span className="card-notes-badge" title={item.notes}>
              📌 {item.notes}
            </span>
          )}
        </div>

        {/* Specialized Mobile Gaming Hours & Active Session Tracker */}
        {item.type === 'game' && (
          <div className="game-tracker-section">
            <div className="game-hours-display">
              <span className="hours-label">⏱️ Playtime:</span>
              <strong className="hours-value">
                {hoursPlayed} hrs {targetHours > 0 ? `/ ${targetHours} hrs (${progressPct}%)` : ''}
              </strong>
            </div>

            {targetHours > 0 && (
              <div className="hours-progress-bar-bg">
                <div
                  className="hours-progress-bar-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}

            {/* Quick 1-tap mobile session logger */}
            <div className="session-timer-bar">
              {timerActive ? (
                <button className="btn-timer stop" onClick={handleStopSession}>
                  ⏹️ Stop & Save ({formatTimer(sessionSeconds)})
                </button>
              ) : (
                <div className="timer-controls">
                  <button className="btn-timer start" onClick={() => setTimerActive(true)}>
                    ▶️ Play Session
                  </button>
                  <button
                    className="btn-quick-add"
                    title="Quick add 30 mins"
                    onClick={() => {
                      const newTotal = Number((hoursPlayed + 0.5).toFixed(2));
                      if (onLogSession) onLogSession(item.id, newTotal);
                    }}
                  >
                    +30m
                  </button>
                  <button
                    className="btn-quick-add"
                    title="Quick add 1 hour"
                    onClick={() => {
                      const newTotal = Number((hoursPlayed + 1.0).toFixed(2));
                      if (onLogSession) onLogSession(item.id, newTotal);
                    }}
                  >
                    +1h
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {item.rating && (
          <div className="card-rating">
            <StarRating rating={item.rating} readonly />
          </div>
        )}

        {item.review && (
          <p className="card-review">{item.review}</p>
        )}
      </div>
    </div>
  );
}

export default MediaCard;
