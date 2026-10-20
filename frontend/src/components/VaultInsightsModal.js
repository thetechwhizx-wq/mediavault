import React, { useState, useEffect } from 'react';
import { fetchStats } from '../api';
import './VaultInsightsModal.css';

function VaultInsightsModal({ initialYear = 'all', availableYears = [], onClose }) {
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchStats(selectedYear);
        if (isCurrent) {
          setStats(data);
        }
      } catch (err) {
        if (isCurrent) {
          setError('Failed to calculate analytics.');
          console.error(err);
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    }
    load();
    return () => {
      isCurrent = false;
    };
  }, [selectedYear]);

  // Max total for relative bar chart scaling
  const maxMonthlyCount = stats?.monthlyData
    ? Math.max(...stats.monthlyData.map((m) => m.total), 1)
    : 1;

  // Generate shareable Wrapped text
  const handleCopyWrapped = () => {
    if (!stats) return;
    const yearLabel = selectedYear === 'all' ? 'All-Time' : selectedYear;
    const peakText = stats.peakMonth
      ? `${stats.peakMonth.month} (${stats.peakMonth.total} titles)`
      : 'N/A';

    const text = `🎬 MediaVault ${yearLabel} Wrapped 📊
━━━━━━━━━━━━━━━━━━━━
🏆 Persona: ${stats.persona}
✨ Total Titles: ${stats.total}
🎥 Movies: ${stats.moviesCount} (${stats.theatreCount} in Theatres 🎭)
📺 Series & Shows: ${stats.showsCount}
🎮 Mobile Gaming: ${stats.gaming?.totalHours || 0} hrs
🔥 Peak Month: ${peakText}
🔄 Comfort Rewatches: ${stats.rewatchCount}
━━━━━━━━━━━━━━━━━━━━
Tracked with MediaVault 🚀`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      alert('Copied summary:\n\n' + text);
    }
  };

  return (
    <div className="modal-overlay insights-overlay" onClick={onClose}>
      <div className="modal insights-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="insights-header">
          <div className="insights-title-area">
            <span className="insights-logo">📊</span>
            <div>
              <h2>Vault Insights & Analytics</h2>
              <p className="insights-subtitle">
                Track your viewing habits, peak binge months & big screen moments
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Year Filter Switcher */}
        <div className="insights-year-switcher">
          <span className="year-switcher-label">Period:</span>
          <button
            className={`insights-year-btn ${selectedYear === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedYear('all')}
          >
            All-Time
          </button>
          {availableYears.map((yr) => (
            <button
              key={yr}
              className={`insights-year-btn ${selectedYear === yr ? 'active' : ''}`}
              onClick={() => setSelectedYear(yr)}
            >
              {yr}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="insights-body">
          {loading && (
            <div className="insights-loading">
              <div className="spinner" />
              <p>Calculating vault insights...</p>
            </div>
          )}

          {error && <div className="insights-error">⚠️ {error}</div>}

          {!loading && !error && stats && (
            <>
              {/* Persona Hero Banner */}
              <div className="insights-persona-banner">
                <div className="persona-sparkle">✨</div>
                <div className="persona-info">
                  <span className="persona-tag">Your Entertainment Persona</span>
                  <h3 className="persona-name">{stats.persona}</h3>
                </div>
                <div className="persona-stat">
                  <span className="persona-number">{stats.total}</span>
                  <span className="persona-desc">
                    Titles {selectedYear === 'all' ? 'All-Time' : `in ${selectedYear}`}
                  </span>
                </div>
              </div>

              {/* KPI Cards Grid */}
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-icon movie-icon">🎬</div>
                  <div className="kpi-info">
                    <span className="kpi-value">{stats.moviesCount}</span>
                    <span className="kpi-label">Movies Watched</span>
                    <span className="kpi-sub">
                      {stats.total > 0
                        ? `${Math.round((stats.moviesCount / stats.total) * 100)}% of library`
                        : ''}
                    </span>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon theatre-icon">🎭</div>
                  <div className="kpi-info">
                    <span className="kpi-value">{stats.theatreCount}</span>
                    <span className="kpi-label">Big Screen / Theatres</span>
                    <span className="kpi-sub">
                      {stats.moviesCount > 0
                        ? `${stats.theatrePercentage}% of your films`
                        : '0%'}
                    </span>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon show-icon">📺</div>
                  <div className="kpi-info">
                    <span className="kpi-value">{stats.showsCount}</span>
                    <span className="kpi-label">Series & Anime</span>
                    <span className="kpi-sub">
                      {stats.total > 0
                        ? `${Math.round((stats.showsCount / stats.total) * 100)}% of library`
                        : ''}
                    </span>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon rewatch-icon">🔄</div>
                  <div className="kpi-info">
                    <span className="kpi-value">{stats.rewatchCount}</span>
                    <span className="kpi-label">Comfort Rewatches</span>
                    <span className="kpi-sub">Revisiting favorites</span>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon game-icon">🎮</div>
                  <div className="kpi-info">
                    <span className="kpi-value">{stats.gaming?.totalHours || 0}h</span>
                    <span className="kpi-label">Mobile Gaming</span>
                    <span className="kpi-sub">
                      {stats.gaming?.topGame ? stats.gaming.topGame.title : 'Playtime'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Monthly Activity Bar Chart */}
              <div className="insights-section chart-section">
                <div className="section-title-row">
                  <h3>📅 Monthly Activity</h3>
                  {stats.peakMonth && (
                    <span className="chart-badge peak-badge">
                      🔥 Peak: {stats.peakMonth.month} ({stats.peakMonth.total} titles)
                    </span>
                  )}
                </div>

                <div className="bar-chart-container">
                  <div className="bar-chart">
                    {stats.monthlyData.map((m) => {
                      const heightPercent =
                        m.total > 0 ? Math.max((m.total / maxMonthlyCount) * 100, 8) : 0;
                      const isPeak = stats.peakMonth?.month === m.month && m.total > 0;
                      const isDry =
                        stats.driestMonth?.month === m.month &&
                        m.total > 0 &&
                        stats.peakMonth?.month !== m.month;

                      return (
                        <div key={m.month} className="bar-column">
                          <div className="bar-value">
                            {m.total > 0 ? m.total : ''}
                            {isPeak && <span className="peak-flame">🔥</span>}
                          </div>
                          <div className="bar-track">
                            <div
                              className={`bar-fill ${isPeak ? 'peak-fill' : ''} ${
                                isDry ? 'dry-fill' : ''
                              }`}
                              style={{ height: `${heightPercent}%` }}
                              title={`${m.month}: ${m.total} total (${m.movies} movies, ${m.shows} shows, ${m.theatre} theatre)`}
                            />
                          </div>
                          <span className={`bar-label ${isPeak ? 'peak-label' : ''}`}>
                            {m.month}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Smart Habits & Mood Insights */}
              {stats.insights && stats.insights.length > 0 && (
                <div className="insights-section">
                  <div className="section-title-row">
                    <h3>💡 Habits & Observation Cards</h3>
                  </div>
                  <div className="smart-insights-grid">
                    {stats.insights.map((insight, idx) => (
                      <div key={idx} className={`insight-card card-${insight.type}`}>
                        <span className="insight-icon">{insight.icon}</span>
                        <div className="insight-text">
                          <h4>{insight.title}</h4>
                          <p>{insight.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Theatrical Cinema Reel */}
              {stats.theatreMovies && stats.theatreMovies.length > 0 && (
                <div className="insights-section">
                  <div className="section-title-row">
                    <h3>🎟️ Big Screen Reel ({stats.theatreMovies.length})</h3>
                    <span className="theatre-subtag">Caught at Cinema</span>
                  </div>
                  <div className="theatre-reel">
                    {stats.theatreMovies.map((movie) => (
                      <div key={movie.id} className="theatre-item">
                        <div className="theatre-poster-wrap">
                          {movie.poster ? (
                            <img
                              src={movie.poster}
                              alt={movie.title}
                              className="theatre-poster"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="theatre-placeholder">🎭</div>
                          )}
                          <span className="theatre-ticket">🎟️ Cinema</span>
                        </div>
                        <div className="theatre-title" title={movie.title}>
                          {movie.title}
                        </div>
                        {movie.watchedDate && (
                          <div className="theatre-date">{movie.watchedDate}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Spotify-Wrapped Style Summary Card */}
              <div className="insights-section wrapped-section">
                <div className="wrapped-card">
                  <div className="wrapped-header">
                    <span className="wrapped-pill">
                      MEDIAVAULT {selectedYear === 'all' ? 'ALL-TIME' : selectedYear}
                    </span>
                    <h4>Year in Review</h4>
                  </div>
                  <p className="wrapped-body">
                    You logged <strong>{stats.total} titles</strong>. Your peak entertainment
                    month was{' '}
                    <strong>
                      {stats.peakMonth ? stats.peakMonth.month : 'various'}
                    </strong>
                    , with <strong>{stats.theatreCount} big-screen cinema releases</strong> and{' '}
                    <strong>{stats.rewatchCount} comfort rewatches</strong>.
                  </p>
                  <div className="wrapped-footer">
                    <span className="wrapped-persona-badge">🏆 {stats.persona}</span>
                    <button className="btn-copy-wrapped" onClick={handleCopyWrapped}>
                      {copied ? '✅ Copied to Clipboard!' : '📋 Copy Wrapped Summary'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default VaultInsightsModal;
