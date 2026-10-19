import React, { useState, useEffect, useRef } from 'react';
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
  const [hint, setHint] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'custom'

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Track active request ID to ignore stale responses
  const requestIdRef = useRef(0);

  const performSearch = async (sTitle, sType, sYear, sHint) => {
    const qTitle = (sTitle !== undefined ? sTitle : title).trim();
    if (!qTitle) return;

    const qType = sType !== undefined ? sType : type;
    const qYear = (sYear !== undefined ? sYear : year).trim();
    const qHint = (sHint !== undefined ? sHint : hint).trim();

    const currentReqId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const results = await fetchCoverCandidates(qTitle, qType, qYear, qHint);
      // Only apply if this is still the latest search
      if (currentReqId === requestIdRef.current) {
        setCandidates(results || []);
        if (!results || results.length === 0) {
          setError('No cover pictures found. Try checking title spelling, year, or actor name, or paste a custom link.');
        }
      }
    } catch (err) {
      if (currentReqId === requestIdRef.current) {
        console.error(err);
        setError('Search failed. Please ensure the backend is running.');
      }
    } finally {
      if (currentReqId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  // Run search ONCE when modal opens
  useEffect(() => {
    performSearch(cleanTitle || item.title || '', item.type || 'movie', item.watchedDate ? item.watchedDate.slice(0, 4) : '', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                  onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                />
              </div>

              <div className="search-field type-field">
                <label>Type</label>
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    performSearch(title, e.target.value, year, hint);
                  }}
                >
                  <option value="movie">🎬 Movie</option>
                  <option value="show">📺 Show</option>
                  <option value="game">🎮 Game</option>
                </select>
              </div>

              <div className="search-field year-field">
                <label>Year</label>
                <input
                  type="text"
                  maxLength="4"
                  placeholder="e.g. 2024"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                />
              </div>

              <div className="search-field hint-field">
                <label>Studio / Lead / Keyword</label>
                <input
                  type="text"
                  placeholder="e.g. Marvel, Sivakarthikeyan, A24, HBO"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                />
              </div>

              <button
                type="button"
                className="btn-primary btn-search-covers"
                onClick={() => performSearch()}
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
                  <p>Searching movie, TV & Wikipedia catalogs...</p>
                </div>
              )}

              {error && !loading && (
                <div className="candidates-error">
                  <p>{error}</p>
                </div>
              )}

              {!loading && candidates.length > 0 && (
                <div className="candidates-grid">
                  {candidates.map((cand, idx) => {
                    const yearStr = String(cand.year || '');
                    const cleanYear = yearStr.length > 25
                      ? (yearStr.match(/\b(19\d\d|20\d\d)\b/)?.[0] || yearStr.slice(0, 20) + '...')
                      : yearStr;
                    const sourceClass = (cand.source || '').toLowerCase().replace(/[^a-z]/g, '');

                    return (
                      <div
                        key={idx}
                        className="candidate-card"
                        onClick={() => handlePickCandidate(cand.poster)}
                        title="Click to apply this cover"
                      >
                        <div className="candidate-poster-wrap">
                          <img src={cand.poster} alt={cand.title} loading="lazy" />
                          <span className={`candidate-source-tag source-${sourceClass}`}>
                            {cand.source}
                          </span>
                        </div>
                        <div className="candidate-details">
                          <strong className="candidate-title">{cand.title}</strong>
                          <span className="candidate-meta">
                            {cleanYear ? `${cleanYear} • ` : ''}
                            {cand.type === 'show' ? '📺 TV' : cand.type === 'game' ? '🎮 Game' : '🎬 Movie'}
                          </span>
                        </div>
                        <button type="button" className="btn-select-candidate">
                          ✓ Select This Cover
                        </button>
                      </div>
                    );
                  })}
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
