import React, { useState } from 'react';
import { searchMetadata } from '../api';
import './AddMediaForm.css';

function AddMediaForm({ onSubmit, onClose, defaultType = 'movie' }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState(defaultType);
  const [status, setStatus] = useState('completed');
  const [progress, setProgress] = useState('');
  const [poster, setPoster] = useState('');
  const [watchedDate, setWatchedDate] = useState('');
  const [venue, setVenue] = useState('');
  const [hoursPlayed, setHoursPlayed] = useState('');
  const [targetHours, setTargetHours] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');
  const [platform, setPlatform] = useState('');
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);

  // Auto-fetch poster preview when user pauses typing title
  const handleTitleBlur = async () => {
    if (!title.trim() || poster) return;
    try {
      setIsFetchingMeta(true);
      const meta = await searchMetadata(title.trim(), type);
      if (meta && meta.poster) {
        setPoster(meta.poster);
      }
    } catch (e) {
      // Non-blocking
    } finally {
      setIsFetchingMeta(false);
    }
  };

  const handleManualFetch = async () => {
    if (!title.trim()) return;
    try {
      setIsFetchingMeta(true);
      const meta = await searchMetadata(title.trim(), type);
      if (meta && meta.poster) {
        setPoster(meta.poster);
      } else {
        alert('No poster found automatically. You can paste an image URL directly.');
      }
    } catch (e) {
      alert('Error searching for poster');
    } finally {
      setIsFetchingMeta(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      type,
      status,
      progress: progress.trim(),
      poster: poster.trim(),
      watchedDate: watchedDate.trim(),
      venue,
      hoursPlayed: Number(hoursPlayed) || 0,
      targetHours: Number(targetHours) || 0,
      rating: rating > 0 ? rating : null,
      review: review.trim(),
      platform: platform.trim(),
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{type === 'game' ? '🎮 Add Game to Vault' : '🎬 Add New Media'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          {/* Poster Preview if available */}
          {poster && (
            <div className="form-poster-preview">
              <img src={poster} alt="Poster preview" />
              <button
                type="button"
                className="btn-remove-poster"
                onClick={() => setPoster('')}
              >
                ✕ Remove Cover
              </button>
            </div>
          )}

          <div className="form-group">
            <div className="label-with-action">
              <label htmlFor="title">Title *</label>
              <button
                type="button"
                className="btn-fetch-inline"
                onClick={handleManualFetch}
                disabled={!title.trim() || isFetchingMeta}
              >
                {isFetchingMeta ? '⏳ Finding Cover...' : '✨ Auto-Find Cover'}
              </button>
            </div>
            <input
              id="title"
              type="text"
              placeholder={type === 'game' ? 'e.g. Red Dead Redemption, Delta Force' : 'e.g. Gladiator 2, Daredevil'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="type">Type</label>
              <select
                id="type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setPoster('');
                }}
              >
                <option value="movie">🎬 Movie</option>
                <option value="show">📺 Show</option>
                <option value="game">🎮 Game</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress / Playing</option>
                <option value="rewatch">🔄 Rewatch / Replay</option>
                <option value="plan_to_watch">Plan to Watch / Backlog</option>
                <option value="dropped">Dropped</option>
              </select>
            </div>
          </div>

          {/* Date & Venue Row */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="watchedDate">
                {type === 'game' ? 'Date Started / Played' : 'Date Watched'}
              </label>
              <input
                id="watchedDate"
                type="date"
                value={watchedDate}
                onChange={(e) => setWatchedDate(e.target.value)}
              />
            </div>
            {type !== 'game' ? (
              <div className="form-group">
                <label htmlFor="venue">Venue</label>
                <select id="venue" value={venue} onChange={(e) => setVenue(e.target.value)}>
                  <option value="">Default (Home / Device)</option>
                  <option value="theatre">🎭 Theatre / Cinema</option>
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label htmlFor="platform">Platform</label>
                <input
                  id="platform"
                  type="text"
                  placeholder="e.g. PC, Mobile, PS5, Switch"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Specific Gaming Hour tracking inputs */}
          {type === 'game' ? (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="hours">Hours Played</label>
                <input
                  id="hours"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="e.g. 15.5"
                  value={hoursPlayed}
                  onChange={(e) => setHoursPlayed(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="targetHours">Goal / Target Hrs</label>
                <input
                  id="targetHours"
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="e.g. 60"
                  value={targetHours}
                  onChange={(e) => setTargetHours(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="progress">Progress</label>
              <input
                id="progress"
                type="text"
                placeholder="e.g. Season 2, Episode 8"
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
              />
            </div>
          )}

          {/* Rating (1-5 Interactive Stars) */}
          <div className="form-group">
            <div className="label-with-action">
              <label>Your Rating</label>
              {rating > 0 && (
                <button
                  type="button"
                  className="btn-clear-rating"
                  onClick={() => setRating(0)}
                >
                  Clear ({rating}.0 ★)
                </button>
              )}
            </div>
            <div className="star-rating-form-group">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star-form-btn ${(hoverRating || rating) >= star ? 'active' : ''}`}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(rating === star ? 0 : star)}
                >
                  ★
                </button>
              ))}
              <span className="star-rating-desc">
                {rating === 5 && 'Masterpiece 🏆'}
                {rating === 4 && 'Great & Recommended ⭐'}
                {rating === 3 && 'Solid / Enjoyable 👍'}
                {rating === 2 && 'Mediocre / Flawed 😐'}
                {rating === 1 && 'Disappointing ❌'}
                {rating === 0 && 'Unrated'}
              </span>
            </div>
          </div>

          {/* Review / Personal Thoughts */}
          <div className="form-group">
            <label htmlFor="review">Review / Personal Thoughts</label>
            <textarea
              id="review"
              rows="3"
              className="form-textarea"
              placeholder="e.g. Loved it, peak pacing and audio. Main story was incredible..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="poster">Cover / Poster Image URL (Optional)</label>
            <input
              id="poster"
              type="url"
              placeholder="Auto-detected or paste custom URL..."
              value={poster}
              onChange={(e) => setPoster(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!title.trim()}>
              {isFetchingMeta ? 'Saving...' : 'Add to Vault'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddMediaForm;
