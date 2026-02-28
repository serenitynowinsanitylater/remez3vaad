require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const { v4: uuid } = require('uuid');

const db = require('./db');
const { login, auth, adminOnly } = require('./auth');
const { sendReminder, sendTest, runAll, makeTransporter, getSetting } = require('./mailer');

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Serve React in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function log(user, action, detail = '') {
  try {
    db.prepare('INSERT INTO audit_log(id,username,initials,action,detail) VALUES(?,?,?,?,?)')
      .run(uuid(), user.username, user.initials||'', action, detail);
  } catch {}
}

function aptToFront(a) {
  return {
    id:a.id, aptNum:a.apt_num,
    ownerName:a.owner_name, ownerPhone:a.owner_phone, ownerEmail:a.owner_email,
    tenantName:a.tenant_name, tenantPhone:a.tenant_phone, tenantEmail:a.tenant_email,
    hasTenant:!!a.has_tenant, monthlyFee:a.monthly_fee, notes:a.notes,
    sendReminders:!!a.send_reminders, reminderFreq:a.reminder_freq,
    reminderDay:a.reminder_day, createdAt:a.created_at,
  };
}

// ── Auth ──────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const r = login(req.body.username, req.body.password);
  if (!r) return res.status(401).json({ error:'שם משתמש או סיסמה שגויים' });
  log(r.user, 'כניסה למערכת');
  res.json(r);
});

// ── Transactions ──────────────────────────────────────────────────────────────
app.get('/api/transactions', auth, (req, res) => {
  const { type, category, year, dateFrom, dateTo, search } = req.query;
  let sql = 'SELECT * FROM transactions WHERE 1=1';
  const p = [];
  if (type && type !== 'all') { sql += ' AND type=?'; p.push(type); }
  if (category) { sql += ' AND category=?'; p.push(category); }
  if (year && !dateFrom) { sql += " AND strftime('%Y',date)=?"; p.push(year); }
  if (dateFrom) { sql += ' AND date>=?'; p.push(dateFrom); }
  if (dateTo)   { sql += ' AND date<=?'; p.push(dateTo); }
  if (search)   { sql += ' AND (description LIKE ? OR party LIKE ? OR notes LIKE ?)'; p.push(`%${search}%`,`%${search}%`,`%${search}%`); }
  sql += ' ORDER BY date DESC, created_at DESC';
  res.json(db.prepare(sql).all(...p));
});

app.post('/api/transactions', auth, adminOnly, (req, res) => {
  const t = req.body;
  const id = uuid();
  db.prepare(`INSERT INTO transactions(id,date,type,description,amount,category,apt_id,party,notes,receipt_name,receipt_data,receipt_mime,created_by)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id,t.date,t.type,t.description,t.amount,t.category||'',t.aptId||'',t.party||'',t.notes||'',
      t.receipt?.name||'',t.receipt?.data||'',t.receipt?.type||'',req.user.username);
  log(req.user,'הוסיף תנועה',`${t.description} ₪${t.amount}`);
  res.json({ id });
});

app.put('/api/transactions/:id', auth, adminOnly, (req, res) => {
  const t = req.body;
  db.prepare(`UPDATE transactions SET date=?,type=?,description=?,amount=?,category=?,apt_id=?,party=?,notes=?,
    receipt_name=?,receipt_data=?,receipt_mime=? WHERE id=?`)
    .run(t.date,t.type,t.description,t.amount,t.category||'',t.aptId||'',t.party||'',t.notes||'',
      t.receipt?.name||'',t.receipt?.data||'',t.receipt?.type||'',req.params.id);
  log(req.user,'עדכן תנועה',t.description);
  res.json({ ok:true });
});

app.delete('/api/transactions/:id', auth, adminOnly, (req, res) => {
  const t = db.prepare('SELECT description FROM transactions WHERE id=?').get(req.params.id);
  db.prepare('DELETE FROM transactions WHERE id=?').run(req.params.id);
  log(req.user,'מחק תנועה',t?.description||'');
  res.json({ ok:true });
});

app.post('/api/transactions/bulk', auth, adminOnly, (req, res) => {
  const ins = db.prepare(`INSERT OR IGNORE INTO transactions(id,date,type,description,amount,category,apt_id,party,notes,created_by) VALUES(?,?,?,?,?,?,?,?,?,?)`);
  const many = db.transaction(list => list.forEach(t => ins.run(uuid(),t.date,t.type,t.description,t.amount,t.category||'',t.aptId||'',t.party||'',t.notes||'',req.user.username)));
  many(req.body.transactions||[]);
  log(req.user,'ייבא תנועות',`${req.body.transactions?.length||0} שורות`);
  res.json({ count:req.body.transactions?.length||0 });
});

// ── Apartments ────────────────────────────────────────────────────────────────
app.get('/api/apartments', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM apartments ORDER BY CAST(apt_num AS INTEGER)').all().map(aptToFront));
});

app.put('/api/apartments/:id', auth, adminOnly, (req, res) => {
  const a = req.body;
  db.prepare(`UPDATE apartments SET apt_num=?,owner_name=?,owner_phone=?,owner_email=?,
    tenant_name=?,tenant_phone=?,tenant_email=?,has_tenant=?,monthly_fee=?,notes=?,
    send_reminders=?,reminder_freq=?,reminder_day=? WHERE id=?`)
    .run(a.aptNum,a.ownerName||'',a.ownerPhone||'',a.ownerEmail||'',
      a.tenantName||'',a.tenantPhone||'',a.tenantEmail||'',a.hasTenant?1:0,
      a.monthlyFee,a.notes||'',a.sendReminders?1:0,a.reminderFreq||'חודשי',a.reminderDay||1,req.params.id);
  log(req.user,'עדכן דירה',`דירה ${a.aptNum}`);
  res.json({ ok:true });
});

// ── Stats & Reports ───────────────────────────────────────────────────────────
app.get('/api/stats', auth, (req, res) => {
  const now = new Date();
  const yr = String(now.getFullYear());
  const ym = now.toISOString().slice(0,7);
  const mp = now.getMonth()+1;

  const totalIn  = db.prepare("SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE type='income'").get().v;
  const totalOut = db.prepare("SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE type='expense'").get().v;
  const monthIn  = db.prepare("SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE type='income' AND date LIKE ?").get(`${ym}%`).v;
  const monthOut = db.prepare("SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE type='expense' AND date LIKE ?").get(`${ym}%`).v;
  const recentTx = db.prepare('SELECT * FROM transactions ORDER BY date DESC, created_at DESC LIMIT 10').all();
  const catBreak = db.prepare("SELECT category, SUM(amount) as total FROM transactions WHERE type='expense' GROUP BY category ORDER BY total DESC LIMIT 8").all();

  const apts = db.prepare('SELECT * FROM apartments').all();
  const debtors = apts.filter(a => {
    const paid = db.prepare("SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE apt_id=? AND type='income' AND strftime('%Y',date)=?").get(a.id,yr).v;
    return paid < a.monthly_fee * mp;
  }).map(a => {
    const paid = db.prepare("SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE apt_id=? AND type='income' AND strftime('%Y',date)=?").get(a.id,yr).v;
    return { ...aptToFront(a), debt: Math.round(a.monthly_fee*mp - paid) };
  });

  res.json({ totalIn, totalOut, balance:totalIn-totalOut, monthIn, monthOut, recentTx, catBreak, debtors });
});

app.get('/api/report', auth, (req, res) => {
  const { dateFrom, dateTo } = req.query;
  if (!dateFrom || !dateTo) return res.status(400).json({ error:'חסר dateFrom/dateTo' });
  const txs = db.prepare('SELECT * FROM transactions WHERE date>=? AND date<=? ORDER BY date').all(dateFrom,dateTo);
  const totalIn  = txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const totalOut = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const expByCat={}, incByCat={};
  txs.forEach(t => {
    if (t.type==='expense') expByCat[t.category]=(expByCat[t.category]||0)+t.amount;
    else incByCat[t.category]=(incByCat[t.category]||0)+t.amount;
  });
  // Debtor list for the period
  const apts = db.prepare('SELECT * FROM apartments').all();
  const debtors = apts.map(a => {
    const paid = txs.filter(t=>t.type==='income'&&t.apt_id===a.id).reduce((s,t)=>s+t.amount,0);
    const months = Math.round((new Date(dateTo)-new Date(dateFrom))/(1000*60*60*24*30))+1;
    const expected = a.monthly_fee * months;
    return { aptNum:a.apt_num, name:a.owner_name||a.tenant_name||'', paid, expected, diff:paid-expected };
  }).filter(d=>d.diff<0);
  res.json({ totalIn, totalOut, balance:totalIn-totalOut, expByCat, incByCat, txCount:txs.length, debtors });
});

// ── Audit Log ─────────────────────────────────────────────────────────────────
app.get('/api/log', auth, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 500').all());
});

// ── Settings ──────────────────────────────────────────────────────────────────
app.get('/api/settings', auth, (req, res) => {
  const rows = db.prepare('SELECT key,value FROM settings').all();
  const out = {};
  rows.forEach(r => {
    if (r.key==='gmail_app_password') out[r.key] = r.value ? '••••••••••••••••' : '';
    else out[r.key] = r.value;
  });
  res.json(out);
});

app.post('/api/settings', auth, adminOnly, (req, res) => {
  const ups = db.prepare('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)');
  const many = db.transaction(obj => { for(const [k,v] of Object.entries(obj)) if(v!==undefined) ups.run(k,String(v)); });
  many(req.body);
  // Don't log the actual password
  const safeKeys = Object.keys(req.body).filter(k=>k!=='gmail_app_password');
  log(req.user,'עדכן הגדרות',safeKeys.join(', '));
  res.json({ ok:true });
});

// ── Email ─────────────────────────────────────────────────────────────────────
app.get('/api/email/status', auth, (req, res) => {
  const gmailUser = getSetting('gmail_user');
  const gmailPass = getSetting('gmail_app_password');
  res.json({ configured:!!(gmailUser&&gmailPass), gmailUser });
});

app.post('/api/email/test', auth, adminOnly, async (req, res) => {
  try {
    const adminEmail = getSetting('admin_email') || getSetting('gmail_user');
    if (!adminEmail) return res.status(400).json({ error:'הגדר כתובת מייל מנהל' });
    await sendTest(adminEmail);
    log(req.user,'שלח מייל בדיקה','');
    res.json({ ok:true, to:adminEmail });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.post('/api/email/send/:aptId', auth, adminOnly, async (req, res) => {
  try {
    const apt = db.prepare('SELECT * FROM apartments WHERE id=?').get(req.params.aptId);
    if (!apt) return res.status(404).json({ error:'דירה לא נמצאה' });
    const now = new Date();
    const result = await sendReminder(apt, now.getFullYear(), now.getMonth()+1);
    log(req.user,'שלח תזכורת ידנית',`דירה ${apt.apt_num}`);
    res.json(result);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.post('/api/email/send-all', auth, adminOnly, async (req, res) => {
  try {
    const results = await runAll();
    const sent = results.filter(r=>r.sent).length;
    log(req.user,'שלח תזכורות לכולם',`${sent} מיילים`);
    res.json({ results, sent });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── Cron: every day 9:00 Israel time ─────────────────────────────────────────
cron.schedule('0 9 * * *', async () => {
  console.log('[CRON] Running scheduled reminders...');
  try { const r = await runAll(); console.log(`[CRON] Sent ${r.filter(x=>x.sent).length}`); }
  catch(e) { console.error('[CRON]', e.message); }
}, { timezone:'Asia/Jerusalem' });

// ── SPA fallback ──────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req,res) => res.sendFile(path.join(__dirname,'../client/build/index.html')));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Server running on :${PORT}`));
