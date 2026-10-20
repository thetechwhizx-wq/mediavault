const config = require('./personaConfig');

/**
 * Multi-Signal Scoring Engine for Media Habits
 * @param {Array} media - List of media items for the selected year
 * @param {Object} context - Extra aggregates (movies, shows, games, etc.)
 */
function calculatePersonas(media, context = {}) {
  const total = media.length;

  if (total < config.MIN_ITEMS_FOR_PERSONA) {
    return {
      primary: {
        id: 'getting_started',
        name: 'Getting to Know You',
        icon: '🌱',
        score: 100,
        evidence: `Only ${total} title${total === 1 ? '' : 's'} logged so far. Log a few more to unlock your curator profile!`,
        quote: 'Every collection starts with a single story.',
      },
      secondary: [],
      signals: {},
      allScored: [],
    };
  }

  const movies = media.filter((m) => m.type === 'movie');
  const shows = media.filter((m) => m.type === 'show');
  const games = media.filter((m) => m.type === 'game');

  // 1. Theatre Share
  const theatreMovies = movies.filter(
    (m) => m.venue === 'theatre' || (m.notes && /theatre|theater|cinema|imax/i.test(m.notes))
  );
  const theatreShare = movies.length > 0 ? theatreMovies.length / movies.length : 0;

  // 2. Completion Rate
  const completed = media.filter((m) => m.status === 'completed' || m.status === 'rewatch');
  const inProgress = media.filter((m) => m.status === 'in_progress');
  const dropped = media.filter((m) => m.status === 'dropped');
  const planToWatch = media.filter((m) => m.status === 'plan_to_watch');
  const started = completed.length + inProgress.length + dropped.length;
  const completionRate = started > 0 ? completed.length / started : 0;

  // 3. Weekend Share & Binge Days
  let weekendCount = 0;
  const dateCounts = {};

  media.forEach((m) => {
    if (m.watchedDate && /^\d{4}-\d{2}-\d{2}/.test(m.watchedDate)) {
      const d = new Date(m.watchedDate);
      const day = d.getDay(); // 0 is Sunday, 6 is Saturday
      if (day === 0 || day === 6) {
        weekendCount++;
      }
      const dateKey = m.watchedDate.slice(0, 10);
      dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
    }
  });

  const datedItemsCount = Object.values(dateCounts).reduce((a, b) => a + b, 0);
  const weekendShare = datedItemsCount > 0 ? weekendCount / datedItemsCount : 0;

  // Days with 3 or more logged titles
  const bingeDays = Object.values(dateCounts).filter((cnt) => cnt >= 3).length;

  // 4. Mobile Gaming Hours
  let totalGamingHours = 0;
  games.forEach((g) => {
    totalGamingHours += Number(g.hoursPlayed) || 0;
  });

  // 5. Ratings
  const rated = media.filter((m) => m.rating && Number(m.rating) > 0);
  const avgRating =
    rated.length > 0
      ? rated.reduce((acc, m) => acc + Number(m.rating), 0) / rated.length
      : 0;

  // 6. Rewatch Count & Rate
  const rewatches = media.filter(
    (m) => m.status === 'rewatch' || (m.notes && /rewatch/i.test(m.notes))
  );
  const rewatchRate = total > 0 ? rewatches.length / total : 0;

  // 7. Backlog Ratio
  const backlogRatio = completed.length > 0 ? planToWatch.length / completed.length : planToWatch.length;

  const signals = {
    total,
    moviesCount: movies.length,
    showsCount: shows.length,
    gamesCount: games.length,
    theatreCount: theatreMovies.length,
    theatreShare: Math.round(theatreShare * 100),
    completedCount: completed.length,
    startedCount: started,
    completionRate: Math.round(completionRate * 100),
    weekendShare: Math.round(weekendShare * 100),
    bingeDays,
    totalGamingHours: Math.round(totalGamingHours * 10) / 10,
    ratedCount: rated.length,
    avgRating: Math.round(avgRating * 100) / 100,
    rewatchCount: rewatches.length,
    rewatchRate: Math.round(rewatchRate * 100),
    planToWatchCount: planToWatch.length,
    backlogRatio: Math.round(backlogRatio * 10) / 10,
  };

  // ── SCORING DEFINITIONS ──
  const candidates = [];
  const R = config.RULES;

  // 1. Theatrical VIP
  if (theatreMovies.length >= R.theatricalVip.minCount && theatreShare >= R.theatricalVip.minShare) {
    const score = Math.min(100, Math.round(theatreShare * 80 + theatreMovies.length * 4));
    candidates.push({
      id: 'theatrical_vip',
      name: 'Theatrical VIP',
      icon: '🎟️',
      score,
      evidence: `You caught ${theatreMovies.length} of your ${movies.length} films in the cinema (${signals.theatreShare}% theatrical share).`,
      quote: 'Nothing matches the immersive resonance of the silver screen.',
    });
  }

  // 2. Marathon Viewer
  if (bingeDays >= R.marathonViewer.minBingeDays || (shows.length >= 6 && shows.length > movies.length)) {
    const score = Math.min(100, Math.round(bingeDays * 25 + (shows.length / total) * 50));
    candidates.push({
      id: 'marathon_viewer',
      name: 'Marathon Viewer',
      icon: '📺',
      score,
      evidence: bingeDays >= 1
        ? `You had ${bingeDays} multi-title binge day${bingeDays > 1 ? 's' : ''} logging 3+ entries in 24 hours.`
        : `TV & series dominated ${Math.round((shows.length / total) * 100)}% of your library logs.`,
      quote: 'Just one more episode before sleep.',
    });
  }

  // 3. Completionist
  if (started >= R.completionist.minStarted && completionRate >= R.completionist.minRate) {
    const score = Math.min(100, Math.round(completionRate * 90 + (started / 20) * 10));
    candidates.push({
      id: 'completionist',
      name: 'Completionist',
      icon: '✅',
      score,
      evidence: `You finished ${completed.length} of ${started} media titles you began (${signals.completionRate}% completion efficiency).`,
      quote: 'Started is committed. Unfinished is not in the vocabulary.',
    });
  }

  // 4. Master Gamer
  if (totalGamingHours >= R.masterGamer.minHours) {
    const score = Math.min(100, Math.round(Math.min(60, totalGamingHours * 2) + games.length * 8));
    candidates.push({
      id: 'master_gamer',
      name: 'Master Gamer',
      icon: '🎮',
      score,
      evidence: `Logged ${signals.totalGamingHours} active hours across ${games.length} game title${games.length > 1 ? 's' : ''}.`,
      quote: 'Tactile challenges, speed runs, and pure digital mastery.',
    });
  }

  // 5. Weekend Warrior
  if (datedItemsCount >= R.weekendWarrior.minItems && weekendShare >= R.weekendWarrior.minShare) {
    const score = Math.min(100, Math.round(weekendShare * 100));
    candidates.push({
      id: 'weekend_warrior',
      name: 'Weekend Warrior',
      icon: '🗓️',
      score,
      evidence: `${signals.weekendShare}% of your entertainment logging concentrates on Saturdays and Sundays.`,
      quote: 'Saving the finest narratives for the weekend unwind.',
    });
  }

  // 6. Backlog Builder
  if (planToWatch.length >= R.backlogBuilder.minPlanToWatch && backlogRatio >= R.backlogBuilder.backlogRatio) {
    const score = Math.min(100, Math.round(Math.min(50, backlogRatio * 20) + planToWatch.length * 2));
    candidates.push({
      id: 'backlog_builder',
      name: 'Backlog Builder',
      icon: '📚',
      score,
      evidence: `Queued ${planToWatch.length} titles on your watchlist — over ${signals.backlogRatio}x your completed shelf!`,
      quote: 'Curating an infinite queue of cinematic ambition.',
    });
  }

  // 7. Critic
  if (rated.length >= R.critic.minRated && avgRating <= R.critic.maxAvgRating) {
    const score = Math.min(100, Math.round((5 - avgRating) * 35 + rated.length * 2));
    candidates.push({
      id: 'critic',
      name: 'Astute Critic',
      icon: '⭐',
      score,
      evidence: `Average rating is ${signals.avgRating} across ${rated.length} evaluated works — a truly discerning eye.`,
      quote: 'Only genuine masterpieces earn top marks.',
    });
  }

  // 8. Generous Curator
  if (rated.length >= R.generousCurator.minRated && avgRating >= R.generousCurator.minAvgRating) {
    const score = Math.min(100, Math.round(avgRating * 18 + rated.length * 2));
    candidates.push({
      id: 'generous_curator',
      name: 'Generous Enthusiast',
      icon: '🌟',
      score,
      evidence: `Luminous ${signals.avgRating} average across ${rated.length} titles. You know how to find the magic in every frame.`,
      quote: 'Celebrating the craft and emotion of every creation.',
    });
  }

  // 9. Comfort Rewatcher
  if (rewatches.length >= 3 || rewatchRate >= 0.15) {
    const score = Math.min(100, Math.round(rewatchRate * 120 + rewatches.length * 8));
    candidates.push({
      id: 'comfort_rewatcher',
      name: 'Comfort Connoisseur',
      icon: '🔄',
      score,
      evidence: `Logged ${rewatches.length} rewatch logs (${signals.rewatchRate}% rewatch rate). Trusted favorites never fade.`,
      quote: 'The comfort of a story that always welcomes you back.',
    });
  }

  // Sort candidates by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Fallback if nothing qualifies
  const primary = candidates[0] || {
    id: 'cinephile_explorer',
    name: 'Cinephile Explorer',
    icon: '🎬',
    score: 75,
    evidence: `Logged a balanced mix of ${movies.length} movies, ${shows.length} series, and ${games.length} games.`,
    quote: 'An eclectic appetite across genres and storytelling mediums.',
  };

  // Secondary traits (up to 2 runners-up with score >= 40)
  const secondary = candidates.slice(1, 3).filter((c) => c.score >= 40);

  return {
    primary,
    secondary,
    signals,
    allScored: candidates,
  };
}

module.exports = {
  calculatePersonas,
};
