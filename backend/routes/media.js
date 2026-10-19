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
// Helper: Automated poster & metadata fetcher
// ─────────────────────────────────────────
async function fetchMetadata(title, type) {
  try {
    const cleanTitle = title.trim();

    // 1. Shows / Series -> TVMaze (free, rich posters & details, no key needed)
    if (type === 'show') {
      const res = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(cleanTitle)}`);
      if (res.ok) {
        const data = await res.json();
        return {
          poster: data?.image?.original || data?.image?.medium || '',
          genres: data?.genres || [],
          year: data?.premiered ? data.premiered.slice(0, 4) : '',
          summary: data?.summary ? data.summary.replace(/<[^>]+>/g, '').trim() : ''
        };
      }
    }

    // 2. Mobile / Desktop Games -> iTunes App Store API (specialized for mobile games, free, high-res 512px icon)
    if (type === 'game') {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanTitle)}&entity=software&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.resultCount > 0 && data.results[0]) {
          const item = data.results[0];
          return {
            poster: item.artworkUrl512 || item.artworkUrl100 || '',
            genres: item.genres || [],
            year: item.releaseDate ? item.releaseDate.slice(0, 4) : '',
            summary: item.description ? item.description.slice(0, 200) + '...' : ''
          };
        }
      }
    }

    // 3. Movies & Fallback -> TVMaze show/mini-series search or fallback
    const res = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(cleanTitle)}`);
    if (res.ok) {
      const list = await res.json();
      if (list && list.length > 0 && list[0]?.show?.image) {
        const item = list[0].show;
        return {
          poster: item?.image?.original || item?.image?.medium || '',
          genres: item?.genres || [],
          year: item?.premiered ? item.premiered.slice(0, 4) : '',
          summary: item?.summary ? item.summary.replace(/<[^>]+>/g, '').trim() : ''
        };
      }
    }

    return null;
  } catch (err) {
    console.error('Metadata lookup error:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────
// GET /api/media/metadata — live search preview
// ─────────────────────────────────────────
router.get('/metadata', async (req, res) => {
  const { title, type } = req.query;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const meta = await fetchMetadata(title, type || 'movie');
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
    importedFrom
  } = req.body;

  if (!title || !type) {
    return res.status(400).json({ error: 'Title and type are required' });
  }

  // If poster wasn't explicitly supplied, auto-fetch from APIs
  let finalPoster = poster || '';
  if (!finalPoster) {
    const meta = await fetchMetadata(title, type);
    if (meta && meta.poster) {
      finalPoster = meta.poster;
    }
  }

  const newItem = {
    id: data.nextId,
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
    createdAt: new Date().toISOString()
  };

  data.media.push(newItem);
  data.nextId++;
  saveData(data);

  res.status(201).json(newItem);
});

// ─────────────────────────────────────────
// POST /api/media/bulk — add MULTIPLE media items (e.g. from notes import)
// ─────────────────────────────────────────
router.post('/bulk', async (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array is required' });
  }

  const data = readData();
  const createdItems = [];

  // Concurrency helper: process items in batches of 4 for fast poster fetching without throttling
  const BATCH_SIZE = 4;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (rawItem) => {
        let finalPoster = rawItem.poster || '';
        if (!finalPoster && rawItem.title) {
          try {
            const meta = await fetchMetadata(rawItem.title, rawItem.type || 'movie');
            if (meta && meta.poster) {
              finalPoster = meta.poster;
            }
          } catch (e) {
            // Ignore failure and continue
          }
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
          createdAt: new Date().toISOString()
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
// PATCH /api/media/:id — UPDATE one item
// ─────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  const data = readData();
  const id = parseInt(req.params.id);
  const item = data.media.find(m => m.id === id);

  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  // If title/type changed or poster requested and empty, fetch poster
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

  data.media = data.media.filter(m => m.id !== id);
  saveData(data);
  res.json({ message: 'Deleted successfully' });
});

module.exports = router;