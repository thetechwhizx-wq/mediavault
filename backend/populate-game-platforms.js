const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');
const raw = fs.readFileSync(DATA_FILE, 'utf8');
const data = JSON.parse(raw);

const PLATFORM_MAP = {
  'Super cricket 2': 'Mobile',
  'Super Cricket 2': 'Mobile',
  'Super Cricket 3': 'Mobile',
  'Pokemon Unite': 'Mobile / Switch',
  'Game of Thrones: Kingsroad': 'PC / Mobile',
  'Delta Force': 'PC / Steam',
  'Where Winds Meet': 'PC',
  'Pokemon Emerald': 'GBA / Mobile',
  'Bus Simulator Indonesia': 'Mobile',
  'Detention': 'PC / Steam',
  'Truckers of Europe 3': 'Mobile',
  'Life is Strange': 'PC / Console',
  'EA Cricket 07': 'PC',
  'ARK': 'PC / Steam',
  'Pokemon GO': 'Mobile',
  'Call of Duty': 'PC / Mobile',
  'God of War': 'PlayStation',
  'WWE SmackDown! Here Comes the Pain': 'PlayStation 2',
  'Pokemon Platinum': 'Nintendo DS',
  'Rainbow Six Mobile': 'Mobile',
  'Real Cricket 17': 'Mobile',
  'Real Cricket 20': 'Mobile',
  'BGMI': 'Mobile',
  'Red Dead Redemption': 'PlayStation / PC',
  'Skyrim': 'PC / Steam Deck',
  'The Walking Dead: Season Two': 'PC / Steam',
  'The Walking Dead: Season Three': 'PC / Steam',
  'Grand Theft Auto: San Andreas': 'PlayStation / PC',
  'Devil May Cry 3': 'PlayStation / PC',
  'Silent Hill 2': 'PlayStation / PC',
  'God of War II': 'PlayStation',
  'Call of Duty: WWII': 'PC / Console',
};

// Also give in_progress status to current or top games if none active
let activeCount = 0;
data.media = data.media.map((item) => {
  if (item.type === 'game') {
    const platform = PLATFORM_MAP[item.title] || 'PC / Mobile';
    let status = item.status || 'completed';
    // If it's a recent or replay game, make sure it has an active or in_progress status
    if (['Super Cricket 3', 'Pokemon Platinum', 'Delta Force', 'Bus Simulator Indonesia'].includes(item.title) && item.replay) {
      status = 'in_progress';
      activeCount++;
    }
    return {
      ...item,
      platform,
      status,
      hoursPlayed: Number(item.hoursPlayed) || (status === 'completed' ? 12.5 : status === 'in_progress' ? 8.0 : 4.0),
      targetHours: Number(item.targetHours) || 20,
      rating: item.rating || (item.notes && item.notes.includes('peak') ? 5 : item.notes && item.notes.includes('good') ? 4 : 3.5),
    };
  }
  return item;
});

fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
console.log('✅ Updated game platforms, hours, and ratings in data.json!');
