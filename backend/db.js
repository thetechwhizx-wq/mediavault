const fs = require('fs');
const path = require('path');
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}
const mongoose = require('mongoose');
const Media = require('./models/Media');

const DATA_FILE = path.join(__dirname, 'data.json');
let useMongo = false;

// ── Fallback data.json Helpers ──
function readLocalData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { media: [] };
  }
}

function saveLocalData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ── Connect to Database ──
async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('📦 [Storage] No MONGODB_URI set. Using local data.json.');
    useMongo = false;
    return false;
  }

  try {
    console.log('⏳ [Storage] Connecting to MongoDB Atlas...');
    await mongoose.connect(uri);
    useMongo = true;
    console.log('✅ [Storage] Successfully connected to MongoDB Atlas!');
    return true;
  } catch (err) {
    console.error('❌ [Storage] MongoDB connection error:', err.message);
    console.log('📦 [Storage] Falling back to local data.json.');
    useMongo = false;
    return false;
  }
}

function isMongo() {
  return useMongo && mongoose.connection.readyState === 1;
}

// ── Unified Storage API ──

async function getAllMedia() {
  if (isMongo()) {
    const docs = await Media.find({}).sort({ id: 1 }).lean();
    return docs;
  }
  return readLocalData().media || [];
}

async function addMediaItem(itemData) {
  if (isMongo()) {
    // Generate next sequential numeric id
    const highest = await Media.findOne({}).sort({ id: -1 }).lean();
    const nextId = highest && highest.id ? highest.id + 1 : 1;
    const doc = new Media({ ...itemData, id: itemData.id || nextId });
    await doc.save();
    return doc.toObject();
  }

  const data = readLocalData();
  const nextId = data.media && data.media.length > 0
    ? Math.max(...data.media.map((m) => m.id || 0)) + 1
    : 1;
  const newItem = { ...itemData, id: itemData.id || nextId };
  data.media.push(newItem);
  saveLocalData(data);
  return newItem;
}

async function updateMediaItem(id, updates) {
  const numId = parseInt(id, 10);
  if (isMongo()) {
    const doc = await Media.findOneAndUpdate({ id: numId }, updates, { new: true }).lean();
    return doc;
  }

  const data = readLocalData();
  const item = data.media.find((m) => m.id === numId);
  if (!item) return null;
  Object.assign(item, updates);
  saveLocalData(data);
  return item;
}

async function deleteMediaItem(id) {
  const numId = parseInt(id, 10);
  if (isMongo()) {
    const res = await Media.deleteOne({ id: numId });
    return res.deletedCount > 0;
  }

  const data = readLocalData();
  const before = data.media.length;
  data.media = data.media.filter((m) => m.id !== numId);
  saveLocalData(data);
  return data.media.length < before;
}

async function bulkAddMediaItems(items) {
  if (!Array.isArray(items) || items.length === 0) return [];

  if (isMongo()) {
    const highest = await Media.findOne({}).sort({ id: -1 }).lean();
    let currentId = highest && highest.id ? highest.id : 0;

    const toInsert = items.map((it) => {
      currentId++;
      return {
        ...it,
        id: it.id || currentId,
      };
    });

    const docs = await Media.insertMany(toInsert);
    return docs.map((d) => d.toObject());
  }

  const data = readLocalData();
  let currentId = data.media && data.media.length > 0
    ? Math.max(...data.media.map((m) => m.id || 0))
    : 0;

  const added = [];
  for (const it of items) {
    currentId++;
    const newItem = {
      ...it,
      id: it.id || currentId,
    };
    data.media.push(newItem);
    added.push(newItem);
  }
  saveLocalData(data);
  return added;
}

async function bulkDeleteMediaItems(ids) {
  const numIds = ids.map((i) => parseInt(i, 10));

  if (isMongo()) {
    const res = await Media.deleteMany({ id: { $in: numIds } });
    const remaining = await Media.find({}).sort({ id: 1 }).lean();
    return { deletedCount: res.deletedCount, media: remaining };
  }

  const data = readLocalData();
  const idSet = new Set(numIds);
  const before = data.media.length;
  data.media = data.media.filter((m) => !idSet.has(m.id));
  saveLocalData(data);
  return { deletedCount: before - data.media.length, media: data.media };
}

module.exports = {
  connectDB,
  isMongo,
  getAllMedia,
  addMediaItem,
  updateMediaItem,
  deleteMediaItem,
  bulkAddMediaItems,
  bulkDeleteMediaItems,
  readLocalData,
};
