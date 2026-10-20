import React, { useState, useEffect } from 'react';
import './MediaCard.css';

const TYPE_META = {
  movie: { icon: '🎬', label: 'Movie', color: '#c0c1ff' },
  show: { icon: '📺', label: 'Series', color: '#d0bcff' },
  game: { icon: '🎮', label: 'Game', color: '#4edea3' },
};

const STATUS_META = {
  plan_to_watch: { label: 'Plan to Watch', className: 'status-planned', dotColor: '#06b6d4' },
  in_progress: { label: 'In Progress', className: 'status-progress', dotColor: '#f59e0b' },
  completed: { label: 'Completed', className: 'status-completed', dotColor: '#4edea3' },
  rewatch: { label: 'Rewatch', className: 'status-rewatch', dotColor: '#d0bcff' },
  dropped: { label: 'Dropped', className: 'status-dropped', dotColor: '#ffb4ab' },
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

function MediaCard({ item, onEdit, onDelete, onLogSession, onPickCover }) {
  const typeMeta = TYPE_META[item.type] || { icon: '📦', label: item.type, color: '#c0c1ff' };
  const statusMeta = STATUS_META[item.status] || { label: item.status, className: '', dotColor: '#908fa0' };

  // Gaming active session timer state
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
      {/* 2:3 Cinematic Poster Container */}
      <div className="card-poster-wrapper">
        {item.poster ? (
          <img
            src={item.poster}
            alt={item.title}
            className="card-poster-img"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="card-poster-placeholder">
            <span className="placeholder-icon">{typeMeta.icon}</span>
          </div>
        )}

        {/* Gradient Scrim Overlay */}
        <div className="card-poster-scrim" />

        {/* Top-Left: Type Badge */}
        <div className="card-top-left-badges">
          <span className="card-glass-badge type-badge">
            <span className="badge-icon">{typeMeta.icon}</span> {typeMeta.label}
          </span>
          {item.venue === 'theatre' && (
            <span className="card-glass-badge theatre-badge" title="Watched in Theatre">
              🎭 Theatre
            </span>
          )}
        </div>

        {/* Top-Right: Rating Star */}
        {item.rating > 0 && (
          <div className="card-top-right-badges">
            <span className="card-glass-badge rating-badge">
              ⭐ {item.rating}
            </span>
          </div>
        )}

        {/* Hover Quick Actions Bar */}
        <div className="card-hover-actions">
          <button
            className="card-quick-btn"
            onClick={(e) => {
              e.stopPropagation();
              onPickCover && onPickCover(item);
            }}
            title="Choose / Change Cover Picture"
          >
            🖼️
          </button>
          <button
            className="card-quick-btn"
            onClick={(e) => {
              e.stopPropagation();
              onEdit && onEdit(item);
            }}
            title="Edit Details"
          >
            ✏️
          </button>
          <button
            className="card-quick-btn delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete && onDelete(item);
            }}
            title="Delete from Vault"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Card Info Footer */}
      <div className="card-info" onClick={() => onEdit && onEdit(item)}>
        <div className="card-header-info">
          <h4 className="card-title" title={item.title}>
            {item.title}
          </h4>
          {(item.progress || item.notes) && (
            <span className="card-subtitle" title={item.progress || item.notes}>
              {item.progress || item.notes}
            </span>
          )}
        </div>

        {/* Status Beacon Row */}
        <div className="card-status-row">
          <span className={`status-beacon ${statusMeta.className}`}>
            <span
              className="status-dot"
              style={{ backgroundColor: statusMeta.dotColor }}
            />
            {statusMeta.label}
          </span>
          {formattedDate && <span className="card-date">{formattedDate}</span>}
        </div>

        {/* Specialized Mobile Gaming Playtime */}
        {item.type === 'game' && (
          <div className="card-game-section" onClick={(e) => e.stopPropagation()}>
            <div className="game-time-row">
              <span className="game-label">Playtime:</span>
              <strong className="game-value">{hoursPlayed} hrs</strong>
            </div>

            {targetHours > 0 && (
              <div className="game-progress-track">
                <div
                  className="game-progress-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}

            <div className="game-quick-controls">
              {timerActive ? (
                <button className="btn-timer-stop" onClick={handleStopSession}>
                  ⏹️ Stop ({formatTimer(sessionSeconds)})
                </button>
              ) : (
                <>
                  <button
                    className="btn-timer-start"
                    onClick={() => setTimerActive(true)}
                  >
                    ▶️ Session
                  </button>
                  <button
                    className="btn-quick-add"
                    title="+30 mins"
                    onClick={() => {
                      const newTotal = Number((hoursPlayed + 0.5).toFixed(2));
                      if (onLogSession) onLogSession(item.id, newTotal);
                    }}
                  >
                    +30m
                  </button>
                  <button
                    className="btn-quick-add"
                    title="+1 hour"
                    onClick={() => {
                      const newTotal = Number((hoursPlayed + 1.0).toFixed(2));
                      if (onLogSession) onLogSession(item.id, newTotal);
                    }}
                  >
                    +1h
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Review snippet if present */}
        {item.review && (
          <p className="card-review-snippet" title={item.review}>
            "{item.review}"
          </p>
        )}
      </div>
    </div>
  );
}

export default MediaCard;
