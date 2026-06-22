const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// ─── Firebase Admin Initialization ───
let admin, db;

function initFirebase() {
  try {
    admin = require('firebase-admin');

    // Strategy 1: Service account file path
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const saPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      if (fs.existsSync(saPath)) {
        admin.initializeApp({ credential: admin.credential.applicationDefault() });
        console.log('✓ Firebase initialized via GOOGLE_APPLICATION_CREDENTIALS');
      } else {
        admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'techyuya' });
        console.log('✓ Firebase initialized (no service account - may fail on auth)');
      }
    }
    // Strategy 2: Service account JSON as env string
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({ credential: admin.credential.cert(sa) });
      console.log('✓ Firebase initialized via FIREBASE_SERVICE_ACCOUNT_JSON');
    }
    // Strategy 3: Individual env vars
    else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
      console.log('✓ Firebase initialized via client email + private key');
    }
    // Strategy 4: Default (ADC or Metadata Server)
    else {
      admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'techyuya' });
      console.log('✓ Firebase initialized with defaults (ADC/metadata)');
    }

    db = admin.firestore();
    return true;
  } catch (err) {
    console.error('✗ Firebase init error:', err.message);
    console.log('  → Create a service account at: Firebase Console > Project Settings > Service Accounts');
    console.log('  → Set FIREBASE_SERVICE_ACCOUNT_PATH in .env to the JSON file path');
    return false;
  }
}

const firebaseReady = initFirebase();

// ─── Express Setup ───
const app = express();
app.use(cors());
app.use(express.json());

// Helper: get Firestore instance (throws if not initialized)
function getDB() {
  if (!db) throw new Error('Firestore not initialized');
  return db;
}

// Helper: generate next reg no
async function nextRegNo() {
  const snap = await getDB().collection('meta').doc('counters').get();
  let seq = 1;
  if (snap.exists) { seq = (snap.data().studentSeq || 0) + 1; }
  await getDB().collection('meta').doc('counters').set({ studentSeq: seq }, { merge: true });
  return `TY${String(seq).padStart(6, '0')}`;
}

// Helper: format student doc
function formatStudent(doc) {
  return { id: doc.id, ...doc.data() };
}

// ════════════════════════════════════════════
//  API ROUTES
// ════════════════════════════════════════════

// ─── Health Check ───
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', firebase: firebaseReady ? 'connected' : 'not_initialized' });
});

// ─── STUDENTS ───
app.get('/api/students', async (req, res) => {
  try {
    const snap = await getDB().collection('students').orderBy('joinDate', 'desc').get();
    const students = snap.docs.map(formatStudent);
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/students', async (req, res) => {
  try {
    const data = req.body;
    const regNo = data.regNo || await nextRegNo();
    const student = {
      regNo,
      name: data.name || '',
      phone: data.phone || '',
      phone2: data.phone2 || '',
      address: data.address || '',
      reference: data.reference || '',
      paymentMode: data.paymentMode || 'offline',
      course: data.course || '',
      batch: data.batch || '',
      courseStatus: data.courseStatus || 'ongoing',
      certificateIssued: data.certificateIssued || 'no',
      joinDate: data.joinDate || '',
      expectedEndDate: data.expectedEndDate || '',
      totalFee: parseFloat(data.totalFee) || 0,
      paidFee: parseFloat(data.paidFee) || 0,
      status: data.status || 'Pending',
      payments: data.payments || [],
      createdAt: new Date().toISOString(),
    };
    const ref = await getDB().collection('students').add(student);
    res.json({ id: ref.id, ...student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/students/:id', async (req, res) => {
  try {
    const doc = await getDB().collection('students').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Student not found' });
    res.json(formatStudent(doc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/students/:id', async (req, res) => {
  try {
    const data = req.body;
    const update = {};
    const fields = ['regNo','name','phone','phone2','address','reference','paymentMode','course','batch','courseStatus','certificateIssued','joinDate','expectedEndDate','status'];
    fields.forEach(f => { if (data[f] !== undefined) update[f] = data[f]; });
    if (data.totalFee !== undefined) update.totalFee = parseFloat(data.totalFee);
    if (data.paidFee !== undefined) update.paidFee = parseFloat(data.paidFee);
    if (data.payments !== undefined) update.payments = data.payments;
    await getDB().collection('students').doc(req.params.id).update(update);
    const doc = await getDB().collection('students').doc(req.params.id).get();
    res.json(formatStudent(doc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    await getDB().collection('students').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PAYMENTS (record payment on student) ───
app.post('/api/students/:id/payments', async (req, res) => {
  try {
    const { amount, mode, date } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const docRef = getDB().collection('students').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Student not found' });
    const student = doc.data();
    const newPaid = (parseFloat(student.paidFee) || 0) + parseFloat(amount);
    const total = parseFloat(student.totalFee) || 0;
    const payments = student.payments || [];
    payments.push({ id: Date.now(), amount: parseFloat(amount), date: date || new Date().toISOString().split('T')[0], mode: mode || 'offline' });
    const status = newPaid >= total && total > 0 ? 'Paid' : newPaid > 0 ? 'Partial' : 'Pending';
    await docRef.update({ paidFee: newPaid, payments, status });
    const updated = await docRef.get();
    res.json(formatStudent(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── COURSES ───
app.get('/api/courses', async (req, res) => {
  try {
    const snap = await getDB().collection('courses').orderBy('name', 'asc').get();
    const courses = snap.docs.map(formatStudent);
    if (courses.length === 0) res.json(getDefaultCourses());
    else res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function getDefaultCourses() {
  return [
    { id: 'default-1', name: 'Web Development', duration: '12 weeks', fee: 25000, badge: 'Frontend · Backend' },
    { id: 'default-2', name: 'Data Science', duration: '14 weeks', fee: 35000, badge: 'Python · ML · Stats' },
    { id: 'default-3', name: 'Mobile App Development', duration: '10 weeks', fee: 30000, badge: 'Android · iOS' },
    { id: 'default-4', name: 'UI/UX Design', duration: '8 weeks', fee: 20000, badge: 'Design · Research' },
    { id: 'default-5', name: 'Cloud Computing', duration: '10 weeks', fee: 28000, badge: 'AWS · Azure · GCP' },
    { id: 'default-6', name: 'Cybersecurity', duration: '12 weeks', fee: 32000, badge: 'Network · Security' },
    { id: 'default-7', name: 'AI & Machine Learning', duration: '16 weeks', fee: 40000, badge: 'ML · Deep Learning' },
    { id: 'default-8', name: 'Digital Marketing', duration: '8 weeks', fee: 18000, badge: 'SEO · Social Media' },
  ];
}

app.post('/api/courses', async (req, res) => {
  try {
    const data = req.body;
    const course = {
      name: data.name,
      duration: data.duration || '',
      fee: parseFloat(data.fee) || 0,
      badge: data.badge || '',
      createdAt: new Date().toISOString(),
    };
    const ref = await getDB().collection('courses').add(course);
    res.json({ id: ref.id, ...course });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/courses/:id', async (req, res) => {
  try {
    const data = req.body;
    const update = {};
    ['name','duration','badge'].forEach(f => { if (data[f] !== undefined) update[f] = data[f]; });
    if (data.fee !== undefined) update.fee = parseFloat(data.fee);
    await getDB().collection('courses').doc(req.params.id).update(update);
    const doc = await getDB().collection('courses').doc(req.params.id).get();
    res.json(formatStudent(doc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/courses/:id', async (req, res) => {
  try {
    await getDB().collection('courses').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── EXPENSES ───
app.get('/api/expenses', async (req, res) => {
  try {
    const snap = await getDB().collection('expenses').orderBy('date', 'desc').get();
    res.json(snap.docs.map(formatStudent));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const data = req.body;
    const expense = {
      name: data.name,
      amount: parseFloat(data.amount) || 0,
      date: data.date || new Date().toISOString().split('T')[0],
      mode: data.mode || 'cash',
      createdAt: new Date().toISOString(),
    };
    const ref = await getDB().collection('expenses').add(expense);
    res.json({ id: ref.id, ...expense });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    await getDB().collection('expenses').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DASHBOARD ───
app.get('/api/dashboard', async (req, res) => {
  try {
    const studentsSnap = await getDB().collection('students').get();
    const expensesSnap = await getDB().collection('expenses').get();
    const students = studentsSnap.docs.map(formatStudent);
    const expenses = expensesSnap.docs.map(formatStudent);

    const totalStudents = students.length;
    const totalCollected = students.reduce((s, x) => s + (parseFloat(x.paidFee) || 0), 0);
    const totalPending = students.reduce((s, x) => s + ((parseFloat(x.totalFee) || 0) - (parseFloat(x.paidFee) || 0)), 0);
    const activeCourses = [...new Set(students.map(s => s.course))].filter(c => c).length;

    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const monthStudents = students.filter(s => s.joinDate && s.joinDate.startsWith(thisMonth));
    const monthFees = monthStudents.reduce((s, x) => s + (parseFloat(x.paidFee) || 0), 0);
    const monthExp = expenses.filter(e => e.date && e.date.startsWith(thisMonth));
    const monthExpTotal = monthExp.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

    const paidCount = students.filter(s => s.status === 'Paid').length;
    const partialCount = students.filter(s => s.status === 'Partial').length;
    const pendingCount = students.filter(s => s.status === 'Pending').length;

    const courseDist = {};
    students.forEach(s => {
      const key = s.course + (s.batch ? ' · ' + s.batch.replace(/ \(\d+ days\)/, '') : '');
      courseDist[key] = (courseDist[key] || 0) + 1;
    });

    res.json({
      totalStudents, totalCollected, totalPending, activeCourses,
      monthNewStudents: monthStudents.length,
      monthFeesCollected: monthFees,
      monthExpenses: monthExpTotal,
      monthNet: monthFees - monthExpTotal,
      paymentStatus: { paid: paidCount, partial: partialCount, pending: pendingCount },
      courseDistribution: courseDist,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── FEES ───
app.get('/api/fees', async (req, res) => {
  try {
    const snap = await getDB().collection('students').orderBy('joinDate', 'desc').get();
    const students = snap.docs.map(formatStudent);
    const totalCollected = students.reduce((s, x) => s + (parseFloat(x.paidFee) || 0), 0);
    const totalPending = students.reduce((s, x) => s + ((parseFloat(x.totalFee) || 0) - (parseFloat(x.paidFee) || 0)), 0);
    res.json({ students, totalCollected, totalPending, fullyPaid: students.filter(s => s.status === 'Paid').length, partialPending: students.filter(s => s.status !== 'Paid').length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ANALYTICS ───
app.get('/api/analytics', async (req, res) => {
  try {
    const studentsSnap = await getDB().collection('students').get();
    const expensesSnap = await getDB().collection('expenses').get();
    const coursesSnap = await getDB().collection('courses').get();
    const students = studentsSnap.docs.map(formatStudent);
    const expenses = expensesSnap.docs.map(formatStudent);
    const courses = coursesSnap.docs.map(formatStudent);
    const defaultCourses = courses.length === 0 ? getDefaultCourses() : courses;

    const feesCollected = students.reduce((s, x) => s + (parseFloat(x.paidFee) || 0), 0);
    const totalExp = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const pendingFees = students.reduce((s, x) => s + ((parseFloat(x.totalFee) || 0) - (parseFloat(x.paidFee) || 0)), 0);
    const onlineFees = students.filter(s => s.paymentMode === 'online').reduce((s, x) => s + (parseFloat(x.paidFee) || 0), 0);
    const offlineFees = students.filter(s => s.paymentMode === 'offline').reduce((s, x) => s + (parseFloat(x.paidFee) || 0), 0);
    const cashExp = expenses.filter(e => e.mode === 'cash').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const onlineExp = expenses.filter(e => e.mode === 'online').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

    const now = new Date();

    // Monthly enrollment trend
    const monthlyData = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthlyData[d.toLocaleString('en-US', { month: 'short' })] = 0;
    }
    students.forEach(s => {
      const d = new Date(s.joinDate);
      const key = d.toLocaleString('en-US', { month: 'short' });
      if (monthlyData.hasOwnProperty(key)) monthlyData[key]++;
    });

    const monthlyCollection = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthlyCollection[d.toLocaleString('en-US', { month: 'short' })] = 0;
    }
    students.forEach(s => {
      const d = new Date(s.joinDate);
      const key = d.toLocaleString('en-US', { month: 'short' });
      if (monthlyCollection.hasOwnProperty(key)) monthlyCollection[key] += parseFloat(s.paidFee) || 0;
    });

    const courseRevenue = {};
    defaultCourses.forEach(c => { courseRevenue[c.name] = { collected: 0, pending: 0 }; });
    students.forEach(s => {
      if (courseRevenue[s.course]) {
        courseRevenue[s.course].collected += parseFloat(s.paidFee) || 0;
        courseRevenue[s.course].pending += (parseFloat(s.totalFee) || 0) - (parseFloat(s.paidFee) || 0);
      }
    });

    res.json({
      feesCollected, totalExpenses: totalExp, netBalance: feesCollected - totalExp, pendingFees,
      onlineFees, offlineFees, cashExp, onlineExp,
      enrollmentTrend: monthlyData,
      collectionTrend: monthlyCollection,
      courseRevenue,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Export for Vercel ───
module.exports = app;

// ─── Start Server (only when run directly, not as Vercel serverless) ───
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`\n  🚀 TechYuva Backend running at http://localhost:${PORT}`);
    console.log(`  📡 API: http://localhost:${PORT}/api/health\n`);
    if (!firebaseReady) {
      console.log('  ⚠️  Firebase not initialized. Set up service account in .env');
      console.log('  📖 Instructions: Firebase Console → Project Settings → Service Accounts\n');
    }
  });
}
