// routes/media.js

const express = require('express');
const router = express.Router();
const { calculatePersonas } = require('../personaEngine');
const {
  isMongo,
  getAllMedia,
  addMediaItem,
  updateMediaItem,
  deleteMediaItem,
  bulkAddMediaItems,
  bulkDeleteMediaItems,
} = require('../db');


// ─────────────────────────────────────────
// Smart Title Normalizer
// Extracts base title and cleans "s2", "season 3", "part 2", etc.
// ─────────────────────────────────────────
function cleanMediaTitle(rawTitle) {
  if (!rawTitle) return { baseTitle: '', seasonHint: '', yearHint: '' };
  let title = rawTitle.trim();

  // Extract year if in title like "Amaran (2024)" or "Gifted 2017"
  let yearHint = '';
  const yearMatch = title.match(/\b(19\d\d|20\d\d)\b/);
  if (yearMatch) {
    yearHint = yearMatch[1];
  }

  // Extract season / part info like "s2", "S02", "season 3", "season1", "part 2"
  let seasonHint = '';
  const seasonMatch = title.match(/\b(?:s(\d+)|season\s*(\d+)|part\s*(\d+))\b/i);
  if (seasonMatch) {
    seasonHint = seasonMatch[0];
    // Remove season marker from title for cleaner database searching
    title = title.replace(seasonMatch[0], '').trim();
  }

  // Clean trailing punctuation or dangling parens
  title = title.replace(/\(\s*\)/g, '').replace(/[-:_]\s*$/, '').trim();

  return {
    baseTitle: title || rawTitle.trim(),
    seasonHint,
    yearHint,
  };
}

function getTitleVariations(title) {
  const variations = [title];

  // 1. Compound / joined words: "Iron heart" -> "Ironheart", "Iron-heart"
  const words = title.trim().split(/\s+/);
  if (words.length === 2) {
    variations.push(words.join(''));
    variations.push(words.join('-'));
  }

  // 2. Roman numerals: "2" <-> "II", "3" <-> "III"
  const romanMap = { '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI' };
  const revMap = { 'ii': '2', 'iii': '3', 'iv': '4', 'v': '5', 'vi': '6' };

  for (const [digit, roman] of Object.entries(romanMap)) {
    const rx = new RegExp('\\b' + digit + '\\b', 'gi');
    if (rx.test(title)) variations.push(title.replace(rx, roman));
  }
  for (const [roman, digit] of Object.entries(revMap)) {
    const rx = new RegExp('\\b' + roman + '\\b', 'gi');
    if (rx.test(title)) variations.push(title.replace(rx, digit));
  }
  return [...new Set(variations)];
}

// ─────────────────────────────────────────
// Wikipedia REST Poster Search (Incredible for Regional Cinema, Cast, Studios & Exact Films)
// ─────────────────────────────────────────
async function searchWikipediaPosters(query, type = 'movie', year = '', hint = '') {
  const candidates = [];
  const seen = new Set();
  const titleVars = getTitleVariations(query);

  const searchTerms = [];
  for (const tv of titleVars) {
    if (hint && year) searchTerms.push(`${tv} ${hint} ${year}`);
    if (hint) searchTerms.push(`${tv} ${hint}`);
    if (hint) searchTerms.push(`${tv} ${hint} ${type === 'show' ? 'series' : type === 'game' ? 'game' : 'film'}`);
    searchTerms.push(`${tv} ${type === 'show' ? 'series' : type === 'game' ? 'video game' : 'film'}`);
    searchTerms.push(tv);
  }

  for (const term of searchTerms) {
    if (!term.trim()) continue;
    try {
      const res = await fetch(
        `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(term)}&limit=5`,
        {
          headers: { 'User-Agent': 'MediaVault/1.0 (contact@mediavault.app)' },
          signal: AbortSignal.timeout(3500),
        }
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const p of data.pages || []) {
        if (!p.key) continue;
        const sumRes = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(p.key)}`,
          {
            headers: { 'User-Agent': 'MediaVault/1.0 (contact@mediavault.app)' },
            signal: AbortSignal.timeout(3500),
          }
        );
        if (!sumRes.ok) continue;
        const sum = await sumRes.json();
        const poster = sum.thumbnail?.source;
        const desc = sum.description || '';

        // Filter out pure people/biographies
        if (
          /\b(director|actor|actress|producer|musician|singer|cricketer|politician)\b/i.test(desc) &&
          !/\b(film|series|game|miniseries|media)\b/i.test(desc.replace(/film director|film producer/i, ''))
        ) {
          continue;
        }

        // Must match query keywords (e.g. "Iron" AND "heart", or joined "ironheart")
        const fullText = (sum.title + ' ' + desc).toLowerCase();
        const qKeywords = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 2);
        const qJoined = query.toLowerCase().replace(/[^a-z0-9]/g, '');
        const matchesTitle = qKeywords.every((w) => fullText.includes(w)) || fullText.includes(qJoined);
        if (!matchesTitle) {
          continue;
        }

        if (poster && !seen.has(poster)) {
          seen.add(poster);
          // Extract 4 digit year if in description
          const yMatch = desc.match(/\b(19\d\d|20\d\d)\b/);
          candidates.push({
            title: sum.title.replace(/\s*\([^)]*\)\s*$/, '').trim(),
            year: yMatch ? yMatch[1] : desc,
            type,
            poster,
            source: 'Wikipedia',
            summary: sum.extract ? sum.extract.slice(0, 160) + '...' : desc,
          });
        }
      }
      if (candidates.length >= 6) break;
    } catch (e) {
      // Continue on timeout/network error
    }
  }

  return candidates;
}

// ─────────────────────────────────────────
// Comprehensive Multi-Source Search
// ─────────────────────────────────────────
async function searchCoverCandidates(query, type = 'movie', year = '', hint = '') {
  const candidates = [];
  const seenPosters = new Set();
  const { baseTitle, seasonHint, yearHint } = cleanMediaTitle(query);
  const targetYear = year || yearHint;
  const searchTitle = baseTitle || query.trim();
  const titleVariations = getTitleVariations(searchTitle);

  // 1. Apple App Store / iTunes (Specialized & FIRST for Games)
  if (type === 'game') {
    try {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(searchTitle)}&entity=software&limit=8`,
        { signal: AbortSignal.timeout(3500) }
      );
      if (res.ok) {
        const d = await res.json();
        for (const item of (d.results || [])) {
          const img = item.artworkUrl512 || item.artworkUrl100;
          if (img && !seenPosters.has(img)) {
            seenPosters.add(img);
            candidates.push({
              title: item.trackName,
              year: item.releaseDate ? item.releaseDate.slice(0, 4) : '',
              type: 'game',
              poster: img,
              source: 'AppStore',
              genres: item.genres || ['Game'],
              summary: item.genres ? item.genres.join(', ') : '',
            });
          }
        }
      }
    } catch (err) {}
  }

  // 2. If studio/actor/keyword hint is provided, Wikipedia is the champion
  if (hint && type !== 'game') {
    try {
      const wikiResults = await searchWikipediaPosters(searchTitle, type, targetYear, hint);
      for (const item of wikiResults) {
        if (!seenPosters.has(item.poster)) {
          seenPosters.add(item.poster);
          candidates.push(item);
        }
      }
    } catch (e) {}
  }

  // 3. OMDb API (IMDb Catalog — Hollywood, Global & Indian cinema)
  if (type === 'movie' || type === 'show') {
    for (const variation of titleVariations) {
      try {
        let omdbUrl = `https://www.omdbapi.com/?s=${encodeURIComponent(variation)}&apikey=trilogy`;
        if (targetYear) omdbUrl += `&y=${encodeURIComponent(targetYear)}`;
        omdbUrl += `&type=${type === 'show' ? 'series' : 'movie'}`;

        let res = await fetch(omdbUrl, { signal: AbortSignal.timeout(3500) });
        let d = res.ok ? await res.json() : null;

        // If targetYear had 0 results, retry without year
        if ((!d || !d.Search || d.Search.length === 0) && targetYear) {
          const fallbackUrl = `https://www.omdbapi.com/?s=${encodeURIComponent(variation)}&type=${type === 'show' ? 'series' : 'movie'}&apikey=trilogy`;
          res = await fetch(fallbackUrl, { signal: AbortSignal.timeout(3500) });
          d = res.ok ? await res.json() : null;
        }

        if (d && d.Search) {
          for (const item of d.Search) {
            if (item.Poster && item.Poster !== 'N/A' && !seenPosters.has(item.Poster)) {
              seenPosters.add(item.Poster);
              candidates.push({
                title: item.Title,
                year: item.Year,
                type: item.Type === 'series' ? 'show' : item.Type,
                poster: item.Poster,
                source: 'IMDb',
                imdbID: item.imdbID,
              });
            }
          }
        }
      } catch (err) {}
      if (candidates.length >= 6) break;
    }
  }

  // 4. TVMaze (Specialized for TV Series & Anime)
  if (type === 'show') {
    try {
      const res = await fetch(
        `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(searchTitle)}`,
        { signal: AbortSignal.timeout(3500) }
      );
      if (res.ok) {
        const list = await res.json();
        for (const item of (list || []).slice(0, 5)) {
          const show = item.show;
          const img = show?.image?.original || show?.image?.medium;
          if (img && !seenPosters.has(img)) {
            seenPosters.add(img);
            candidates.push({
              title: show.name,
              year: show.premiered ? show.premiered.slice(0, 4) : '',
              type: 'show',
              poster: img,
              source: 'TVMaze',
              genres: show.genres || [],
              runtimeMinutes: show.averageRuntime || show.runtime || 45,
              summary: show.summary ? show.summary.replace(/<[^>]+>/g, '').slice(0, 150) + '...' : '',
            });
          }
        }
      }
    } catch (err) {}
  }

  // 5. Wikipedia Search (General fallback for movies, shows & video games)
  if (candidates.length < 5) {
    try {
      const wikiResults = await searchWikipediaPosters(searchTitle, type, targetYear, hint);
      for (const item of wikiResults) {
        if (!seenPosters.has(item.poster)) {
          seenPosters.add(item.poster);
          candidates.push(item);
        }
      }
    } catch (e) {}
  }

  // 6. Smart Relevance Ranking — sorts results so studio/franchise/lead hints rank #1
  candidates.sort((a, b) => {
    const scoreA = calculateRelevance(a, searchTitle, targetYear, hint);
    const scoreB = calculateRelevance(b, searchTitle, targetYear, hint);
    return scoreB - scoreA;
  });

  return candidates.slice(0, 15);
}

function calculateRelevance(item, query, targetYear, hint) {
  let score = 0;
  const itemTitle = (item.title || '').toLowerCase();
  const itemDesc = ((item.summary || '') + ' ' + (item.year || '')).toLowerCase();
  const qClean = query.toLowerCase().replace(/[^a-z0-9]/g, '');
  const tClean = itemTitle.replace(/[^a-z0-9]/g, '');

  if (tClean.includes(qClean)) score += 12;
  const qWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const matchedWords = qWords.filter((w) => itemTitle.includes(w));
  score += (matchedWords.length / Math.max(1, qWords.length)) * 8;

  if (hint) {
    const hLower = hint.toLowerCase();
    if (itemTitle.includes(hLower) || itemDesc.includes(hLower)) {
      score += 20; // Massive boost if studio/cast/keyword matches
    }
  }

  if (targetYear && String(item.year).includes(targetYear)) score += 6;
  return score;
}

// ─────────────────────────────────────────
// Smart Single Metadata Matcher
// ─────────────────────────────────────────
async function fetchMetadata(rawTitle, type = 'movie', year = '', hint = '') {
  try {
    const candidates = await searchCoverCandidates(rawTitle, type, year, hint);
    if (candidates && candidates.length > 0) {
      // Prioritize matches that match the requested type and year
      const exactMatch = candidates.find((c) => {
        const matchType = c.type === type;
        const matchYear = year ? String(c.year).includes(year) : true;
        return matchType && matchYear;
      }) || candidates.find((c) => c.type === type) || candidates[0];

      let genres = exactMatch.genres || [];
      let runtimeMinutes = exactMatch.runtimeMinutes || 0;

      // If OMDb candidate with imdbID, fetch full details for genres and runtime
      if (exactMatch.imdbID && (genres.length === 0 || !runtimeMinutes)) {
        try {
          const detailRes = await fetch(
            `https://www.omdbapi.com/?i=${exactMatch.imdbID}&apikey=trilogy`,
            { signal: AbortSignal.timeout(3000) }
          );
          if (detailRes.ok) {
            const detail = await detailRes.json();
            if (detail.Genre && detail.Genre !== 'N/A') {
              genres = detail.Genre.split(',').map((g) => g.trim());
            }
            if (detail.Runtime && detail.Runtime !== 'N/A') {
              const parsed = parseInt(detail.Runtime, 10);
              if (!isNaN(parsed)) runtimeMinutes = parsed;
            }
          }
        } catch (e) {}
      }

      return {
        poster: exactMatch.poster,
        year: exactMatch.year,
        genres,
        runtimeMinutes,
        summary: exactMatch.summary || '',
      };
    }
    return null;
  } catch (err) {
    return null;
  }
}

// ─────────────────────────────────────────
// GET /api/media/candidates — search candidates for user to choose
// ─────────────────────────────────────────
router.get('/candidates', async (req, res) => {
  const { title, type, year, cast, hint } = req.query;
  const userHint = hint || cast || '';
  if (!title) return res.status(400).json({ error: 'Title required' });
  const results = await searchCoverCandidates(title, type || 'movie', year || '', userHint);
  res.json(results || []);
});

// ─────────────────────────────────────────
// GET /api/media/metadata — live search single match
// ─────────────────────────────────────────
router.get('/metadata', async (req, res) => {
  const { title, type, year, cast, hint } = req.query;
  const userHint = hint || cast || '';
  if (!title) return res.status(400).json({ error: 'Title required' });
  const meta = await fetchMetadata(title, type || 'movie', year || '', userHint);
  res.json(meta || {});
});

// ─────────────────────────────────────────
// GET /api/media/stats — Detailed Analytics & Insights
// ─────────────────────────────────────────
router.get('/stats', async (req, res) => {
  const allMedia = await getAllMedia();
  const reqYear = req.query.year || 'all';

  // 1. Detect all available years present in the media library
  const yearSet = new Set();
  allMedia.forEach((m) => {
    if (m.watchedDate && /^\d{4}/.test(m.watchedDate)) {
      yearSet.add(m.watchedDate.slice(0, 4));
    }
  });
  const availableYears = Array.from(yearSet).sort((a, b) => b.localeCompare(a));

  // 2. Filter items for selected year
  const media = reqYear === 'all'
    ? allMedia
    : allMedia.filter((m) => m.watchedDate && m.watchedDate.startsWith(reqYear));

  // 3. Media Type Counts
  const movies = media.filter((m) => m.type === 'movie');
  const shows = media.filter((m) => m.type === 'show');
  const games = media.filter((m) => m.type === 'game');

  // 4. Theatres & Venues
  const theatreMovies = movies.filter(
    (m) => m.venue === 'theatre' || (m.notes && /theatre|theater|cinema|imax/i.test(m.notes))
  );
  const theatrePercentage = movies.length > 0 ? Math.round((theatreMovies.length / movies.length) * 100) : 0;

  // 5. Rewatches
  const rewatchCount = media.filter(
    (m) => m.status === 'rewatch' || (m.notes && /rewatch/i.test(m.notes))
  ).length;

  // 6. Mobile Gaming Stats
  let totalGamingHours = 0;
  let topGame = null;
  let maxGameHours = 0;
  games.forEach((g) => {
    const hours = Number(g.hoursPlayed) || 0;
    totalGamingHours += hours;
    if (hours > maxGameHours) {
      maxGameHours = hours;
      topGame = { id: g.id, title: g.title, hoursPlayed: hours, poster: g.poster };
    }
  });
  const gamesActive = games.filter((g) => g.status === 'in_progress').length;
  const gamesCompleted = games.filter((g) => g.status === 'completed').length;
  const gamesDropped = games.filter((g) => g.status === 'dropped').length;

  // 7. Monthly Distribution (Jan - Dec) with Full Title Lists & Comparison
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData = monthNames.map((name, idx) => {
    const monthIndexStr = String(idx + 1).padStart(2, '0');
    const monthItems = media.filter((m) => {
      const date = m.watchedDate || m.playedFrom || (m.playedMonth ? `${m.playedMonth}-01` : '');
      if (!date) return false;
      const parts = date.split('-');
      return parts.length >= 2 && parts[1] === monthIndexStr;
    });

    return {
      month: name,
      monthIndex: idx + 1,
      total: monthItems.length,
      movies: monthItems.filter((m) => m.type === 'movie').length,
      shows: monthItems.filter((m) => m.type === 'show').length,
      games: monthItems.filter((m) => m.type === 'game').length,
      theatre: monthItems.filter((m) => m.venue === 'theatre').length,
      items: monthItems.map((m) => ({
        id: m.id,
        title: m.title,
        type: m.type,
        poster: m.poster,
        rating: m.rating,
        venue: m.venue,
        watchedDate: m.watchedDate || m.playedFrom || m.playedMonth,
        notes: m.notes,
        replay: m.replay,
        status: m.status,
      })),
    };
  });

  // Calculate Real Watch Hours from runtimeMinutes
  let totalWatchMinutes = 0;
  movies.forEach((m) => {
    totalWatchMinutes += m.runtimeMinutes || 120;
  });
  shows.forEach((s) => {
    totalWatchMinutes += s.runtimeMinutes ? s.runtimeMinutes * 6 : 45 * 8;
  });
  const totalWatchHours = Number((totalWatchMinutes / 60).toFixed(1));

  // Calculate Peak & Driest Month (among months with activity)
  let peakMonth = null;
  let driestMonth = null;
  let maxCount = -1;
  let minCount = 99999;

  monthlyData.forEach((m) => {
    if (m.total > maxCount && m.total > 0) {
      maxCount = m.total;
      peakMonth = m;
    }
    if (m.total < minCount && m.total > 0) {
      minCount = m.total;
      driestMonth = m;
    }
  });

  // 8. Generate Smart Habit & Mood Insights
  const insights = [];

  if (peakMonth && peakMonth.total > 0) {
    insights.push({
      type: 'peak',
      icon: '🔥',
      title: 'Peak Entertainment Month',
      description: `${peakMonth.month} ${reqYear !== 'all' ? reqYear : ''} was your absolute peak with ${peakMonth.total} titles logged!`,
    });
  }

  if (theatreMovies.length > 0) {
    const titles = theatreMovies.slice(0, 3).map((m) => m.title).join(', ');
    insights.push({
      type: 'theatre',
      icon: '🎟️',
      title: 'Big Screen Enthusiast',
      description: `You caught ${theatreMovies.length} movies in theatres (${theatrePercentage}% of your films), including ${titles}.`,
    });
  }

  if (driestMonth && peakMonth && driestMonth.total <= 2 && peakMonth.total >= 6) {
    insights.push({
      type: 'dry',
      icon: '🏜️',
      title: 'Driest Period Alert',
      description: `${driestMonth.month} was your quietest stretch, logging only ${driestMonth.total} title(s).`,
    });
  }

  if (rewatchCount > 0) {
    insights.push({
      type: 'rewatch',
      icon: '🔄',
      title: 'Comfort Favorites',
      description: `Logged ${rewatchCount} rewatch title${rewatchCount > 1 ? 's' : ''}. Nothing beats returning to a trusted favorite!`,
    });
  }

  if (totalGamingHours > 0) {
    insights.push({
      type: 'gaming',
      icon: '🎮',
      title: 'Gaming Activity',
      description: `Logged ${totalGamingHours.toFixed(1)} hours of mobile gaming.${topGame ? ` Most played: ${topGame.title} (${topGame.hoursPlayed} hrs).` : ''}`,
    });
  }

  // Entertainment Persona Engine
  const personaResult = calculatePersonas(media, { movies, shows, games, theatreMovies });

  res.json({
    year: reqYear,
    availableYears,
    total: media.length,
    watchHours: totalWatchHours,
    moviesCount: movies.length,
    showsCount: shows.length,
    gamesCount: games.length,
    theatreCount: theatreMovies.length,
    theatrePercentage,
    theatreMovies: theatreMovies.slice(0, 12).map((m) => ({
      id: m.id,
      title: m.title,
      watchedDate: m.watchedDate,
      poster: m.poster,
    })),
    rewatchCount,
    gaming: {
      totalHours: Number(totalGamingHours.toFixed(1)),
      topGame,
      active: gamesActive,
      completed: gamesCompleted,
      dropped: gamesDropped,
    },
    monthlyData,
    peakMonth,
    driestMonth,
    insights,
    persona: `${personaResult.primary.name} ${personaResult.primary.icon}`,
    personaProfile: personaResult,
  });
});

// ─────────────────────────────────────────
// GET /api/media — get ALL media items
// ─────────────────────────────────────────
router.get('/', async (req, res) => {
  const media = await getAllMedia();
  res.json(media);
});

// ─────────────────────────────────────────
// POST /api/media — add a NEW media item
// ─────────────────────────────────────────
router.post('/', async (req, res) => {
  const {
    title,
    type,
    status,
    progress,
    poster,
    hoursPlayed,
    targetHours,
    watchedDate,
    venue,
    notes,
    importedFrom,
    rating,
    review,
    genres,
    runtimeMinutes,
    playedFrom,
    playedTo,
    playedMonth,
    replay,
    dateConfidence,
    needsCheck,
    platform,
  } = req.body;

  if (!title || !type) {
    return res.status(400).json({ error: 'Title and type are required' });
  }

  let finalPoster = poster || '';
  let finalGenres = Array.isArray(genres) ? genres : [];
  let finalRuntime = Number(runtimeMinutes) || 0;

  if (!finalPoster || finalGenres.length === 0 || !finalRuntime) {
    const yearHint = watchedDate ? watchedDate.slice(0, 4) : '';
    const meta = await fetchMetadata(title, type, yearHint, notes || '');
    if (meta) {
      if (!finalPoster && meta.poster) finalPoster = meta.poster;
      if (finalGenres.length === 0 && meta.genres) finalGenres = meta.genres;
      if (!finalRuntime && meta.runtimeMinutes) finalRuntime = meta.runtimeMinutes;
    }
  }

  const newItem = await addMediaItem({
    title: title.trim(),
    type,
    status: status || (replay ? 'rewatch' : 'plan_to_watch'),
    progress: progress || '',
    poster: finalPoster,
    hoursPlayed: Number(hoursPlayed) || 0,
    targetHours: Number(targetHours) || 0,
    watchedDate: watchedDate || playedFrom || '',
    venue: venue || '',
    notes: notes || '',
    importedFrom: importedFrom || 'manual',
    rating: rating !== undefined && rating !== null && rating !== '' ? Number(rating) : null,
    review: review || '',
    genres: finalGenres,
    runtimeMinutes: finalRuntime,
    playedFrom: playedFrom || '',
    playedTo: playedTo || '',
    playedMonth: playedMonth || '',
    replay: Boolean(replay),
    dateConfidence: dateConfidence || '',
    needsCheck: needsCheck || '',
    platform: platform || '',
  });

  res.status(201).json(newItem);
});

// ─────────────────────────────────────────
// POST /api/media/bulk — add MULTIPLE media items
// ─────────────────────────────────────────
router.post('/bulk', async (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array is required' });
  }

  const rawItems = items.map((rawItem) => ({
    title: (rawItem.title || '').trim(),
    type: rawItem.type || 'movie',
    status: rawItem.status || (rawItem.replay ? 'rewatch' : 'completed'),
    progress: rawItem.progress || '',
    poster: rawItem.poster || '',
    hoursPlayed: Number(rawItem.hoursPlayed) || 0,
    targetHours: Number(rawItem.targetHours) || 0,
    watchedDate: rawItem.watchedDate || rawItem.playedFrom || '',
    venue: rawItem.venue || '',
    notes: rawItem.notes || '',
    importedFrom: rawItem.importedFrom || 'bulk_import',
    rating: rawItem.rating !== undefined && rawItem.rating !== null ? Number(rawItem.rating) : null,
    review: rawItem.review || '',
    genres: Array.isArray(rawItem.genres) ? rawItem.genres : [],
    runtimeMinutes: Number(rawItem.runtimeMinutes) || 0,
    playedFrom: rawItem.playedFrom || '',
    playedTo: rawItem.playedTo || '',
    playedMonth: rawItem.playedMonth || '',
    replay: Boolean(rawItem.replay),
    dateConfidence: rawItem.dateConfidence || '',
    needsCheck: rawItem.needsCheck || '',
    platform: rawItem.platform || '',
  }));

  const createdItems = await bulkAddMediaItems(rawItems);
  res.status(201).json({ count: createdItems.length, items: createdItems });

  // Fast background cover resolution worker
  setImmediate(async () => {
    try {
      const needsPosters = createdItems.filter((i) => (!i.poster || (i.genres && i.genres.length === 0)) && i.title);
      const BATCH = 4;
      for (let b = 0; b < needsPosters.length; b += BATCH) {
        const slice = needsPosters.slice(b, b + BATCH);
        await Promise.all(
          slice.map(async (item) => {
            try {
              const meta = await fetchMetadata(
                item.title,
                item.type,
                item.watchedDate ? item.watchedDate.slice(0, 4) : '',
                item.notes || ''
              );
              if (meta) {
                const patchData = {};
                if (!item.poster && meta.poster) patchData.poster = meta.poster;
                if ((!item.genres || item.genres.length === 0) && meta.genres) patchData.genres = meta.genres;
                if (!item.runtimeMinutes && meta.runtimeMinutes) patchData.runtimeMinutes = meta.runtimeMinutes;
                if (Object.keys(patchData).length > 0) {
                  await updateMediaItem(item.id, patchData);
                }
              }
            } catch (e) {}
          })
        );
      }
    } catch (e) {}
  });
});

// ─────────────────────────────────────────
// POST /api/media/refresh-missing — Auto-fix all items that have missing covers
// ─────────────────────────────────────────
router.post('/refresh-missing', async (req, res) => {
  const allMedia = await getAllMedia();
  const force = req.body?.force || req.query?.force === 'true';

  const itemsToFix = allMedia.filter((m) => {
    if (force) return true;
    if (!m.poster || m.poster.trim() === '') return true;
    if (m.type !== 'game' && m.poster.includes('mzstatic.com')) return true;
    if (m.type === 'movie' && m.poster.includes('tvmaze.com')) return true;
    return false;
  });

  let updatedCount = 0;
  const BATCH_SIZE = 4;
  for (let i = 0; i < itemsToFix.length; i += BATCH_SIZE) {
    const batch = itemsToFix.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (item) => {
        try {
          const meta = await fetchMetadata(
            item.title,
            item.type,
            item.watchedDate ? item.watchedDate.slice(0, 4) : ''
          );
          if (meta && meta.poster && meta.poster !== item.poster) {
            await updateMediaItem(item.id, { poster: meta.poster });
            updatedCount++;
          }
        } catch (e) {}
      })
    );
  }

  const refreshedMedia = await getAllMedia();
  res.json({ updated: updatedCount, totalChecked: itemsToFix.length, media: refreshedMedia });
});

// ─────────────────────────────────────────
// PATCH /api/media/:id — UPDATE one item
// ─────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const updates = { ...req.body };

  if (updates.refreshPoster || (!updates.poster && updates.title)) {
    const allMedia = await getAllMedia();
    const current = allMedia.find((m) => m.id === id);
    if (current && (!current.poster || updates.refreshPoster)) {
      const targetTitle = updates.title || current.title;
      const targetType = updates.type || current.type;
      const meta = await fetchMetadata(targetTitle, targetType);
      if (meta && meta.poster) {
        updates.poster = meta.poster;
      }
    }
  }

  delete updates.refreshPoster;
  const updated = await updateMediaItem(id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Item not found' });
  }
  res.json(updated);
});

// ─────────────────────────────────────────
// DELETE /api/media/:id — REMOVE one item
// ─────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const success = await deleteMediaItem(id);
  if (!success) {
    return res.status(404).json({ error: 'Item not found' });
  }
  res.json({ message: 'Deleted successfully' });
});

// ─────────────────────────────────────────
// POST /api/media/bulk-delete — REMOVE multiple items by IDs
// ─────────────────────────────────────────
router.post('/bulk-delete', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Array of ids required' });
  }
  const result = await bulkDeleteMediaItems(ids);
  res.json({
    deletedCount: result.deletedCount,
    remainingTotal: result.media ? result.media.length : 0,
    media: result.media,
  });
});

module.exports = router;
