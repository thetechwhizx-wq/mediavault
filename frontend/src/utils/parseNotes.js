// utils/parseNotes.js

const MONTH_MAP = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  january: '01', february: '02', march: '03', april: '04',
  june: '06', july: '07', august: '08', september: '09',
  october: '10', november: '11', december: '12',
};

export function detectSectionHeader(line) {
  // Normalize non-breaking spaces and trim
  const clean = line.replace(/[\u00a0\s]+/g, ' ').trim();

  // Match: Movies 2025, Movie 2024, 2025 Movies, Movies(2025)
  let m = clean.match(/(?:movies?|films?)\s*\(?(\d{4})\)?/i) || clean.match(/\(?(\d{4})\)?\s*(?:movies?|films?)/i);
  if (m) return { type: 'movie', year: m[1] };

  // Match: SHOWS/SERIES/ANIME(2025), TV Shows 2024, Series 2025, Anime 2025
  m = clean.match(/(?:shows?|series|anime|tv)\s*\(?(\d{4})\)?/i) || clean.match(/\(?(\d{4})\)?\s*(?:shows?|series|anime|tv)/i);
  if (m) return { type: 'show', year: m[1] };

  // Match: Games 2025, Gaming 2024, 2025 Games
  m = clean.match(/(?:games?|gaming)\s*\(?(\d{4})\)?/i) || clean.match(/\(?(\d{4})\)?\s*(?:games?|gaming)/i);
  if (m) return { type: 'game', year: m[1] };

  return null;
}

export function parseDateFromEntry(text, sectionYear) {
  // Match (DD/MM), (D/M), (D/MM), (DD/M) e.g. (13/02), (5/09), (7/12)
  const numericDate = text.match(/\((\d{1,2})\/(\d{1,2})\)/);
  if (numericDate) {
    const day = numericDate[1].padStart(2, '0');
    const month = numericDate[2].padStart(2, '0');
    return {
      dateStr: `${sectionYear}-${month}-${day}`,
      rawMatch: numericDate[0],
    };
  }

  // Match (DD/monthname) e.g. (15/mar), (12/apr), (4/dec)
  const dayMonthName = text.match(/\((\d{1,2})\/([a-z]+)\)/i);
  if (dayMonthName) {
    const day = dayMonthName[1].padStart(2, '0');
    const monthKey = dayMonthName[2].toLowerCase();
    const month = MONTH_MAP[monthKey];
    if (month) {
      return {
        dateStr: `${sectionYear}-${month}-${day}`,
        rawMatch: dayMonthName[0],
      };
    }
  }

  // Match (monthname) only e.g. (apr), (march)
  const monthOnly = text.match(/\(([a-z]{3,})\)/i);
  if (monthOnly) {
    const monthKey = monthOnly[1].toLowerCase();
    const month = MONTH_MAP[monthKey];
    if (month) {
      return {
        dateStr: `${sectionYear}-${month}`,
        rawMatch: monthOnly[0],
      };
    }
  }

  return null;
}

export function parseNotes(rawText, defaultType = 'movie') {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/);
  const entries = [];

  let currentType = defaultType;
  let currentYear = new Date().getFullYear().toString();

  for (let i = 0; i < lines.length; i++) {
    let rawLine = lines[i];

    // Normalize Unicode non-breaking spaces (\u00a0) and trim
    let line = rawLine.replace(/\u00a0/g, ' ').trim();
    if (!line) continue;

    // Check for section headers (e.g. Movies 2025, SHOWS/SERIES/ANIME(2025), Games 2026)
    const header = detectSectionHeader(line);
    if (header) {
      currentType = header.type;
      currentYear = header.year;
      continue;
    }

    // Skip divider lines (e.g. ---, ===)
    if (/^[-=_*~]{2,}$/.test(line)) continue;

    // Detect if line starts with a standalone dot (e.g. ". Boys") -> indicates Rewatch!
    const isRewatchDot = /^\.\s*[a-zA-Z0-9]/i.test(line);

    // Strip leading number + dot (e.g. "1.", "12.", "22.", or just ".")
    let working = line.replace(/^\d*\.\s*/, '').trim();
    if (!working) continue;

    // Detect playtime / hours in parens: e.g. (35h), (12.5 hrs), (20 hours)
    let hoursPlayed = 0;
    const hoursMatch = working.match(/\((\d+(?:\.\d+)?)\s*(?:hrs?|hours?|h)\)/i);
    if (hoursMatch) {
      hoursPlayed = parseFloat(hoursMatch[1]) || 0;
      working = working.replace(hoursMatch[0], '').trim();
    }

    // Detect hardware platform in parens: e.g. (PC), (Steam Deck), (Mobile), (PS5), (PlayStation), (Switch)
    let platform = '';
    const platMatch = working.match(/\((pc|steam(?:\s*deck)?|mobile|ios|android|ps[245]|playstation(?:\s*[245])?|switch|nintendo(?:\s*switch|\s*ds)?|xbox(?:\s*one|\s*series\s*[xs])?|gba)\)/i);
    if (platMatch) {
      const rawPlat = platMatch[1].toLowerCase();
      if (/steam\s*deck/i.test(rawPlat)) platform = 'Steam Deck';
      else if (/pc|steam/i.test(rawPlat)) platform = 'PC';
      else if (/mobile|ios|android/i.test(rawPlat)) platform = 'Mobile';
      else if (/ps[245]|playstation/i.test(rawPlat)) platform = 'PlayStation';
      else if (/switch|nintendo|ds/i.test(rawPlat)) platform = 'Nintendo';
      else if (/xbox/i.test(rawPlat)) platform = 'Xbox';
      else if (/gba/i.test(rawPlat)) platform = 'GBA';
      else platform = platMatch[1];
      working = working.replace(platMatch[0], '').trim();
    }

    // Detect theatre/cinema venue flags: (theatre), (theater), (imax), (cinema)
    let venue = '';
    if (/\((?:theatre|theater|imax|cinema)\)/i.test(working)) {
      venue = 'theatre';
      working = working.replace(/\s*\((?:theatre|theater|imax|cinema)\)/gi, '').trim();
    }

    // Detect notes such as (not finished), (rewatch), (incomplete), (dropped)
    let notes = isRewatchDot ? 'Rewatch' : '';
    const notesMatch = working.match(/\((not finished|rewatch(?:ed)?|incomplete|dropped|dnf|in progress|now playing)\)/i);
    if (notesMatch) {
      const parsedNote = notesMatch[1];
      notes = notes ? `${notes}, ${parsedNote}` : parsedNote;
      working = working.replace(notesMatch[0], '').trim();
    }

    // Detect "Restarted ..." prefix
    let restarted = false;
    if (/^restarted\s+/i.test(working)) {
      restarted = true;
      notes = notes ? `${notes}, Restarted` : 'Restarted';
      working = working.replace(/^restarted\s+/i, '').trim();
    }

    // Extract date
    let watchedDate = '';
    const dateResult = parseDateFromEntry(working, currentYear);
    if (dateResult) {
      watchedDate = dateResult.dateStr;
      working = working.replace(dateResult.rawMatch, '').trim();
    }

    // Clean up title: collapse multiple spaces and remove orphaned parens
    let title = working
      .replace(/\(\s*\)/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!title) continue;

    // Determine initial status based on notes
    let status = 'completed';
    if (isRewatchDot || /rewatch/i.test(notes)) {
      status = 'rewatch';
    } else if (/not finished|incomplete|dropped|dnf/i.test(notes)) {
      status = 'dropped';
    } else if (restarted || /in progress|now playing/i.test(notes)) {
      status = 'in_progress';
    }

    entries.push({
      title,
      type: currentType,
      status,
      watchedDate,
      venue,
      notes,
      platform: platform || (currentType === 'game' ? 'Mobile' : ''),
      hoursPlayed: Number(hoursPlayed) || 0,
      progress: '',
      importedFrom: 'bulk_import',
      include: true,
    });
  }

  return entries;
}

export default parseNotes;
