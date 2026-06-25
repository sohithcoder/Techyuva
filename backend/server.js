const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// ─── Firebase Admin Initialization ───
let admin, db;

function normalizePrivateKey(key) {
  if (!key) return key;
  // Handle keys pasted with literal \n, double-escaped \\n, or actual newlines
  return key.replace(/\\n/g, '\n').replace(/\n/g, '\n').trim();
}

function initFirebase() {
  try {
    admin = require('firebase-admin');
    const projectId = process.env.FIREBASE_PROJECT_ID || 'techyuya';

    // Strategy 1: Individual env vars (recommended for Vercel)
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
        }),
      });
      console.log('✓ Firebase: initialized via individual env vars');
    }
    // Strategy 2: Service account JSON as env var
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        if (!sa.private_key) throw new Error('Missing private_key in service account JSON');
        sa.private_key = normalizePrivateKey(sa.private_key);
        admin.initializeApp({ credential: admin.credential.cert(sa) });
        console.log('✓ Firebase: initialized via FIREBASE_SERVICE_ACCOUNT_JSON');
      } catch (e) {
        console.error('✗ Bad FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
        throw e;
      }
    }
    // Strategy 3: Service account key file (local dev only — file is gitignored)
    else {
      const keyPaths = [
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
        path.join(__dirname, 'firebase-key.json'),
        './firebase-key.json',
      ].filter(Boolean);
      const foundKeyPath = keyPaths.find(p => fs.existsSync(path.resolve(p)));
      if (foundKeyPath) {
        const sa = JSON.parse(fs.readFileSync(path.resolve(foundKeyPath), 'utf8'));
        admin.initializeApp({ credential: admin.credential.cert(sa) });
        console.log('✓ Firebase: loaded key file at', foundKeyPath);
      } else {
        admin.initializeApp({ projectId });
        console.log('⚠ Firebase: no credentials found, using fallback (will fail at runtime)');
      }
    }

    db = admin.firestore();
    return true;
  } catch (err) {
    console.error('✗ Firebase init error:', err.message);
    return false;
  }
}

const firebaseReady = initFirebase();

// ─── Express Setup ───
const app = express();
app.use(cors());
app.use(express.json());


// Prevent caching of all API responses
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});
function getDB() {
  if (!db) throw new Error('Firestore not initialized');
  return db;
}

function formatDoc(doc) {
  return { id: doc.id, ...doc.data() };
}

// ─── Health / Diagnostics ───
app.get('/api/health', (req, res) => {
  const strategy = process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
    ? 'env_vars'
    : process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? 'service_account_json'
    : firebaseReady
    ? 'key_file_or_fallback'
    : 'none';
  res.json({
    status: 'ok',
    firebase: firebaseReady ? 'connected' : 'not_initialized',
    strategy,
    env_email_set: !!process.env.FIREBASE_CLIENT_EMAIL,
    env_private_key_set: !!process.env.FIREBASE_PRIVATE_KEY,
    env_project_id: process.env.FIREBASE_PROJECT_ID || 'techyuya',
  });
});

// ─── STUDENTS ───
app.get('/api/students', async (req, res) => {
  try {
    const snap = await getDB().collection('students').orderBy('joinDate', 'desc').get();
    res.json(snap.docs.map(formatDoc));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/students', async (req, res) => {
  try {
    const d = req.body;
    const student = {
      regNo: d.regNo || '', name: d.name || '', phone: d.phone || '', phone2: d.phone2 || '',
      address: d.address || '', reference: d.reference || '', paymentMode: d.paymentMode || 'offline',
      course: d.course || '', batch: d.batch || '', courseStatus: d.courseStatus || 'ongoing',
      certificateIssued: d.certificateIssued || 'no', joinDate: d.joinDate || '',
      expectedEndDate: d.expectedEndDate || '', totalFee: parseFloat(d.totalFee) || 0,
      paidFee: parseFloat(d.paidFee) || 0, status: d.status || 'Pending',
      payments: d.payments || [], createdAt: new Date().toISOString(),
    };
    const ref = await getDB().collection('students').add(student);
    res.json({ id: ref.id, ...student });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/students/:id', async (req, res) => {
  try {
    const data = req.body;
    const update = {};
    ['regNo','name','phone','phone2','address','reference','paymentMode','course','batch','courseStatus','certificateIssued','joinDate','expectedEndDate','status'].forEach(f => {
      if (data[f] !== undefined) update[f] = data[f];
    });
    if (data.totalFee !== undefined) update.totalFee = parseFloat(data.totalFee);
    if (data.paidFee !== undefined) update.paidFee = parseFloat(data.paidFee);
    if (data.payments !== undefined) update.payments = data.payments;
    await getDB().collection('students').doc(req.params.id).update(update);
    const doc = await getDB().collection('students').doc(req.params.id).get();
    res.json(formatDoc(doc));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    await getDB().collection('students').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/students/:id/payments', async (req, res) => {
  try {
    const { amount, mode, date } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const docRef = getDB().collection('students').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Student not found' });
    const s = doc.data();
    const newPaid = (parseFloat(s.paidFee) || 0) + parseFloat(amount);
    const total = parseFloat(s.totalFee) || 0;
    const payments = s.payments || [];
    payments.push({ id: Date.now(), amount: parseFloat(amount), date: date || new Date().toISOString().split('T')[0], mode: mode || 'offline' });
    const status = newPaid >= total && total > 0 ? 'Paid' : newPaid > 0 ? 'Partial' : 'Pending';
    await docRef.update({ paidFee: newPaid, payments, status });
    res.json(formatDoc(await docRef.get()));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── COURSES ───
app.get('/api/courses', async (req, res) => {
  try {
    const snap = await getDB().collection('courses').orderBy('order', 'asc').get();
    let courses = snap.docs.map(formatDoc);
    if (req.query.trending === 'true') courses = courses.filter(c => c.trending);
    res.json(courses);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/courses', async (req, res) => {
  try {
    const d = req.body;
    const ref = await getDB().collection('courses').add({
      name: d.name, description: d.description || '', duration: d.duration || '', endDate: d.endDate || '', fee: parseFloat(d.fee) || 0, badge: d.badge || '', infoLink: d.infoLink || '', modules: Array.isArray(d.modules) ? d.modules : [], order: parseInt(d.order) || 0, trending: !!d.trending, createdAt: new Date().toISOString()
    });
    const doc = await ref.get();
    res.json(formatDoc(doc));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/courses/:id', async (req, res) => {
  try {
    const d = req.body;
    const docRef = getDB().collection('courses').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Course not found' });
    const update = {};
    ['name','description','duration','endDate','badge','infoLink','modules'].forEach(f => { if (d[f] !== undefined) update[f] = d[f]; });
    if (d.fee !== undefined) update.fee = parseFloat(d.fee);
    if (d.order !== undefined) update.order = parseInt(d.order);
    if (d.hasOwnProperty('trending')) update.trending = !!d.trending;
    update.updatedAt = new Date().toISOString();
    await docRef.update(update);
    res.json({ id: req.params.id, ...update });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/courses/:id', async (req, res) => {
  try {
    await getDB().collection('courses').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── BATCHES (per-course) ───
app.get('/api/batches', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const snap = await getDB().collection('batches').orderBy('order', 'asc').get();
    let batches = snap.docs.map(formatDoc);
    if (req.query.courseId) batches = batches.filter(b => b.courseId === req.query.courseId);
    res.json(batches);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/batches', async (req, res) => {
  try {
    const d = req.body;
    if (!d.courseId || !d.name || !d.duration) return res.status(400).json({ error: 'courseId, name, and duration required' });
    const ref = await getDB().collection('batches').add({
      courseId: d.courseId,
      name: d.name,
      duration: parseInt(d.duration),
      timing: d.timing || '',
      order: parseInt(d.order) || 0,
      createdAt: new Date().toISOString(),
    });
    res.json(formatDoc(await ref.get()));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/batches/:id', async (req, res) => {
  try {
    const d = req.body;
    const docRef = getDB().collection('batches').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Batch not found' });
    const update = {};
    if (d.courseId !== undefined) update.courseId = d.courseId;
    if (d.name !== undefined) update.name = d.name;
    if (d.timing !== undefined) update.timing = d.timing;
    if (d.duration !== undefined) update.duration = parseInt(d.duration);
    if (d.order !== undefined) update.order = parseInt(d.order);
    await docRef.update(update);
    res.json(formatDoc(await docRef.get()));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/batches/:id', async (req, res) => {
  try {
    await getDB().collection('batches').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── UPCOMING BATCHES (separate from courses/batches) ───
app.get('/api/upcoming-batches', async (req, res) => {
  try {
    const snap = await getDB().collection('upcomingBatches').orderBy('startingDate', 'asc').get();
    res.json(snap.docs.map(formatDoc));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/upcoming-batches', async (req, res) => {
  try {
    const d = req.body;
    if (!d.courseName || !d.batchName) return res.status(400).json({ error: 'courseName and batchName required' });
    const ref = await getDB().collection('upcomingBatches').add({
      courseName: d.courseName,
      batchName: d.batchName,
      timing: d.timing || '',
      startingDate: d.startingDate || '',
      createdAt: new Date().toISOString(),
    });
    res.json(formatDoc(await ref.get()));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/upcoming-batches/:id', async (req, res) => {
  try {
    const d = req.body;
    const docRef = getDB().collection('upcomingBatches').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    const update = {};
    if (d.courseName !== undefined) update.courseName = d.courseName;
    if (d.batchName !== undefined) update.batchName = d.batchName;
    if (d.timing !== undefined) update.timing = d.timing;
    if (d.startingDate !== undefined) update.startingDate = d.startingDate;
    await docRef.update(update);
    res.json(formatDoc(await docRef.get()));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/upcoming-batches/:id', async (req, res) => {
  try {
    await getDB().collection('upcomingBatches').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── STUDY ZONE ITEMS ───
const STUDY_ZONE_TYPES = ['career-roadmap', 'placement-guideline', 'job-opening', 'study-material', 'mock-test'];

app.get('/api/studyzone', async (req, res) => {
  try {
    const snap = await getDB().collection('studyZoneItems').orderBy('order', 'asc').get();
    let items = snap.docs.map(formatDoc);
    if (req.query.type) items = items.filter(item => item.type === req.query.type);
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/studyzone', async (req, res) => {
  try {
    const d = req.body;
    if (!STUDY_ZONE_TYPES.includes(d.type)) return res.status(400).json({ error: 'Invalid type' });
    if (!d.title || !d.link) return res.status(400).json({ error: 'title and link required' });
    const ref = await getDB().collection('studyZoneItems').add({
      type: d.type,
      title: d.title,
      description: d.description || '',
      link: d.link,
      icon: d.icon || '',
      order: parseInt(d.order) || 0,
      meta: d.meta || {},
      createdAt: new Date().toISOString(),
    });
    res.json(formatDoc(await ref.get()));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/studyzone/:id', async (req, res) => {
  try {
    const d = req.body;
    const docRef = getDB().collection('studyZoneItems').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Item not found' });
    const update = {};
    ['type','title','description','link','icon','meta'].forEach(f => { if (d[f] !== undefined) update[f] = d[f]; });
    if (d.order !== undefined) update.order = parseInt(d.order);
    await docRef.update(update);
    res.json(formatDoc(await docRef.get()));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/studyzone/:id', async (req, res) => {
  try {
    await getDB().collection('studyZoneItems').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── EXPENSES ───
app.get('/api/expenses', async (req, res) => {
  try {
    const snap = await getDB().collection('expenses').orderBy('date', 'desc').get();
    res.json(snap.docs.map(formatDoc));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const d = req.body;
    const ref = await getDB().collection('expenses').add({ name: d.name, amount: parseFloat(d.amount) || 0, date: d.date || new Date().toISOString().split('T')[0], mode: d.mode || 'cash', createdAt: new Date().toISOString() });
    const doc = await ref.get();
    res.json(formatDoc(doc));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/expenses/:id', async (req, res) => {
  try {
    const d = req.body;
    const docRef = getDB().collection('expenses').doc(req.params.id);
    const snap = await docRef.get();
    if (!snap.exists) return res.status(404).json({ error: 'Not found' });
    const update = { name: d.name || snap.data().name, amount: parseFloat(d.amount) || snap.data().amount, date: d.date || snap.data().date, mode: d.mode || snap.data().mode, updatedAt: new Date().toISOString() };
    await docRef.update(update);
    res.json({ id: req.params.id, ...update });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── SETTINGS ───
app.get('/api/settings/whatsapp', async (req, res) => {
  try {
    const doc = await getDB().collection('settings').doc('whatsapp').get();
    res.json(doc.exists ? doc.data() : { number: '919876543210' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/settings/whatsapp', async (req, res) => {
  try {
    const { number } = req.body;
    if (!number) return res.status(400).json({ error: 'number required' });
    await getDB().collection('settings').doc('whatsapp').set({ number, updatedAt: new Date().toISOString() });
    res.json({ number });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── DASHBOARD ───
app.get('/api/dashboard', async (req, res) => {
  try {
    const sSnap = await getDB().collection('students').get();
    const eSnap = await getDB().collection('expenses').get();
    const cSnap = await getDB().collection('courses').get();
    const students = sSnap.docs.map(formatDoc);
    const expenses = eSnap.docs.map(formatDoc);
    const courses = cSnap.docs.map(formatDoc);
    const totalCollected = students.reduce((s, x) => s + (parseFloat(x.paidFee) || 0), 0);
    const totalPending = students.reduce((s, x) => s + ((parseFloat(x.totalFee) || 0) - (parseFloat(x.paidFee) || 0)), 0);
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const monthFees = students.filter(s => s.joinDate && s.joinDate.startsWith(thisMonth)).reduce((s, x) => s + (parseFloat(x.paidFee) || 0), 0);
    const monthExp = expenses.filter(e => e.date && e.date.startsWith(thisMonth)).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const courseDist = {};
    students.forEach(s => { const k = s.course + (s.batch ? ' · ' + s.batch.replace(/ \(\d+ days\)/, '') : ''); courseDist[k] = (courseDist[k] || 0) + 1; });
    res.json({
      totalStudents: students.length, totalCollected, totalPending,
      activeCourses: courses.length,
      monthNewStudents: students.filter(s => s.joinDate && s.joinDate.startsWith(thisMonth)).length,
      monthFeesCollected: monthFees, monthExpenses: monthExp, monthNet: monthFees - monthExp,
      paymentStatus: { paid: students.filter(s => s.status === 'Paid').length, partial: students.filter(s => s.status === 'Partial').length, pending: students.filter(s => s.status === 'Pending').length },
      courseDistribution: courseDist,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Export for Vercel ───
module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`\n  🚀 TechYuva Backend running at http://localhost:${PORT}`);
    console.log(`  📡 API: http://localhost:${PORT}/api/health\n`);
  });
}
