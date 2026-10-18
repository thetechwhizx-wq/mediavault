import React, { useState } from 'react';
import StarRating from './StarRating';
import { searchMetadata } from '../api';
import './AddMediaForm.css';

function EditMediaModal({ item, onSubmit, onDelete, onClose }) {
  const [title, setTitle] = useState(item.title);
  const [type, setType] = useState(item.type);
  const [status, setStatus] = useState(item.status);
  const [progress, setProgress] = useState(item.progress || '');
  const [poster, setPoster] = useState(item.poster || '');
  const [hoursPlayed, setHoursPlayed] = useState(item.hoursPlayed !== undefined ? item.hoursPlayed : '');
  const [targetHours, setTargetHours] = useState(item.targetHours !== undefined ? item.targetHours : '');
  const [rating, setRating] = useState(item.rating || 0);
  const [review, setReview] = useState(item.review || '');
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleFetchPoster = async () => {
    if (!title.trim()) return;
    try {
      setIsFetchingMeta(true);
      const meta = await searchMetadata(title.trim(), type);
      if (meta && meta.poster) {
        setPoster(meta.poster);
      } else {
        alert('No poster found automatically.');
      }
    } catch (e) {
      alert('Error fetching cover');
    } finally {
      setIsFetchingMeta(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(item.id, {
      title: title.trim(),
      type,
      status,
      progress: progress.trim(),
      poster: poster.trim(),
      hoursPlayed: Number(hoursPlayed) || 0,
      targetHours: Number(targetHours) || 0,
      rating: rating || null,
      review: review.trim(),
    });
  };

  if (showDeleteConfirm) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Delete "{item.title}"?</h2>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <p style={{ color: '#94a3b8', margin: '0 0 1.5rem 0', fontSize: '0.95rem' }}>
              This action cannot be undone. The item will be permanently removed.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn-danger" onClick={() => onDelete(item.id)}>Delete</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Media</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          {poster && (
            <div className="form-poster-preview">
              <img src={poster} alt="Cover preview" />
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
              <label htmlFor="edit-title">Title *</label>
              <button
                type="button"
                className="btn-fetch-inline"
                onClick={handleFetchPoster}
                disabled={!title.trim() || isFetchingMeta}
              >
                {isFetchingMeta ? '⏳ Finding...' : '✨ Refresh Cover'}
              </button>
            </div>
            <input
              id="edit-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-type">Type</label>
              <select id="edit-type" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="game">🎮 Game</option>
                <option value="show">📺 Show</option>
                <option value="movie">🎬 Movie</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="edit-status">Status</label>
              <select id="edit-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="in_progress">In Progress</option>
                <option value="plan_to_watch">Plan to Watch/Play</option>
                <option value="completed">Completed</option>
                <option value="dropped">Dropped</option>
              </select>
            </div>
          </div>

          {type === 'game' ? (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="edit-hours">Hours Played</label>
                <input
                  id="edit-hours"
                  type="number"
                  step="0.1"
                  min="0"
                  value={hoursPlayed}
                  onChange={(e) => setHoursPlayed(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-targetHours">Target Goal (Hrs)</label>
                <input
                  id="edit-targetHours"
                  type="number"
                  step="0.5"
                  min="0"
                  value={targetHours}
                  onChange={(e) => setTargetHours(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="edit-progress">Progress</label>
              <input
                id="edit-progress"
                type="text"
                placeholder="e.g. Episode 5, 47 hours"
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="edit-poster">Poster / Image URL</label>
            <input
              id="edit-poster"
              type="url"
              placeholder="Cover image URL..."
              value={poster}
              onChange={(e) => setPoster(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Rating</label>
            <StarRating rating={rating} onRate={setRating} />
          </div>

          <div className="form-group">
            <label htmlFor="edit-review">Review</label>
            <textarea
              id="edit-review"
              placeholder="Write your thoughts..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-danger"
              onClick={() => setShowDeleteConfirm(true)}
              style={{ marginRight: 'auto' }}
            >
              Delete
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!title.trim()}>Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditMediaModal;
