import React, { useState, useEffect, useMemo } from 'react';
import { fetchStats } from '../api';
import './VaultInsightsModal.css';

function VaultInsightsModal({ initialYear = 'all', availableYears = [], onClose }) {
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState('all'); // 'all', 'movies', 'shows', 'games'
  const [selectedMonth, setSelectedMonth] = useState(null);

  useEffect(() => {
    let isCurrent = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        setSelectedMonth(null);
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

  // Max total for monthly relative scaling
  const maxMonthlyCount = stats?.monthlyData
    ? Math.max(...stats.monthlyData.map((m) => m.total), 1)
    : 1;

  // Selected Month Details & Comparison
  const selectedMonthDetails = useMemo(() => {
    if (!selectedMonth || !stats?.monthlyData) return null;
    const idx = stats.monthlyData.findIndex((m) => m.month === selectedMonth);
    if (idx === -1) return null;

    const currentMonth = stats.monthlyData[idx];
    const prevMonth = idx > 0 ? stats.monthlyData[idx - 1] : null;

    let deltaText = 'First month of calendar year';
    let deltaIsPositive = true;

    if (prevMonth) {
      const diff = currentMonth.total - prevMonth.total;
      if (diff > 0) {
        deltaText = `+${diff} titles (+${Math.round((diff / Math.max(1, prevMonth.total)) * 100)}%) vs ${prevMonth.month}`;
        deltaIsPositive = true;
      } else if (diff < 0) {
        deltaText = `${diff} titles (${Math.round((diff / Math.max(1, prevMonth.total)) * 100)}%) vs ${prevMonth.month}`;
        deltaIsPositive = false;
      } else {
        deltaText = `Even with ${prevMonth.month} (${currentMonth.total} titles)`;
      }
    }

    return {
      ...currentMonth,
      deltaText,
      deltaIsPositive,
    };
  }, [selectedMonth, stats]);

  // Generate shareable Wrapped text with multi-signal evidence
  const handleCopyWrapped = () => {
    if (!stats) return;
    const yearLabel = selectedYear === 'all' ? 'All-Time' : selectedYear;
    const primaryPersona = stats.personaProfile?.primary || { name: stats.persona, evidence: '' };
    const secondaryList = stats.personaProfile?.secondary || [];
    const secondaryText = secondaryList.length > 0
      ? `\n🎖️ Secondary Traits: ${secondaryList.map((s) => `${s.name} ${s.icon}`).join(', ')}`
      : '';

    const text = `🎬 MediaVault ${yearLabel} Wrapped 📊
━━━━━━━━━━━━━━━━━━━━
🏆 Primary Persona: ${primaryPersona.name} ${primaryPersona.icon || ''}
💬 Evidence: ${primaryPersona.evidence || 'Eclectic catalog of favorites.'}${secondaryText}
✨ Total Titles: ${stats.total}
🎥 Movies: ${stats.moviesCount} (${stats.theatreCount} in Theatres 🎭)
📺 Series & Shows: ${stats.showsCount}
🎮 Mobile & PC Gaming: ${stats.gaming?.totalHours || 0} hrs
⏱️ Total Real Watch Time: ${stats.watchHours || 0} hrs
🔥 Peak Month: ${stats.peakMonth ? `${stats.peakMonth.month} (${stats.peakMonth.total} titles)` : 'N/A'}
🔄 Comfort Rewatches: ${stats.rewatchCount}
━━━━━━━━━━━━━━━━━━━━
Tracked with MediaVault (Obsidian Kinetic) 🚀`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      alert('Copied summary:\n\n' + text);
    }
  };

  const personaProfile = stats?.personaProfile || null;
  const primaryPersona = personaProfile?.primary || null;
  const secondaryPersonas = personaProfile?.secondary || [];
  const signals = personaProfile?.signals || {};

  // Real watch hours from server runtimeMinutes calculation
  const displayWatchHours = stats?.watchHours !== undefined
    ? stats.watchHours
    : Math.round((stats?.moviesCount || 0) * 2 + (stats?.showsCount || 0) * 4);

  return (
    <div className="modal-overlay insights-overlay" onClick={onClose}>
      <div className="modal insights-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header matching Stitch Obsidian Kinetic style */}
        <div className="insights-header">
          <div className="insights-title-area">
            <span className="insights-tag-pill">Curator Intelligence</span>
            <div className="insights-title-row">
              <span className="insights-brand-icon">
                <span className="material-symbols-outlined">analytics</span>
              </span>
              <div>
                <h2>Vault Insights & Analytics</h2>
                <p className="insights-subtitle">
                  Deep-dive statistics across your logged media, real watch velocity, and habit scoring.
                </p>
              </div>
            </div>
          </div>

          <div className="insights-header-actions">
            <button className="insights-action-btn" onClick={handleCopyWrapped} title="Share Wrapped">
              <span className="material-symbols-outlined">ios_share</span>
              <span>{copied ? 'Copied!' : 'Share'}</span>
            </button>
            <button className="modal-close" onClick={onClose} aria-label="Close modal">
              ✕
            </button>
          </div>
        </div>

        {/* Timeframe Segmented Control (Stitch UI) */}
        <div className="insights-timeframe-bar">
          <div className="timeframe-segmented-control">
            <button
              className={`timeframe-btn ${selectedYear === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedYear('all')}
            >
              All-Time
            </button>
            {availableYears.map((yr) => (
              <button
                key={yr}
                className={`timeframe-btn ${selectedYear === yr ? 'active' : ''}`}
                onClick={() => setSelectedYear(yr)}
              >
                {yr}
              </button>
            ))}
          </div>

          {stats?.peakMonth && (
            <div className="insights-live-sync-indicator">
              <span className="pulse-dot"></span>
              <span>Peak: {stats.peakMonth.month} ({stats.peakMonth.total} items)</span>
            </div>
          )}
        </div>

        {/* Modal Scroll Body */}
        <div className="insights-body">
          {loading && (
            <div className="insights-loading">
              <div className="spinner" />
              <p>Analyzing library signals and evaluating personas...</p>
            </div>
          )}

          {error && <div className="insights-error">⚠️ {error}</div>}

          {!loading && !error && stats && (
            <>
              {/* 1. Multi-Signal Persona Hero Banner */}
              <div className="persona-kinetic-banner">
                <div className="persona-banner-glow"></div>
                <div className="persona-banner-main">
                  <div className="persona-badge-row">
                    <span className="persona-kicker">Evaluated Entertainment Persona</span>
                    {primaryPersona?.score && (
                      <span className="persona-affinity-chip">
                        {primaryPersona.score}% Match Affinity
                      </span>
                    )}
                  </div>
                  <div className="persona-headline-group">
                    <span className="persona-hero-icon">{primaryPersona?.icon || '🎬'}</span>
                    <div>
                      <h3 className="persona-hero-title">
                        {primaryPersona?.name || stats.persona}
                      </h3>
                      <p className="persona-quote">
                        "{primaryPersona?.quote || 'A bespoke collection of cinematic moments.'}"
                      </p>
                    </div>
                  </div>

                  {/* Plain English Evidence */}
                  <div className="persona-evidence-box">
                    <span className="material-symbols-outlined evidence-icon">verified</span>
                    <p className="persona-evidence-text">
                      <strong>The Evidence:</strong>{' '}
                      {primaryPersona?.evidence || 'Balanced distribution of media across formats.'}
                    </p>
                  </div>

                  {/* Secondary Traits Runners-Up */}
                  {secondaryPersonas.length > 0 && (
                    <div className="persona-secondary-traits">
                      <span className="secondary-label">Secondary Traits:</span>
                      <div className="secondary-pills">
                        {secondaryPersonas.map((sec) => (
                          <div key={sec.id} className="secondary-pill" title={sec.evidence}>
                            <span>{sec.icon}</span>
                            <span className="secondary-pill-name">{sec.name}</span>
                            <span className="secondary-pill-score">{sec.score}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="persona-banner-stats">
                  <div className="banner-stat-block">
                    <span className="stat-big-num">{stats.total}</span>
                    <span className="stat-subtext">Total Catalogued</span>
                  </div>
                  <div className="banner-stat-block">
                    <span className="stat-big-num text-tertiary">
                      {displayWatchHours}h
                    </span>
                    <span className="stat-subtext">Real Watch Time</span>
                  </div>
                </div>
              </div>

              {/* 2. Bento Grid 4-Column KPI Row (Obsidian Kinetic) */}
              <div className="bento-kpi-grid">
                {/* Bento Card 1: Real Watch Time & Velocity */}
                <div className="bento-card">
                  <div className="bento-card-header">
                    <span className="bento-card-title">Real Watch Time</span>
                    <span className="bento-badge-tertiary">
                      <span className="material-symbols-outlined text-xs">trending_up</span>
                      Accurate
                    </span>
                  </div>
                  <div className="bento-card-value-row">
                    <span className="bento-card-num">{displayWatchHours}</span>
                    <span className="bento-card-unit">hrs</span>
                  </div>
                  <p className="bento-card-caption">
                    Calculated from actual OMDb & TVMaze runtime minutes across your logs
                  </p>
                  {/* Decorative sparkline */}
                  <div className="bento-sparkline">
                    <svg viewBox="0 0 140 32" preserveAspectRatio="none">
                      <path
                        d="M0 24 L20 20 L40 26 L60 12 L80 18 L100 8 L120 14 L140 4"
                        fill="none"
                        stroke="#8083ff"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>

                {/* Bento Card 2: Interactive Gaming Hours */}
                <div className="bento-card">
                  <div className="bento-card-header">
                    <span className="bento-card-title">Gaming Playtime</span>
                    <span className="bento-badge-purple">
                      🎮 {stats.gamesCount} Games
                    </span>
                  </div>
                  <div className="bento-card-value-row">
                    <span className="bento-card-num">{stats.gaming?.totalHours || 0}</span>
                    <span className="bento-card-unit">hrs</span>
                  </div>
                  <p className="bento-card-caption">
                    {stats.gaming?.topGame ? `Top: ${stats.gaming.topGame.title} (${stats.gaming.topGame.hoursPlayed}h)` : 'Active session logger'}
                  </p>
                  <div className="bento-progress-track">
                    <div
                      className="progress-slice-completed"
                      style={{ width: `${Math.min(100, (stats.gaming?.totalHours || 1) * 3)}%` }}
                      title="Gaming hours"
                    />
                  </div>
                </div>

                {/* Bento Card 3: Cinema & Theatres */}
                <div className="bento-card">
                  <div className="bento-card-header">
                    <span className="bento-card-title">Silver Screen Share</span>
                    <span className="bento-badge-theatre">
                      🎭 {stats.theatrePercentage}%
                    </span>
                  </div>
                  <div className="bento-card-value-row">
                    <span className="bento-card-num">{stats.theatreCount}</span>
                    <span className="bento-card-unit">films</span>
                  </div>
                  <p className="bento-card-caption">
                    Caught in theatres out of {stats.moviesCount} total movies logged
                  </p>
                  <div className="bento-theatre-preview">
                    {stats.theatreMovies?.slice(0, 3).map((m) => (
                      <span key={m.id} className="theatre-pill-compact" title={m.title}>
                        {m.title}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bento Card 4: Daily Binge & Weekend Pace */}
                <div className="bento-card">
                  <div className="bento-card-header">
                    <span className="bento-card-title">Binge Rhythm</span>
                    <span className="bento-badge-neutral">
                      {signals.weekendShare ? `${signals.weekendShare}% Wknd` : 'Balanced'}
                    </span>
                  </div>
                  <div className="bento-card-value-row">
                    <span className="bento-card-num">{signals.bingeDays || 0}</span>
                    <span className="bento-card-unit">marathons</span>
                  </div>
                  <p className="bento-card-caption">
                    Days with 3+ logged releases • {signals.rewatchCount || 0} comfort rewatches
                  </p>
                  <div className="bento-status-row">
                    <span className="text-tertiary flex items-center gap-1 font-bold">
                      <span className="material-symbols-outlined text-xs">bolt</span> Healthy Velocity
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Monthly Activity & Streams Chart with Click-to-Drilldown */}
              <div className="insights-chart-card">
                <div className="chart-header-row">
                  <div>
                    <h3 className="chart-title">Media Consumption & Watch Velocity</h3>
                    <p className="chart-subtitle">
                      Click any month column to reveal its title reel and month-over-month comparison
                    </p>
                  </div>
                  <div className="chart-stream-toggles">
                    <button
                      className={`stream-toggle-btn ${activeChartTab === 'all' ? 'active' : ''}`}
                      onClick={() => setActiveChartTab('all')}
                    >
                      All Streams
                    </button>
                    <button
                      className={`stream-toggle-btn ${activeChartTab === 'movies' ? 'active' : ''}`}
                      onClick={() => setActiveChartTab('movies')}
                    >
                      Movies
                    </button>
                    <button
                      className={`stream-toggle-btn ${activeChartTab === 'shows' ? 'active' : ''}`}
                      onClick={() => setActiveChartTab('shows')}
                    >
                      TV Shows
                    </button>
                    <button
                      className={`stream-toggle-btn ${activeChartTab === 'games' ? 'active' : ''}`}
                      onClick={() => setActiveChartTab('games')}
                    >
                      Gaming
                    </button>
                  </div>
                </div>

                {/* Custom Interactive Monthly SVG/Bar Visualization */}
                <div className="kinetic-monthly-chart">
                  <div className="chart-columns-grid">
                    {stats.monthlyData.map((m) => {
                      let displayVal = m.total;
                      if (activeChartTab === 'movies') displayVal = m.movies;
                      if (activeChartTab === 'shows') displayVal = m.shows;
                      if (activeChartTab === 'games') displayVal = m.games;

                      const heightPercent =
                        displayVal > 0 ? Math.max((displayVal / maxMonthlyCount) * 100, 12) : 0;
                      const isPeak = stats.peakMonth?.month === m.month && displayVal > 0;
                      const isSelected = selectedMonth === m.month;

                      return (
                        <div
                          key={m.month}
                          className={`kinetic-chart-column ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedMonth(selectedMonth === m.month ? null : m.month)}
                          title={`Click to view ${m.month} logs (${m.total} items)`}
                        >
                          <span className="col-val">{displayVal > 0 ? displayVal : ''}</span>
                          <div className="col-track">
                            <div
                              className={`col-fill ${isPeak ? 'peak' : ''} ${isSelected ? 'selected-bar' : ''} ${activeChartTab}`}
                              style={{ height: `${heightPercent}%` }}
                            />
                          </div>
                          <span className={`col-month ${isPeak ? 'peak-text' : ''} ${isSelected ? 'selected-text' : ''}`}>
                            {m.month}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="chart-legend-footer">
                  <div className="legend-item">
                    <span className="legend-dot bg-primary"></span>
                    <span>Cinema & Films ({stats.moviesCount})</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot bg-secondary"></span>
                    <span>TV Series ({stats.showsCount})</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot bg-tertiary"></span>
                    <span>Interactive & Games ({stats.gamesCount})</span>
                  </div>
                  <div className="legend-item ml-auto">
                    <span className="theatre-pill-tiny">🎭 {stats.theatreCount} Theatrical</span>
                  </div>
                </div>
              </div>

              {/* ── 3B. Month Drill-Down Card (When Month is Clicked) ── */}
              {selectedMonthDetails && (
                <div className="month-drilldown-card">
                  <div className="drilldown-header">
                    <div className="drilldown-title-wrap">
                      <span className="drilldown-badge">
                        📅 {selectedMonthDetails.month} {selectedYear === 'all' ? '' : selectedYear} Breakdown
                      </span>
                      <span className={`drilldown-delta ${selectedMonthDetails.deltaIsPositive ? 'positive' : 'neutral'}`}>
                        {selectedMonthDetails.deltaText}
                      </span>
                    </div>
                    <button
                      className="btn-close-drilldown"
                      onClick={() => setSelectedMonth(null)}
                      title="Close month drilldown"
                    >
                      ✕ Close Month
                    </button>
                  </div>

                  <div className="drilldown-stats-pills">
                    <span className="drilldown-pill">Total: <strong>{selectedMonthDetails.total}</strong></span>
                    <span className="drilldown-pill">🎬 Movies: <strong>{selectedMonthDetails.movies}</strong></span>
                    <span className="drilldown-pill">📺 Shows: <strong>{selectedMonthDetails.shows}</strong></span>
                    <span className="drilldown-pill">🎮 Games: <strong>{selectedMonthDetails.games}</strong></span>
                    {selectedMonthDetails.theatre > 0 && (
                      <span className="drilldown-pill">🎭 Theatres: <strong>{selectedMonthDetails.theatre}</strong></span>
                    )}
                  </div>

                  {selectedMonthDetails.items && selectedMonthDetails.items.length > 0 ? (
                    <div className="drilldown-items-reel">
                      {selectedMonthDetails.items.map((item) => (
                        <div key={item.id} className="drilldown-item-chip" title={item.title}>
                          <div className="drilldown-poster-wrap">
                            {item.poster ? (
                              <img src={item.poster} alt={item.title} />
                            ) : (
                              <span className="chip-placeholder">{item.type === 'game' ? '🎮' : '🎬'}</span>
                            )}
                          </div>
                          <div className="drilldown-chip-info">
                            <span className="drilldown-chip-title">{item.title}</span>
                            <span className="drilldown-chip-meta">
                              {item.venue === 'theatre' && '🎭 Cinema • '}
                              {item.rating && `★ ${item.rating} • `}
                              {item.watchedDate || ''}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="drilldown-empty">No individual titles logged for this month.</p>
                  )}
                </div>
              )}

              {/* 4. Theatrical Cinema Reel (Obsidian Kinetic) */}
              {stats.theatreMovies && stats.theatreMovies.length > 0 && (
                <div className="insights-section theatre-gallery-section">
                  <div className="section-title-row">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-tertiary">theaters</span>
                      <h3>Silver Screen Showcase ({stats.theatreMovies.length})</h3>
                    </div>
                    <span className="theatre-badge-pill">Caught in Cinema</span>
                  </div>
                  <div className="theatre-reel-kinetic">
                    {stats.theatreMovies.map((movie) => (
                      <div key={movie.id} className="theatre-card-kinetic">
                        <div className="theatre-poster-wrap">
                          {movie.poster ? (
                            <img
                              src={movie.poster}
                              alt={movie.title}
                              className="theatre-poster-img"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="theatre-empty-poster">🎭</div>
                          )}
                          <div className="theatre-scrim-gradient"></div>
                          <span className="theatre-glass-badge">🎟️ Cinema</span>
                        </div>
                        <div className="theatre-card-info">
                          <span className="theatre-card-title" title={movie.title}>
                            {movie.title}
                          </span>
                          {movie.watchedDate && (
                            <span className="theatre-card-date">{movie.watchedDate}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Smart Habits & Observation Cards */}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default VaultInsightsModal;
