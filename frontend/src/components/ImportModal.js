import React, { useState, useMemo } from 'react';
import { parseNotes } from '../utils/parseNotes';
import './ImportModal.css';

function ImportModal({ onImport, onClose }) {
  const [rawText, setRawText] = useState('');
  const [step, setStep] = useState('paste'); // 'paste' | 'preview'
  const [entries, setEntries] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  const parsed = useMemo(() => {
    if (!rawText.trim()) return [];
    return parseNotes(rawText);
  }, [rawText]);

  const handleProceedToPreview = () => {
    if (parsed.length === 0) return;
    setEntries(parsed.map((item, idx) => ({ ...item, _id: idx })));
    setStep('preview');
  };

  const toggleInclude = (id) => {
    setEntries((prev) =>
      prev.map((e) => (e._id === id ? { ...e, include: !e.include } : e))
    );
  };

  const toggleSelectAll = (select) => {
    setEntries((prev) => prev.map((e) => ({ ...e, include: select })));
  };

  const updateEntryField = (id, field, value) => {
    setEntries((prev) =>
      prev.map((e) => (e._id === id ? { ...e, [field]: value } : e))
    );
  };

  const selectedEntries = entries.filter((e) => e.include);

  const handleStartImport = async () => {
    if (selectedEntries.length === 0) return;
    setImporting(true);
    setImportProgress({ current: 0, total: selectedEntries.length });

    try {
      await onImport(selectedEntries, (current, total) => {
        setImportProgress({ current, total });
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Import encountered an error: ' + (err.message || 'Unknown error'));
      setImporting(false);
    }
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '—';
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
  };

  return (
    <div className="modal-overlay import-overlay" onClick={onClose}>
      <div className="modal import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="import-modal-title">
            <h2>{step === 'paste' ? '📋 Import from Notes' : `Review Entries (${selectedEntries.length} selected)`}</h2>
            <span className="import-modal-subtitle">
              {step === 'paste' ? 'Paste your copied mobile notes list' : 'Review & tweak before adding to your vault'}
            </span>
          </div>
          <button className="modal-close" onClick={onClose} disabled={importing}>✕</button>
        </div>

        {step === 'paste' ? (
          <div className="import-step-paste">
            <p className="import-tip">
              💡 <strong>Tip:</strong> Section headers like <code>Movies 2025</code> or <code>SHOWS/SERIES/ANIME(2025)</code> automatically set the category and year. Dates in parentheses like <code>(13/02)</code> and <code>(theatre)</code> are auto-detected!
            </p>
            <textarea
              className="import-textarea"
              placeholder={`Movies 2025\n1. The wild robot\n2. Lucky Bhaskar\n7. Gifted(13/02)\n22. Retro(01/05) (theatre)\n\nSHOWS/SERIES/ANIME(2025)\n1. Squid games S2\n5. Daredevil season1(15/mar)`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              autoFocus
            />

            <div className="import-paste-footer">
              <div className="import-stats">
                {parsed.length > 0 ? (
                  <span className="stats-badge success">
                    ✨ {parsed.length} entries parsed ({parsed.filter(p => p.type === 'movie').length} movies, {parsed.filter(p => p.type === 'show').length} shows, {parsed.filter(p => p.type === 'game').length} games)
                  </span>
                ) : (
                  <span className="stats-badge neutral">
                    Ready to parse notes
                  </span>
                )}
              </div>

              <div className="import-actions">
                <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={parsed.length === 0}
                  onClick={handleProceedToPreview}
                >
                  Preview {parsed.length > 0 ? `(${parsed.length})` : ''} →
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="import-step-preview">
            <div className="preview-toolbar">
              <button
                type="button"
                className="btn-secondary btn-small"
                onClick={() => setStep('paste')}
                disabled={importing}
              >
                ← Back to Edit Notes
              </button>

              <div className="preview-selection-toggles">
                <button
                  type="button"
                  className="btn-text-link"
                  onClick={() => toggleSelectAll(true)}
                  disabled={importing}
                >
                  Select All
                </button>
                <span className="separator">•</span>
                <button
                  type="button"
                  className="btn-text-link"
                  onClick={() => toggleSelectAll(false)}
                  disabled={importing}
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="preview-table-container">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th className="col-chk"></th>
                    <th>Title</th>
                    <th className="col-type">Type</th>
                    <th className="col-date">Watch Date</th>
                    <th className="col-venue">Venue</th>
                    <th className="col-status">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry._id} className={!entry.include ? 'row-excluded' : ''}>
                      <td className="col-chk">
                        <input
                          type="checkbox"
                          checked={entry.include}
                          onChange={() => toggleInclude(entry._id)}
                          disabled={importing}
                        />
                      </td>
                      <td className="col-title">
                        <input
                          type="text"
                          className="table-input title-input"
                          value={entry.title}
                          onChange={(e) => updateEntryField(entry._id, 'title', e.target.value)}
                          disabled={importing}
                        />
                      </td>
                      <td className="col-type">
                        <select
                          className="table-select"
                          value={entry.type}
                          onChange={(e) => updateEntryField(entry._id, 'type', e.target.value)}
                          disabled={importing}
                        >
                          <option value="movie">🎬 Movie</option>
                          <option value="show">📺 Show</option>
                          <option value="game">🎮 Game</option>
                        </select>
                      </td>
                      <td className="col-date">
                        <span className="date-badge" title={entry.watchedDate}>
                          {formatDateDisplay(entry.watchedDate)}
                        </span>
                      </td>
                      <td className="col-venue">
                        <button
                          type="button"
                          className={`venue-toggle-btn ${entry.venue === 'theatre' ? 'active-theatre' : ''}`}
                          onClick={() =>
                            updateEntryField(
                              entry._id,
                              'venue',
                              entry.venue === 'theatre' ? '' : 'theatre'
                            )
                          }
                          disabled={importing}
                          title={entry.venue === 'theatre' ? 'Watched in Theatre' : 'Not marked as Theatre'}
                        >
                          {entry.venue === 'theatre' ? '🎭 Theatre' : '🏠 Home'}
                        </button>
                      </td>
                      <td className="col-status">
                        <select
                          className="table-select status-select"
                          value={entry.status}
                          onChange={(e) => updateEntryField(entry._id, 'status', e.target.value)}
                          disabled={importing}
                        >
                          <option value="completed">Completed</option>
                          <option value="in_progress">In Progress</option>
                          <option value="plan_to_watch">Plan</option>
                          <option value="dropped">Dropped</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="import-preview-footer">
              {importing ? (
                <div className="import-progress-status">
                  <div className="progress-info">
                    <span>
                      ⏳ Importing & fetching covers ({importProgress.current} / {importProgress.total})...
                    </span>
                    <span>
                      {importProgress.total > 0
                        ? `${Math.round((importProgress.current / importProgress.total) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${
                          importProgress.total > 0
                            ? (importProgress.current / importProgress.total) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="footer-actions-row">
                  <span className="import-summary-text">
                    Adding <strong>{selectedEntries.length}</strong> items to MediaVault with auto-fetched covers.
                  </span>
                  <div className="button-group">
                    <button type="button" className="btn-secondary" onClick={onClose}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={selectedEntries.length === 0}
                      onClick={handleStartImport}
                    >
                      🚀 Import {selectedEntries.length} Items
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImportModal;
