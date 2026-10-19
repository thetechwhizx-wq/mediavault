import React, { useState, useEffect, useCallback } from 'react';
import { fetchCoverCandidates } from '../api';
import './CoverPickerModal.css';

function CoverPickerModal({ item, onSelect, onClose }) {
  // Strip "s2", "season 3", etc. for initial search title
  const cleanTitle = (item.title || '')
    .replace(/\b(?:s\d+|season\s*\d+|part\s*\d+)\b/gi, '')
    .trim();

  const [title, setTitle] = useState(cleanTitle || item.title || '');
  const [type, setType] = useState(item.type || 'movie');
  const [year, setYear] = useState(
    item.watchedDate ? item.watchedDate.slice(0, 4) : ''
  );
  const [cast, setCast] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'custom'

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchCovers = useCallback(async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const results = await fetchCoverCandidates(title.trim(), type, year.trim(), cast.trim());
      setCandidates(results || []);
      if (!results || results.length === 0) {
        setError('No cover pictures found for this search. Try adding or changing the actor/year hint or paste a direct image URL.');
      }
    } catch (err) {
      console.error(err);
      setError('Search failed. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [title, type, year, cast]);

  // Initial search on mount
  useEffect(() => {
    searchCovers();
  }, [searchCovers]);

  const handlePickCandidate = (posterUrl) => {
    onSelect(posterUrl);
    onClose();
  };

  const handleApplyCustomUrl = (e) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    onSelect(customUrl.trim());
    onClose();
  };

  return (
    <div className="modal-overlay cover-picker-overlay" onClick={onClose}>
      <div className="modal cover-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="cover-picker-title">
            <h2>🖼️ Choose Cover Picture</h2>
            <span className="cover-picker-subtitle">
              Finding exact match for: <strong>{item.title}</strong>
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Tab switch: Search Gallery vs Custom Link */}
        <div className="cover-picker-tabs">
          <button
            type="button"
            className={`cover-tab ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            🔍 Search & Suggestions
          </button>
          <button
            type="button"
            className={`cover-tab ${activeTab === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            🔗 Paste Image Link
          </button>
        </div>

        {activeTab === 'search' ? (
          <div className="cover-picker-body">
            {/* Search Filter Controls */}
            <div className="cover-search-controls">
              <div className="search-field title-field">
                <label>Title</label>
                <input
                  type="text"
                  value={title}
                  placeholder="e.g. Gifted, Amaran, Squid Game"
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchCovers()}
                />
              </div>

              <div className="search-field type-field">
                <label>Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="movie">🎬 Movie</option>
                  <option value="show">📺 Show</option>
                  <option value="game">🎮 Game</option>
                </select>
              </div>

              <div className="search-field year-field">
                <label>Year Hint</label>
                <input
                  type="text"
                  maxLength="4"
                  placeholder="e.g. 2017"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchCovers()}
                />
              </div>

              <div className="search-field cast-field">
                <label>Cast / Actor Hint</label>
                <input
                  type="text"
                  placeholder="e.g. Chris Evans, Sivakarthikeyan"
                  value={cast}
                  onChange={(e) => setCast(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchCovers()}
                />
              </div>

              <button
                type="button"
                className="btn-primary btn-search-covers"
                onClick={searchCovers}
                disabled={loading || !title.trim()}
              >
                {loading ? 'Searching...' : '🔍 Search'}
              </button>
            </div>

            {/* Candidates Results Gallery */}
            <div className="cover-candidates-container">
              {loading && (
                <div className="candidates-loading">
                  <div className="spinner" />
                  <p>Searching movie & show databases...</p>
                </div>
              )}

              {error && !loading && (
                <div className="candidates-error">
                  <p>{error}</p>
                </div>
              )}

              {!loading && candidates.length > 0 && (
                <div className="candidates-grid">
                  {candidates.map((cand, idx) => (
                    <div
                      key={idx}
                      className="candidate-card"
                      onClick={() => handlePickCandidate(cand.poster)}
                      title="Click to apply this cover"
                    >
                      <div className="candidate-poster-wrap">
                        <img src={cand.poster} alt={cand.title} loading="lazy" />
                        <span className="candidate-source-tag">{cand.source}</span>
                      </div>
                      <div className="candidate-details">
                        <strong className="candidate-title">{cand.title}</strong>
                        <span className="candidate-meta">
                          {cand.year ? `${cand.year} • ` : ''}
                          {cand.type === 'show' ? '📺 TV' : cand.type === 'game' ? '🎮 Game' : '🎬 Movie'}
                        </span>
                      </div>
                      <button type="button" className="btn-select-candidate">
                        ✓ Select This Cover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <form className="cover-custom-url-form" onSubmit={handleApplyCustomUrl}>
            <p className="custom-url-tip">
              Found an image on Google Images, IMDb, or Reddit? Copy its image address and paste it here:
            </p>
            <div className="form-group">
              <label htmlFor="custom-cover-url">Image Address (URL)</label>
              <input
                id="custom-cover-url"
                type="url"
                placeholder="https://example.com/poster.jpg"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                autoFocus
              />
            </div>

            {customUrl && (
              <div className="custom-preview-box">
                <img src={customUrl} alt="Custom URL Preview" onError={(e) => (e.target.style.display = 'none')} />
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={!customUrl.trim()}>
                Apply Cover
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default CoverPickerModal;
