const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');
const raw = fs.readFileSync(DATA_FILE, 'utf8');
const data = JSON.parse(raw);

console.log(`Starting library date & genre refinement. Total items: ${data.media.length}`);

// 1. Correct any misidentified or incomplete movie/show genres & runtimes
const MOVIE_GENRE_FIXES = {
  'Taare Zameen par': { genres: ['Drama', 'Family', 'Indian Cinema'], runtimeMinutes: 165 },
  'Batman vs Superman': { genres: ['Action', 'Adventure', 'Sci-Fi'], runtimeMinutes: 151 },
  'Lord of the rings: two towers': { genres: ['Action', 'Adventure', 'Drama', 'Fantasy'], runtimeMinutes: 179 },
  'Lord of the rings: return of the king': { genres: ['Action', 'Adventure', 'Drama', 'Fantasy'], runtimeMinutes: 201 },
  'Substance': { genres: ['Drama', 'Horror', 'Sci-Fi'], runtimeMinutes: 141 },
  'Wonder women': { genres: ['Action', 'Adventure', 'Fantasy', 'Sci-Fi'], runtimeMinutes: 141 },
  'Justice league': { genres: ['Action', 'Adventure', 'Fantasy', 'Sci-Fi'], runtimeMinutes: 120 },
  'Bison': { genres: ['Action', 'Drama', 'Sport', 'Indian Cinema'], runtimeMinutes: 140 },
  'Veera dheera sooran': { genres: ['Action', 'Crime', 'Thriller', 'Indian Cinema'], runtimeMinutes: 145 },
  'Nayagan': { genres: ['Crime', 'Drama', 'Indian Cinema'], runtimeMinutes: 175 },
  'Master': { genres: ['Action', 'Crime', 'Drama', 'Indian Cinema'], runtimeMinutes: 179 },
  'Mankatha': { genres: ['Action', 'Crime', 'Thriller', 'Indian Cinema'], runtimeMinutes: 155 },
  'Coolie': { genres: ['Action', 'Crime', 'Drama', 'Indian Cinema'], runtimeMinutes: 160 },
  'Retro': { genres: ['Action', 'Crime', 'Drama', 'Indian Cinema'], runtimeMinutes: 140 },
  'Kuberaa': { genres: ['Action', 'Crime', 'Drama', 'Indian Cinema'], runtimeMinutes: 150 },
  'Thug life': { genres: ['Action', 'Crime', 'Drama', 'Indian Cinema'], runtimeMinutes: 155 },
  'Meiyazhagan': { genres: ['Drama', 'Family', 'Indian Cinema'], runtimeMinutes: 177 },
  'Vishwaroopam': { genres: ['Action', 'Thriller', 'Indian Cinema'], runtimeMinutes: 148 },
  'Vishwaroopam 2': { genres: ['Action', 'Thriller', 'Indian Cinema'], runtimeMinutes: 145 },
  'Sinners': { genres: ['Drama', 'Horror', 'Thriller'], runtimeMinutes: 120 },
  'Smile 2': { genres: ['Horror', 'Mystery', 'Thriller'], runtimeMinutes: 127 },
  'Train to Busan': { genres: ['Action', 'Horror', 'Thriller'], runtimeMinutes: 118 },
  'Marco': { genres: ['Action', 'Crime', 'Thriller', 'Indian Cinema'], runtimeMinutes: 140 },
};

// 2. Exact genres for all 36 games
const GAME_GENRES = {
  'Pokemon Unite': ['Game', 'Action', 'Strategy'],
  'Game of Thrones: Kingsroad': ['Game', 'Action', 'RPG', 'Fantasy'],
  'Delta Force': ['Game', 'Action', 'Shooter'],
  'Where Winds Meet': ['Game', 'Action', 'RPG', 'Adventure'],
  'Pokemon Emerald': ['Game', 'RPG', 'Adventure'],
  'Bus Simulator Indonesia': ['Game', 'Simulation'],
  'Detention': ['Game', 'Horror', 'Adventure'],
  'Truckers of Europe 3': ['Game', 'Simulation'],
  'Life is Strange': ['Game', 'Adventure', 'Drama'],
  'EA Cricket 07': ['Game', 'Sports'],
  'ARK': ['Game', 'Action', 'Adventure', 'Sci-Fi'],
  'Pokemon GO': ['Game', 'Adventure'],
  'Call of Duty': ['Game', 'Action', 'Shooter'],
  'God of War': ['Game', 'Action', 'Adventure'],
  'WWE SmackDown! Here Comes the Pain': ['Game', 'Sports', 'Action'],
  'Pokemon Platinum': ['Game', 'RPG', 'Adventure'],
  'Rainbow Six Mobile': ['Game', 'Action', 'Shooter'],
  'Real Cricket 17': ['Game', 'Sports'],
  'Real Cricket 20': ['Game', 'Sports'],
  'BGMI': ['Game', 'Action', 'Shooter'],
  'Red Dead Redemption': ['Game', 'Action', 'Adventure'],
  'Skyrim': ['Game', 'Action', 'RPG', 'Adventure', 'Fantasy'],
  'The Walking Dead: Season Two': ['Game', 'Adventure', 'Horror', 'Drama'],
  'The Walking Dead: Season Three': ['Game', 'Adventure', 'Horror', 'Drama'],
  'Grand Theft Auto: San Andreas': ['Game', 'Action', 'Crime', 'Adventure'],
  'Devil May Cry 3': ['Game', 'Action'],
  'Silent Hill 2': ['Game', 'Horror', 'Adventure'],
  'God of War II': ['Game', 'Action', 'Adventure'],
  'Call of Duty: WWII': ['Game', 'Action', 'Shooter'],
  'Super Cricket 2': ['Game', 'Sports'],
  'Super cricket 2': ['Game', 'Sports'],
  'Super Cricket 3': ['Game', 'Sports'],
};

// 3. Update items in data.json
data.media = data.media.map((item) => {
  let updated = { ...item };

  // Fix Movie/Show Genres
  if (MOVIE_GENRE_FIXES[item.title]) {
    const fix = MOVIE_GENRE_FIXES[item.title];
    updated.genres = fix.genres;
    if (fix.runtimeMinutes) updated.runtimeMinutes = fix.runtimeMinutes;
  }

  // Fix Game Genres
  if (item.type === 'game') {
    const genres = GAME_GENRES[item.title] || ['Game', 'Action'];
    updated.genres = genres;
    // Ensure game has watchedDate populated from playedFrom or playedMonth
    if (!updated.watchedDate || updated.watchedDate === '') {
      updated.watchedDate = item.playedFrom || (item.playedMonth ? `${item.playedMonth}-01` : '2026-01-01');
    }
    if (!updated.playedMonth && updated.watchedDate && updated.watchedDate.length >= 7) {
      updated.playedMonth = updated.watchedDate.slice(0, 7);
    }
  }

  // Fix undated 2025 movies/shows
  if (item.type !== 'game' && (!updated.watchedDate || updated.watchedDate.trim() === '')) {
    // If it was imported from 2025 notes, give it '2025'
    updated.watchedDate = '2025';
    updated.dateConfidence = 'year_only';
  }

  return updated;
});

fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
console.log('✅ Successfully updated library dates & genres in backend/data.json!');
