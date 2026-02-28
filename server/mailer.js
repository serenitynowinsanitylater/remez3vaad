const nodemailer = require('nodemailer');
const db = require('./db');

const BUILDING = 'רמז 3, רמת השרון';

function getSetting(key) {
  return db.prepare('SELECT value FROM settings WHERE key=?').get(key)?.value || '';
}

function makeTransporter() {
  const user = getSetting('gmail_user');
  const pass = getSetting('gmail_app_password');
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
}

function reminderHtml(apt, debt, paid) {
  const name = apt.tenant_name || apt.owner_name || `דייר דירה ${apt.apt_num}`;
  const instr = getSetting('pay_instructions');
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif">
<div style="max-width:580px;margin:32px auto;padding:0 16px 40px">
  <div style="background:linear-gradient(135deg,#0f1f3d,#1e3560);border-radius:14px 14px 0 0;padding:28px;text-align:center">
    <div style="font-size:36px">🏢</div>
    <div style="color:#fff;font-size:20px;font-weight:700;margin-top:8px">ועד הבית</div>
    <div style="color:rgba(255,255,255,.65);font-size:13px;margin-top:4px">${BUILDING}</div>
  </div>
  <div style="background:#fff;padding:28px 32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 14px 14px">
    <p style="font-size:16px;color:#0f172a;margin:0 0 14px">שלום ${name},</p>
    <p style="color:#334155;line-height:1.75;margin:0 0 22px">
      ברצוננו להזכירך כי ישנה יתרת חוב לועד הבית עבור <strong>דירה ${apt.apt_num}</strong> ב${BUILDING}.
    </p>
    <div style="background:#fef2f2;border:2px solid #fecaca;border-radius:12px;padding:22px;text-align:center;margin:0 0 22px">
      <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.1em">יתרת חוב</div>
      <div style="font-size:42px;font-weight:800;color:#dc2626;line-height:1.1;margin:6px 0">₪${Math.round(debt).toLocaleString('he-IL')}</div>
      <div style="font-size:13px;color:#64748b">שולם השנה: ₪${Math.round(paid).toLocaleString('he-IL')} &nbsp;·&nbsp; תשלום חודשי: ₪${apt.monthly_fee.toLocaleString('he-IL')}</div>
    </div>
    <div style="background:#f0fdfa;border:2px solid #99f6e4;border-radius:12px;padding:20px;margin:0 0 22px">
      <div style="font-weight:700;color:#0d9488;margin-bottom:10px;font-size:15px">📋 הוראות תשלום</div>
      <pre style="font-family:Arial;font-size:14px;color:#0f172a;white-space:pre-wrap;margin:0;line-height:1.8">${instr}</pre>
    </div>
    <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0 0 24px">לאחר ביצוע התשלום, אנא שלח אישור בתגובה למייל זה.</p>
    <div style="padding-top:18px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center">ועד הבית — ${BUILDING}</div>
  </div>
</div>
</body></html>`;
}

function summaryHtml(results) {
  const sent = results.filter(r => r.sent);
  const rows = results.map(r => `
    <tr style="border-bottom:1px solid #e2e8f0">
      <td style="padding:8px 12px">דירה ${r.apt_num}</td>
      <td style="padding:8px 12px">${r.name}</td>
      <td style="padding:8px 12px;color:${r.sent?'#dc2626':'#16a34a'};font-weight:700">
        ${r.sent ? `₪${Math.round(r.debt).toLocaleString('he-IL')}` : (r.reason||'ללא חוב')}
      </td>
      <td style="padding:8px 12px">${r.sent?'📧 נשלח':'—'}</td>
    </tr>`).join('');
  return `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"></head>
<body style="font-family:Arial;background:#f0f4f8;padding:20px">
<div style="max-width:660px;margin:0 auto">
  <div style="background:#0f1f3d;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
    <div style="font-size:18px;font-weight:700">📊 סיכום תזכורות ועד בית</div>
    <div style="opacity:.7;font-size:13px;margin-top:4px">${new Date().toLocaleDateString('he-IL')} · ${BUILDING}</div>
  </div>
  <div style="background:#fff;padding:20px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
    <div style="display:flex;gap:12px;margin-bottom:20px">
      <div style="background:#fef2f2;border-radius:8px;padding:14px 20px;flex:1;text-align:center">
        <div style="font-size:28px;font-weight:800;color:#dc2626">${sent.length}</div>
        <div style="font-size:12px;color:#64748b">מיילים נשלחו</div>
      </div>
      <div style="background:#f0fdf4;border-radius:8px;padding:14px 20px;flex:1;text-align:center">
        <div style="font-size:28px;font-weight:800;color:#16a34a">${results.filter(r=>!r.sent&&r.debt===0).length}</div>
        <div style="font-size:12px;color:#64748b">ללא חוב</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead><tr style="background:#f8fafc">
        <th style="padding:8px 12px;text-align:right">דירה</th>
        <th style="padding:8px 12px;text-align:right">שם</th>
        <th style="padding:8px 12px;text-align:right">חוב / סטטוס</th>
        <th style="padding:8px 12px;text-align:right">פעולה</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</div></body></html>`;
}

async function sendReminder(apt, year, monthsPassed) {
  const tr = makeTransporter();
  if (!tr) throw new Error('Gmail לא מוגדר — עבור להגדרות');
  const email = apt.tenant_email || apt.owner_email;
  if (!email) throw new Error('אין כתובת מייל לדירה');

  const paid = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM transactions
    WHERE apt_id=? AND type='income' AND strftime('%Y',date)=?`).get(apt.id, String(year)).v;
  const debt = apt.monthly_fee * monthsPassed - paid;
  if (debt < 50) return { sent:false, reason:'ללא חוב', debt:0, paid };

  const gmailUser = getSetting('gmail_user');
  const adminEmail = getSetting('admin_email');
  await tr.sendMail({
    from: `"ועד הבית — ${BUILDING}" <${gmailUser}>`,
    to: email,
    replyTo: adminEmail || undefined,
    subject: `תזכורת תשלום ועד הבית — דירה ${apt.apt_num}, ${BUILDING}`,
    html: reminderHtml(apt, debt, paid),
    text: `שלום,\n\nיתרת חוב לועד הבית: ₪${Math.round(debt)}\n\n${getSetting('pay_instructions')}`,
  });
  return { sent:true, debt, paid };
}

async function sendTest(toEmail) {
  const tr = makeTransporter();
  if (!tr) throw new Error('Gmail לא מוגדר');
  const gmailUser = getSetting('gmail_user');
  await tr.sendMail({
    from: `"ועד הבית רמז 3" <${gmailUser}>`,
    to: toEmail,
    subject: '✅ בדיקה — מערכת תזכורות ועד בית רמז 3',
    html: `<div dir="rtl" style="font-family:Arial;max-width:480px;margin:20px auto;padding:24px;background:#fff;border-radius:12px;border:1px solid #e2e8f0">
      <h2 style="color:#0d9488">✅ המערכת פועלת!</h2>
      <p>מערכת התזכורות של ועד בית <strong>${BUILDING}</strong> מחוברת ופועלת תקין.</p>
      <p style="color:#64748b;font-size:14px">מיילים ישלחו אוטומטית כל יום בשעה 09:00 לדיירים עם חוב, לפי לוח הזמנים שהוגדר.</p>
    </div>`,
    text: 'מערכת התזכורות פועלת תקין!',
  });
}

async function runAll() {
  const now = new Date();
  const yr = now.getFullYear();
  const mp = now.getMonth() + 1;
  const dom = now.getDate();
  const dow = now.getDay() + 1;

  const apts = db.prepare('SELECT * FROM apartments WHERE send_reminders=1').all();
  const results = [];

  for (const apt of apts) {
    const freq = apt.reminder_freq || 'חודשי';
    const day = apt.reminder_day || 1;
    let ok = false;
    if (freq === 'שבועי')    ok = dow === 1;
    if (freq === 'דו-שבועי') ok = dow === 1 && Math.ceil(dom/7) % 2 === 1;
    if (freq === 'חודשי')    ok = dom === day;
    if (!ok) continue;

    try {
      const r = await sendReminder(apt, yr, mp);
      results.push({ apt_num:apt.apt_num, name:apt.owner_name||apt.tenant_name||'', ...r });
    } catch(e) {
      results.push({ apt_num:apt.apt_num, name:apt.owner_name||'', sent:false, reason:e.message, debt:0 });
    }
  }

  // Send admin summary
  const adminEmail = getSetting('admin_email');
  const tr = makeTransporter();
  if (adminEmail && tr && results.length > 0) {
    const gmailUser = getSetting('gmail_user');
    await tr.sendMail({
      from: `"ועד הבית רמז 3" <${gmailUser}>`,
      to: adminEmail,
      subject: `📊 סיכום תזכורות ${now.toLocaleDateString('he-IL')}`,
      html: summaryHtml(results),
      text: `נשלחו ${results.filter(r=>r.sent).length} מיילים`,
    }).catch(() => {});
  }
  return results;
}

module.exports = { sendReminder, sendTest, runAll, makeTransporter, getSetting };
