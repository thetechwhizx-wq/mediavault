require('dotenv').config({ path: __dirname + '/.env' });
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Media = require('./models/Media');

async function migrate() {
  const uri = process.argv[2] || process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ Error: No MongoDB connection string provided.');
    console.log('\nUsage:');
    console.log('  node backend/migrate-to-mongo.js "mongodb+srv://<user>:<password>@cluster0.xxx.mongodb.net/mediavault"\n');
    process.exit(1);
  }

  try {
    console.log('⏳ Connecting to MongoDB Atlas...');
    await mongoose.connect(uri);
    console.log('✅ Connected successfully!');

    const dataFile = path.join(__dirname, 'data.json');
    if (!fs.existsSync(dataFile)) {
      console.error('❌ Could not find backend/data.json');
      process.exit(1);
    }

    const raw = fs.readFileSync(dataFile, 'utf8');
    const { media } = JSON.parse(raw);

    if (!Array.isArray(media) || media.length === 0) {
      console.log('⚠️ No items found in data.json to migrate.');
      process.exit(0);
    }

    console.log(`📦 Found ${media.length} items in data.json. Migrating to MongoDB Atlas...`);

    // Clean existing records in the cloud collection to avoid duplicate ID conflicts
    await Media.deleteMany({});

    // Clean and prepare items
    const docs = media.map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type || 'movie',
      status: item.status || 'completed',
      progress: item.progress || '',
      poster: item.poster || '',
      watchedDate: item.watchedDate || '',
      venue: item.venue || '',
      notes: item.notes || '',
      hoursPlayed: Number(item.hoursPlayed) || 0,
      targetHours: Number(item.targetHours) || 0,
      rating: item.rating !== undefined ? item.rating : null,
      review: item.review || '',
      importedFrom: item.importedFrom || '',
      genres: Array.isArray(item.genres) ? item.genres : [],
      runtimeMinutes: Number(item.runtimeMinutes) || 0,
      playedFrom: item.playedFrom || '',
      playedTo: item.playedTo || '',
      playedMonth: item.playedMonth || '',
      replay: Boolean(item.replay),
      dateConfidence: item.dateConfidence || '',
      needsCheck: item.needsCheck || '',
      platform: item.platform || '',
    }));

    await Media.insertMany(docs);

    console.log(`\n🎉 SUCCESS: All ${docs.length} items were migrated to MongoDB Atlas!`);
    console.log('Now, when you deploy to Render with this MONGODB_URI, all your data will be live and permanent in the cloud.');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
