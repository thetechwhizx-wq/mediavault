// routes/media.js

const express = require('express');
const router = express.Router();
const fs = require('fs');

const DATA_FILE = __dirname + '/../data.json';

function readData() {
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

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

// ─────────────────────────────────────────
// Comprehensive Multi-Source Search
// ─────────────────────────────────────────
async function searchCoverCandidates(query, type = 'movie', year = '', cast = '') {
  const candidates = [];
  const seenPosters = new Set();
  const { baseTitle, seasonHint, yearHint } = cleanMediaTitle(query);
  const targetYear = year || yearHint;
  const searchTitle = baseTitle || query.trim();

  // 1. OMDb API (IMDb Catalog — incredible for Movies, Hollywood & Indian/Global cinema)
  try {
    let omdbUrl = `https://www.omdbapi.com/?s=${encodeURIComponent(searchTitle)}&apikey=trilogy`;
    if (targetYear) omdbUrl += `&y=${encodeURIComponent(targetYear)}`;
    if (type === 'movie' || type === 'show') {
      omdbUrl += `&type=${type === 'show' ? 'series' : 'movie'}`;
    }

    const res = await fetch(omdbUrl);
    if (res.ok) {
      const d = await res.json();
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
    }
  } catch (err) {
    // Continue
  }

  // 2. TVMaze (Specialized for TV Series & Anime)
  if (type === 'show' || candidates.length < 3) {
    try {
      const res = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(searchTitle)}`);
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
              summary: show.summary ? show.summary.replace(/<[^>]+>/g, '').slice(0, 150) + '...' : '',
            });
          }
        }
      }
    } catch (err) {
      // Continue
    }
  }

  // 3. Apple App Store / iTunes (Specialized for Mobile & Desktop Games)
  if (type === 'game' || candidates.length === 0) {
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTitle)}&entity=software&limit=6`);
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
              summary: item.genres ? item.genres.join(', ') : '',
            });
          }
        }
      }
    } catch (err) {
      // Continue
    }
  }

  // 4. If cast was provided or candidates are still empty, try secondary general search
  if (candidates.length === 0 && (cast || searchTitle !== query.trim())) {
    try {
      const fallbackQuery = cast ? `${searchTitle} ${cast}` : query.trim();
      const res = await fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(fallbackQuery)}&apikey=trilogy`);
      if (res.ok) {
        const d = await res.json();
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
              });
            }
          }
        }
      }
    } catch (err) {}
  }

  return candidates;
}

// ─────────────────────────────────────────
// Smart Single Metadata Matcher
// ─────────────────────────────────────────
async function fetchMetadata(rawTitle, type = 'movie', year = '', cast = '') {
  try {
    const candidates = await searchCoverCandidates(rawTitle, type, year, cast);
    if (candidates && candidates.length > 0) {
      // Prioritize matches that match the requested type
      const exactTypeMatch = candidates.find((c) => c.type === type);
      const chosen = exactTypeMatch || candidates[0];
      return {
        poster: chosen.poster,
        year: chosen.year,
        genres: [],
        summary: chosen.summary || '',
      };
    }
    return null;
  } catch (err) {
    console.error('Metadata lookup error:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────
// GET /api/media/candidates — search candidates for user to choose
// ─────────────────────────────────────────
router.get('/candidates', async (req, res) => {
  const { title, type, year, cast } = req.query;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const results = await searchCoverCandidates(title, type || 'movie', year || '', cast || '');
  res.json(results || []);
});

// ─────────────────────────────────────────
// GET /api/media/metadata — live search single match
// ─────────────────────────────────────────
router.get('/metadata', async (req, res) => {
  const { title, type, year, cast } = req.query;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const meta = await fetchMetadata(title, type || 'movie', year || '', cast || '');
  res.json(meta || {});
});

// ─────────────────────────────────────────
// GET /api/media — get ALL media items
// ─────────────────────────────────────────
router.get('/', (req, res) => {
  const data = readData();
  res.json(data.media);
});

// ─────────────────────────────────────────
// POST /api/media — add a NEW media item
// ─────────────────────────────────────────
router.post('/', async (req, res) => {
  const data = readData();
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
  } = req.body;

  if (!title || !type) {
    return res.status(400).json({ error: 'Title and type are required' });
  }

  let finalPoster = poster || '';
  if (!finalPoster) {
    const meta = await fetchMetadata(title, type);
    if (meta && meta.poster) {
      finalPoster = meta.poster;
    }
  }

  const newItem = {
    id: data.nextId++,
    title: title.trim(),
    type: type,
    status: status || 'plan_to_watch',
    progress: progress || '',
    poster: finalPoster,
    hoursPlayed: Number(hoursPlayed) || 0,
    targetHours: Number(targetHours) || 0,
    watchedDate: watchedDate || '',
    venue: venue || '',
    notes: notes || '',
    importedFrom: importedFrom || 'manual',
    rating: null,
    review: '',
    createdAt: new Date().toISOString(),
  };

  data.media.push(newItem);
  saveData(data);

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

  const data = readData();
  const createdItems = [];

  const BATCH_SIZE = 5;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (rawItem) => {
        let finalPoster = rawItem.poster || '';
        if (!finalPoster && rawItem.title) {
          try {
            const meta = await fetchMetadata(
              rawItem.title,
              rawItem.type || 'movie',
              rawItem.watchedDate ? rawItem.watchedDate.slice(0, 4) : ''
            );
            if (meta && meta.poster) {
              finalPoster = meta.poster;
            }
          } catch (e) {}
        }

        const newItem = {
          id: data.nextId++,
          title: (rawItem.title || '').trim(),
          type: rawItem.type || 'movie',
          status: rawItem.status || 'completed',
          progress: rawItem.progress || '',
          poster: finalPoster,
          hoursPlayed: Number(rawItem.hoursPlayed) || 0,
          targetHours: Number(rawItem.targetHours) || 0,
          watchedDate: rawItem.watchedDate || '',
          venue: rawItem.venue || '',
          notes: rawItem.notes || '',
          importedFrom: rawItem.importedFrom || 'bulk_import',
          rating: rawItem.rating || null,
          review: rawItem.review || '',
          createdAt: new Date().toISOString(),
        };

        data.media.push(newItem);
        createdItems.push(newItem);
      })
    );
  }

  saveData(data);
  res.status(201).json({ count: createdItems.length, items: createdItems });
});

// ─────────────────────────────────────────
// POST /api/media/refresh-missing — Auto-fix all items that have missing covers
// ─────────────────────────────────────────
router.post('/refresh-missing', async (req, res) => {
  const data = readData();
  const missingItems = data.media.filter((m) => !m.poster || m.poster === '');
  let updatedCount = 0;

  const BATCH_SIZE = 5;
  for (let i = 0; i < missingItems.length; i += BATCH_SIZE) {
    const batch = missingItems.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (item) => {
        try {
          const meta = await fetchMetadata(
            item.title,
            item.type,
            item.watchedDate ? item.watchedDate.slice(0, 4) : ''
          );
          if (meta && meta.poster) {
            item.poster = meta.poster;
            updatedCount++;
          }
        } catch (e) {}
      })
    );
  }

  if (updatedCount > 0) {
    saveData(data);
  }

  res.json({ updated: updatedCount, totalChecked: missingItems.length, media: data.media });
});

// ─────────────────────────────────────────
// PATCH /api/media/:id — UPDATE one item
// ─────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  const data = readData();
  const id = parseInt(req.params.id);
  const item = data.media.find((m) => m.id === id);

  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  if (req.body.refreshPoster || (!item.poster && req.body.title)) {
    const targetTitle = req.body.title || item.title;
    const targetType = req.body.type || item.type;
    const meta = await fetchMetadata(targetTitle, targetType);
    if (meta && meta.poster) {
      req.body.poster = meta.poster;
    }
  }

  delete req.body.refreshPoster;
  Object.assign(item, req.body);

  saveData(data);
  res.json(item);
});

// ─────────────────────────────────────────
// DELETE /api/media/:id — REMOVE one item
// ─────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const data = readData();
  const id = parseInt(req.params.id);

  data.media = data.media.filter((m) => m.id !== id);
  saveData(data);
  res.json({ message: 'Deleted successfully' });
});

module.exports = router;