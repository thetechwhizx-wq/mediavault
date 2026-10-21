const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');
const raw = fs.readFileSync(DATA_FILE, 'utf8');
const data = JSON.parse(raw);

console.log(`Initial total items in data.json: ${data.media.length}`);

// Curated genres & runtimes for movies and shows in MediaVault
const GENRE_OVERRIDES = {
  // Shows
  'Modern Family': { genres: ['Comedy', 'Romance', 'Drama'], runtimeMinutes: 22 },
  'WEDNESDAY': { genres: ['Comedy', 'Crime', 'Fantasy', 'Mystery'], runtimeMinutes: 45 },
  'Wednesday s2': { genres: ['Comedy', 'Crime', 'Fantasy', 'Mystery'], runtimeMinutes: 45 },
  'The Boys': { genres: ['Action', 'Comedy', 'Crime', 'Sci-Fi'], runtimeMinutes: 60 },
  'Vikings': { genres: ['Action', 'Adventure', 'Drama', 'History'], runtimeMinutes: 44 },
  'Squid games S2': { genres: ['Action', 'Drama', 'Mystery', 'Thriller'], runtimeMinutes: 55 },
  'Squid games season 3': { genres: ['Action', 'Drama', 'Mystery', 'Thriller'], runtimeMinutes: 55 },
  'Defenders': { genres: ['Action', 'Adventure', 'Crime', 'Sci-Fi'], runtimeMinutes: 50 },
  'Daredevil season1': { genres: ['Action', 'Crime', 'Drama', 'Sci-Fi', 'Thriller'], runtimeMinutes: 54 },
  'Daredevil season2': { genres: ['Action', 'Crime', 'Drama', 'Sci-Fi', 'Thriller'], runtimeMinutes: 54 },
  'Daredevil season3': { genres: ['Action', 'Crime', 'Drama', 'Sci-Fi', 'Thriller'], runtimeMinutes: 54 },
  'Daredevil born again': { genres: ['Action', 'Crime', 'Drama', 'Sci-Fi', 'Thriller'], runtimeMinutes: 50 },
  'Solo leveling': { genres: ['Animation', 'Action', 'Adventure', 'Fantasy', 'Anime'], runtimeMinutes: 24 },
  'Dark': { genres: ['Crime', 'Drama', 'Mystery', 'Sci-Fi', 'Thriller'], runtimeMinutes: 60 },
  'Iron heart': { genres: ['Action', 'Adventure', 'Drama', 'Sci-Fi'], runtimeMinutes: 45 },
  'It welcome to derry': { genres: ['Horror', 'Mystery', 'Sci-Fi'], runtimeMinutes: 50 },
  'Stranger things s5': { genres: ['Drama', 'Fantasy', 'Horror', 'Sci-Fi'], runtimeMinutes: 60 },
  'Death note': { genres: ['Animation', 'Crime', 'Drama', 'Fantasy', 'Mystery', 'Thriller', 'Anime'], runtimeMinutes: 23 },
  'Crash landing on you': { genres: ['Comedy', 'Drama', 'Romance'], runtimeMinutes: 70 },

  // Movies
  'The wild robot': { genres: ['Animation', 'Adventure', 'Family', 'Sci-Fi'], runtimeMinutes: 102 },
  'Amaran': { genres: ['Action', 'Biography', 'Drama', 'History', 'Indian Cinema'], runtimeMinutes: 169 },
  'Lucky Bhaskar': { genres: ['Crime', 'Drama', 'Thriller', 'Indian Cinema'], runtimeMinutes: 150 },
  'Gladiator 2': { genres: ['Action', 'Adventure', 'Drama'], runtimeMinutes: 148 },
  'Red One': { genres: ['Action', 'Adventure', 'Comedy', 'Fantasy'], runtimeMinutes: 123 },
  'Gifted': { genres: ['Drama'], runtimeMinutes: 101 },
  'Extraction 2': { genres: ['Action', 'Thriller'], runtimeMinutes: 122 },
  'F4 rise of the silver surfer': { genres: ['Action', 'Adventure', 'Sci-Fi'], runtimeMinutes: 92 },
  'Hit 3': { genres: ['Action', 'Crime', 'Mystery', 'Thriller', 'Indian Cinema'], runtimeMinutes: 145 },
  'The Hobbit: battle of the five armies': { genres: ['Action', 'Adventure', 'Fantasy'], runtimeMinutes: 144 },
  'The Hobbit: desolation of the dragon': { genres: ['Adventure', 'Fantasy'], runtimeMinutes: 161 },
  'The Hobbit: the unexpected journey': { genres: ['Adventure', 'Fantasy'], runtimeMinutes: 169 },
  "To all the boys I've loved before 2": { genres: ['Comedy', 'Drama', 'Romance'], runtimeMinutes: 101 },
  'Vidhuthalai part 2': { genres: ['Action', 'Crime', 'Drama', 'Indian Cinema'], runtimeMinutes: 140 },
  'Lord of the rings: fellowship of the ring': { genres: ['Action', 'Adventure', 'Drama', 'Fantasy'], runtimeMinutes: 178 },
  'Maanagarm': { genres: ['Action', 'Drama', 'Thriller', 'Indian Cinema'], runtimeMinutes: 137 },
  'Anamalai': { genres: ['Action', 'Comedy', 'Drama', 'Indian Cinema'], runtimeMinutes: 160 },
  'Madhaarasi': { genres: ['Action', 'Thriller', 'Indian Cinema'], runtimeMinutes: 140 },
  'Idly kadai': { genres: ['Drama', 'Comedy', 'Indian Cinema'], runtimeMinutes: 135 },
  'Lilo and stitch': { genres: ['Animation', 'Adventure', 'Comedy', 'Family', 'Sci-Fi'], runtimeMinutes: 85 },
  'Super cricket 2': { genres: ['Game', 'Sports'], runtimeMinutes: 0 },
};

// Known Indian Cinema titles in database to tag with 'Indian Cinema'
const INDIAN_TITLES = [
  'Amaran', 'Lucky Bhaskar', 'Vidaamuyarchi', 'Dragon', 'Lubber pandhu',
  'Vidhuthalai part 2', 'Viduthalai part 1', 'Maanagarm', 'Anamalai',
  'Madhaarasi', 'Idly kadai', 'Hit 3', 'Kozhipannai Chelladurai',
  'Raayan', 'Kadaisi ulaga por', 'Thangalaan', 'Garudan', 'Maharaja',
  'Lover', 'Blue star', 'Ayalaan', 'Captain Miller', 'Leo', 'Jailer',
  'Maaveeran', 'Chithha', 'Por thozhil', 'Good night', 'Dada',
  'Vaathi', 'Thunivu', 'Varisu'
];

let updatedCount = 0;

data.media = data.media.map((item) => {
  const overrides = GENRE_OVERRIDES[item.title];
  let genres = item.genres || [];
  let runtimeMinutes = item.runtimeMinutes || 0;

  if (overrides) {
    genres = overrides.genres;
    runtimeMinutes = overrides.runtimeMinutes || runtimeMinutes;
    updatedCount++;
  }

  // Ensure Indian Cinema tag for Indian cinema titles
  const isIndian = INDIAN_TITLES.some(
    (it) => it.toLowerCase() === item.title.toLowerCase()
  );
  if (isIndian && !genres.includes('Indian Cinema')) {
    genres.push('Indian Cinema');
  }

  // Ensure Games have 'Game' genre
  if (item.type === 'game' && (!genres || genres.length === 0)) {
    genres = ['Game'];
  }

  return {
    ...item,
    genres,
    runtimeMinutes,
  };
});

fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
console.log(`✅ Updated genres for ${updatedCount} items in data.json!`);

// Verify counts
const noGenres = data.media.filter((m) => !m.genres || m.genres.length === 0);
console.log(`Remaining items without genres: ${noGenres.length}`);
if (noGenres.length > 0) {
  console.log('Items still missing genres:', noGenres.map((m) => m.title));
}
