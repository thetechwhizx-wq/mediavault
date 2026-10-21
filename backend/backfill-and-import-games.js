require('dotenv').config({ path: __dirname + '/.env' });
const fs = require('fs');
const path = require('path');
const { getAllMedia, addMediaItem, updateMediaItem } = require('./db');

const GAMES_TO_IMPORT = [
  {"title": "Pokemon Unite", "type": "game", "playedFrom": null, "playedTo": null, "playedMonth": "2026-01", "watchedDate": "", "notes": "", "replay": false, "dateConfidence": "month_only", "importedFrom": "game_log_2026"},
  {"title": "Game of Thrones: Kingsroad", "type": "game", "playedFrom": "2026-01-04", "playedTo": "2026-01-06", "playedMonth": "2026-01", "watchedDate": "2026-01-04", "notes": "Promising but not optimised enough", "replay": false, "dateConfidence": "exact", "importedFrom": "game_log_2026"},
  {"title": "Delta Force", "type": "game", "playedFrom": "2026-01-06", "playedTo": "2026-01-16", "playedMonth": "2026-01", "watchedDate": "2026-01-06", "notes": "Was good, skill-based matchmaking", "replay": false, "dateConfidence": "exact", "importedFrom": "game_log_2026"},
  {"title": "Where Winds Meet", "type": "game", "playedFrom": "2026-01-17", "playedTo": null, "playedMonth": "2026-01", "watchedDate": "2026-01-17", "notes": "Looks good; battery / interest", "replay": false, "dateConfidence": "exact", "importedFrom": "game_log_2026"},
  {"title": "Pokemon Emerald", "type": "game", "playedFrom": "2026-01-19", "playedTo": null, "playedMonth": "2026-01", "watchedDate": "2026-01-19", "notes": "Obsessed", "replay": false, "dateConfidence": "exact", "importedFrom": "game_log_2026"},
  {"title": "Bus Simulator Indonesia", "type": "game", "playedFrom": "2026-01-27", "playedTo": null, "playedMonth": "2026-01", "watchedDate": "2026-01-27", "notes": "Chill, mobile graphics", "replay": false, "dateConfidence": "exact", "importedFrom": "game_log_2026"},
  {"title": "Detention", "type": "game", "playedFrom": "2026-02-02", "playedTo": null, "playedMonth": "2026-02", "watchedDate": "2026-02-02", "notes": "Nothing special, not appealing", "replay": false, "dateConfidence": "exact", "importedFrom": "game_log_2026"},
  {"title": "Truckers of Europe 3", "type": "game", "playedFrom": "2026-02-12", "playedTo": null, "playedMonth": "2026-02", "watchedDate": "2026-02-12", "notes": "Boring routes, trailer bugs", "replay": false, "dateConfidence": "exact", "importedFrom": "game_log_2026"},
  {"title": "Life is Strange", "type": "game", "playedFrom": null, "playedTo": null, "playedMonth": "2026-02", "watchedDate": "", "notes": "Good", "replay": false, "dateConfidence": "month_only", "importedFrom": "game_log_2026"},
  {"title": "EA Cricket 07", "type": "game", "playedFrom": null, "playedTo": null, "playedMonth": "2026-02", "watchedDate": "", "notes": "Nice", "replay": false, "dateConfidence": "month_only", "importedFrom": "game_log_2026"},
  {"title": "ARK", "type": "game", "playedFrom": null, "playedTo": null, "playedMonth": "2026-02", "watchedDate": "", "notes": "Meh", "replay": false, "dateConfidence": "month_only", "importedFrom": "game_log_2026"},
  {"title": "Pokemon GO", "type": "game", "playedFrom": null, "playedTo": null, "playedMonth": "2026-02", "watchedDate": "", "notes": "", "replay": false, "dateConfidence": "month_only", "importedFrom": "game_log_2026"},
  {"title": "Pokemon Unite", "type": "game", "playedFrom": "2026-02-25", "playedTo": null, "playedMonth": "2026-02", "watchedDate": "2026-02-25", "notes": "", "replay": true, "dateConfidence": "exact", "importedFrom": "game_log_2026", "needsCheck": "Second Pokemon Unite entry (first was January). Confirm it is a return/replay."},
  {"title": "Call of Duty", "type": "game", "playedFrom": "2026-03-09", "playedTo": null, "playedMonth": "2026-03", "watchedDate": "2026-03-09", "notes": "Boring", "replay": false, "dateConfidence": "exact", "importedFrom": "game_log_2026", "needsCheck": "Which Call of Duty? (mobile / other)"},
  {"title": "God of War", "type": "game", "playedFrom": "2026-03-12", "playedTo": null, "playedMonth": "2026-03", "watchedDate": "2026-03-12", "notes": "It's gooood", "replay": false, "dateConfidence": "exact", "importedFrom": "game_log_2026"},
  {"title": "WWE SmackDown! Here Comes the Pain", "type": "game", "playedFrom": "2026-03-12", "playedTo": null, "playedMonth": "2026-03", "watchedDate": "2026-03-12", "notes": "Is gooood", "replay": false, "dateConfidence": "exact", "importedFrom": "game_log_2026"},
  {"title": "Pokemon Platinum", "type": "game", "playedFrom": "2026-03-18", "playedTo": null, "playedMonth": "2026-03", "watchedDate": "2026-03-18", "notes": "Stopped playing: lost interest in watching Pokemon and didn't complete the season the game is based on", "replay": false, "dateConfidence": "exact", "importedFrom": "game_log_2026", "status": "dropped"},
  {"title": "Rainbow Six Mobile", "type": "game", "playedFrom": null, "playedTo": null, "playedMonth": "2026-03", "watchedDate": "", "notes": "Good, but a lot of sweaty lobbies", "replay": false, "dateConfidence": "month_only", "importedFrom": "game_log_2026"},
  {"title": "Real Cricket 17", "type": "game", "playedFrom": null, "playedTo": null, "playedMonth": "2026-04", "watchedDate": "", "notes": "Addicted", "replay": false, "dateConfidence": "inferred_month", "importedFrom": "game_log_2026", "needsCheck": "Month inferred from grouping (between March and June); confirm April. Title assumed Real Cricket 17."},
  {"title": "Real Cricket 20", "type": "game", "playedFrom": null, "playedTo": null, "playedMonth": "2026-04", "watchedDate": "", "notes": "Mm", "replay": false, "dateConfidence": "inferred_month", "importedFrom": "game_log_2026", "needsCheck": "Month inferred from grouping; confirm April. Title assumed Real Cricket 20."},
  {"title": "BGMI", "type": "game", "playedFrom": null, "playedTo": null, "playedMonth": "2026-05", "watchedDate": "", "notes": "A lot of sweaty lobbies and have to grind", "replay": false, "dateConfidence": "inferred_month", "importedFrom": "game_log_2026", "needsCheck": "Month inferred from grouping; confirm May."},
  {"title": "Red Dead Redemption", "type": "game", "playedFrom": "2026-06-03", "playedTo": "2026-06-22", "playedMonth": "2026-06", "watchedDate": "2026-06-03", "notes": "Loved it, peak. Main story 3-19 June, DLC until 22 June", "replay": false, "dateConfidence": "exact", "importedFrom": "game_log_2026", "needsCheck": "Confirm this is Red Dead Redemption (1), since the DLC mention fits Undead Nightmare, not RDR2."},
  {"title": "Skyrim", "type": "game", "playedFrom": "2026-06-10", "playedTo": null, "playedMonth": "2026-06", "watchedDate": "2026-06-10", "notes": "Could have had a better experience on PC", "replay": false, "dateConfidence": "exact", "importedFrom": "game_log_2026"},
  {"title": "The Walking Dead: Season Two", "type": "game", "playedFrom": "2026-06-22", "playedTo": "2026-06-23", "playedMonth": "2026-06", "watchedDate": "2026-06-22", "notes": "Peak", "replay": false, "dateConfidence": "exact", "importedFrom": "game_log_2026"},
  {"title": "The Walking Dead: Season Three", "type": "game", "playedFrom": "2026-06-24", "playedTo": "2026-06-26", "playedMonth": "2026-06", "watchedDate": "2026-06-24", "notes": "Peak", "replay": false, "dateConfidence": "exact", "importedFrom": "game_log_2026"},
  {"title": "Grand Theft Auto: San Andreas", "type": "game", "playedFrom": "2026-06-26", "playedTo": null, "playedMonth": "2026-06", "watchedDate": "2026-06-26", "notes": "Mediocre, feels outdated", "replay": false, "dateConfidence": "exact", "importedFrom": "game_log_2026", "needsCheck": "Log says end date 09/06, which is before the 26/06 start. Likely 09/07; confirm."},
  {"title": "Devil May Cry 3", "type": "game", "playedFrom": "2026-07-13", "playedTo": "2026-07-14", "playedMonth": "2026-07", "watchedDate": "2026-07-13", "notes": "Too sweaty, and no controller makes it tough", "replay": false, "dateConfidence": "exact", "importedFrom": "game_log_2026"},
  {"title": "Silent Hill 2", "type": "game", "playedFrom": "2026-07-14", "playedTo": "2026-07-18", "playedMonth": "2026-07", "watchedDate": "2026-07-14", "notes": "Outdated", "replay": false, "dateConfidence": "exact", "importedFrom": "game_log_2026"},
  {"title": "God of War II", "type": "game", "playedFrom": "2026-07-15", "playedTo": "2026-07-22", "playedMonth": "2026-07", "watchedDate": "2026-07-15", "notes": "", "replay": false, "dateConfidence": "exact", "importedFrom": "game_log_2026"},
  {"title": "Call of Duty: WWII", "type": "game", "playedFrom": "2026-07-23", "playedTo": null, "playedMonth": "2026-07", "watchedDate": "2026-07-23", "notes": "", "replay": false, "dateConfidence": "exact", "importedFrom": "game_log_2026"},
  {"title": "BGMI", "type": "game", "playedFrom": null, "playedTo": null, "playedMonth": "2026-07", "watchedDate": "", "notes": "", "replay": true, "dateConfidence": "inferred_month", "importedFrom": "game_log_2026", "needsCheck": "Undated mention in the July group; confirm month and that it is a return to BGMI."},
  {"title": "Bus Simulator Indonesia", "type": "game", "playedFrom": null, "playedTo": null, "playedMonth": "2026-07", "watchedDate": "", "notes": "", "replay": true, "dateConfidence": "inferred_month", "importedFrom": "game_log_2026", "needsCheck": "Undated mention in the July group; confirm month and that it is a return to BUSSID."},
  {"title": "Super Cricket 2", "type": "game", "playedFrom": null, "playedTo": null, "playedMonth": null, "watchedDate": "", "notes": "", "replay": false, "dateConfidence": "unknown", "importedFrom": "game_log_2026", "needsCheck": "No date. Listed after July entries and before October."},
  {"title": "Super Cricket 3", "type": "game", "playedFrom": "2026-10-02", "playedTo": null, "playedMonth": "2026-10", "watchedDate": "2026-10-02", "notes": "", "replay": false, "dateConfidence": "exact", "importedFrom": "game_log_2026"},
  {"title": "Pokemon Platinum", "type": "game", "playedFrom": "2026-10-03", "playedTo": null, "playedMonth": "2026-10", "watchedDate": "2026-10-03", "notes": "", "replay": true, "dateConfidence": "exact", "importedFrom": "game_log_2026"}
];

async function run() {
  console.log('🚀 Starting Data Backfill & Games Ingestion...');
  const allMedia = await getAllMedia();
  console.log(`Found ${allMedia.length} existing items in media library.`);

  // 1. Ingest Games
  console.log('\n🎮 Ingesting 35 Game Log entries...');
  let importedGames = 0;
  for (const g of GAMES_TO_IMPORT) {
    // Check if exact same entry already exists
    const exists = allMedia.find(
      (m) =>
        m.type === 'game' &&
        m.title.toLowerCase() === g.title.toLowerCase() &&
        (m.playedMonth === g.playedMonth || m.watchedDate === (g.watchedDate || g.playedFrom || ''))
    );

    if (!exists) {
      await addMediaItem({
        title: g.title,
        type: 'game',
        status: g.status || (g.replay ? 'rewatch' : 'completed'),
        progress: '',
        poster: '',
        hoursPlayed: 0,
        targetHours: 0,
        watchedDate: g.watchedDate || g.playedFrom || (g.playedMonth ? `${g.playedMonth}-01` : ''),
        venue: '',
        notes: g.notes || '',
        importedFrom: g.importedFrom || 'game_log_2026',
        rating: null,
        review: '',
        genres: ['Game'],
        runtimeMinutes: 0,
        playedFrom: g.playedFrom || '',
        playedTo: g.playedTo || '',
        playedMonth: g.playedMonth || '',
        replay: Boolean(g.replay),
        dateConfidence: g.dateConfidence || '',
        needsCheck: g.needsCheck || '',
        platform: '',
      });
      importedGames++;
    }
  }
  console.log(`✅ Ingested ${importedGames} new games into library!`);

  // 2. Backfill Genres & Runtimes for existing Movies and Shows
  console.log('\n🎬 Backfilling genres & runtimes for movies and shows...');
  const refreshedMedia = await getAllMedia();
  let updatedCount = 0;

  for (const item of refreshedMedia) {
    if (item.type === 'game') continue;
    const hasGenres = Array.isArray(item.genres) && item.genres.length > 0;
    const hasRuntime = Number(item.runtimeMinutes) > 0;

    if (!hasGenres || !hasRuntime) {
      try {
        let genres = item.genres || [];
        let runtimeMinutes = item.runtimeMinutes || 0;

        if (item.type === 'movie' || item.type === 'show') {
          const omdbRes = await fetch(
            `https://www.omdbapi.com/?t=${encodeURIComponent(item.title)}&apikey=trilogy`,
            { signal: AbortSignal.timeout(3500) }
          );
          if (omdbRes.ok) {
            const data = await omdbRes.json();
            if (data.Response !== 'False') {
              if ((!genres || genres.length === 0) && data.Genre && data.Genre !== 'N/A') {
                genres = data.Genre.split(',').map((s) => s.trim());
              }
              if (!runtimeMinutes && data.Runtime && data.Runtime !== 'N/A') {
                const parsed = parseInt(data.Runtime, 10);
                if (!isNaN(parsed)) runtimeMinutes = parsed;
              }
            }
          }
        }

        if (item.type === 'show' && (!genres.length || !runtimeMinutes)) {
          const tvRes = await fetch(
            `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(item.title)}`,
            { signal: AbortSignal.timeout(3500) }
          );
          if (tvRes.ok) {
            const tvData = await tvRes.json();
            if ((!genres || genres.length === 0) && tvData.genres && tvData.genres.length > 0) {
              genres = tvData.genres;
            }
            if (!runtimeMinutes && (tvData.averageRuntime || tvData.runtime)) {
              runtimeMinutes = tvData.averageRuntime || tvData.runtime;
            }
          }
        }

        if (genres.length > 0 || runtimeMinutes > 0) {
          await updateMediaItem(item.id, {
            genres,
            runtimeMinutes,
          });
          updatedCount++;
          console.log(`  ✓ Updated "${item.title}": Genres: [${genres.join(', ')}], Runtime: ${runtimeMinutes}m`);
        }
      } catch (err) {
        // Continue
      }
    }
  }

  console.log(`\n🎉 Backfill complete! Updated ${updatedCount} items with genres and real runtimes.`);
  process.exit(0);
}

run().catch((e) => {
  console.error('Error running script:', e);
  process.exit(1);
});
