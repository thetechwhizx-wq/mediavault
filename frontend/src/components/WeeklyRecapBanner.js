import React, { useState, useMemo } from 'react';
import './WeeklyRecapBanner.css';

function WeeklyRecapBanner({ media = [] }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      const stored = localStorage.getItem('mediavault_recap_dismissed');
      if (stored) {
        const time = parseInt(stored, 10);
        // Dismiss lasts 24 hours
        if (Date.now() - time < 24 * 60 * 60 * 1000) return true;
      }
    } catch (e) {}
    return false;
  });

  // Calculate past 7 days activity
  const recap = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const cutoffStr = sevenDaysAgo.toISOString().slice(0, 10);

    const pastWeekItems = media.filter((m) => {
      const d = m.watchedDate || m.playedFrom || m.createdAt;
      if (!d) return false;
      const datePart = d.slice(0, 10);
      return datePart >= cutoffStr;
    });

    let moviesCount = 0;
    let showsCount = 0;
    let gamesCount = 0;
    let gamingHours = 0;

    pastWeekItems.forEach((m) => {
      if (m.type === 'movie') moviesCount++;
      else if (m.type === 'show') showsCount++;
      else if (m.type === 'game') {
        gamesCount++;
        gamingHours += Number(m.hoursPlayed) || 0;
      }
    });

    return {
      total: pastWeekItems.length,
      moviesCount,
      showsCount,
      gamesCount,
      gamingHours: Number(gamingHours.toFixed(1)),
      titles: pastWeekItems.slice(0, 3).map((m) => m.title),
    };
  }, [media]);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('mediavault_recap_dismissed', Date.now().toString());
    } catch (e) {}
  };

  const hasActivity = recap.total > 0;

  return (
    <div className={`weekly-recap-banner ${hasActivity ? 'active' : 'quiet'}`}>
      <div className="recap-content">
        <span className="recap-sparkle">{hasActivity ? '✨' : '🛋️'}</span>
        <div className="recap-text-wrap">
          <span className="recap-kicker">
            {hasActivity ? 'Past 7 Days Recap' : 'Curator Check-In'}
          </span>
          <p className="recap-message">
            {hasActivity ? (
              <>
                You logged <strong>{recap.total} title{recap.total === 1 ? '' : 's'}</strong> this week:{' '}
                {recap.moviesCount > 0 && `${recap.moviesCount} movie${recap.moviesCount > 1 ? 's' : ''}, `}
                {recap.showsCount > 0 && `${recap.showsCount} series, `}
                {recap.gamesCount > 0 && `${recap.gamesCount} game${recap.gamesCount > 1 ? 's' : ''} (${recap.gamingHours}h)`}
                {recap.titles.length > 0 && (
                  <span className="recap-highlights">
                    {' '}— including <em>{recap.titles.join(', ')}</em>
                  </span>
                )}
              </>
            ) : (
              'A quiet week in your vault. Ready to discover your next cinematic story or game?'
            )}
          </p>
        </div>
      </div>

      <button className="recap-close-btn" onClick={handleDismiss} title="Dismiss recap">
        ✕
      </button>
    </div>
  );
}

export default WeeklyRecapBanner;
