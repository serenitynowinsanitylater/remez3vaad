import { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { api, setToken, clearToken } from './api';

// ─── Constants ────────────────────────────────────────────────────────────────
const BUILDING = 'רמז 3, רמת השרון';
const EXPENSE_CATS = ['אינסטלציה וביוב','גינון וחומרים','ניקיון','חומרי ניקוי','ביטוח','חשמל','מעלית',"הוצ' בנק","הוצ' שונות",'אחר'];
const INCOME_CATS  = ['תשלום ועד בית','דמי ניהול','החזר','הכנסה מהבנק','אחר'];
const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const USERS  = ['דן קליינמן','דייויד גורדון','רן לבנת'];
const fmt    = n => new Intl.NumberFormat('he-IL',{style:'currency',currency:'ILS',minimumFractionDigits:0}).format(n||0);
const today  = () => new Date().toISOString().slice(0,10);

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&family=Rubik:wght@400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --navy:#0f1f3d;--teal:#0d9488;--teal-l:#14b8a6;--teal-bg:#f0fdfa;
  --blue:#2563eb;--blue-bg:#eff6ff;--red:#dc2626;--red-bg:#fef2f2;
  --green:#16a34a;--green-bg:#f0fdf4;--amber:#d97706;--amber-bg:#fffbeb;
  --purple:#7c3aed;--purple-bg:#f5f3ff;
  --sl1:#f8fafc;--sl2:#f1f5f9;--sl3:#e2e8f0;--sl5:#94a3b8;--sl6:#64748b;
  --text:#0f172a;--text2:#334155;--text3:#64748b;
  --r8:8px;--r12:12px;--r16:16px;
  --sh1:0 1px 3px rgba(0,0,0,.07);--sh2:0 4px 12px rgba(0,0,0,.08);--sh3:0 10px 30px rgba(0,0,0,.12);
}
html,body{height:100%;font-family:'Heebo',sans-serif;background:#eef2f7;color:var(--text);direction:rtl}
button{cursor:pointer;font-family:inherit}
input,select,textarea{font-family:inherit;direction:rtl}
a{color:inherit;text-decoration:none}

/* Login */
.login-bg{min-height:100vh;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(145deg,#0a1628,#0f2a4a,#0a3d3a);padding:1rem;overflow:hidden;position:relative}
.login-bg::after{content:'3';position:absolute;font-family:'Rubik',sans-serif;font-size:24rem;font-weight:800;
  color:rgba(255,255,255,.025);right:-1rem;bottom:-4rem;pointer-events:none;user-select:none}
.login-card{background:white;border-radius:20px;padding:2.5rem;width:100%;max-width:400px;box-shadow:0 30px 70px rgba(0,0,0,.4);z-index:1}
.login-ic{font-size:3rem;text-align:center}
.login-title{font-family:'Rubik',sans-serif;font-size:1.4rem;font-weight:700;text-align:center;color:var(--navy);margin-top:.4rem}
.login-addr{text-align:center;color:var(--text3);font-size:.85rem;margin-top:.1rem;margin-bottom:1.8rem}
.lf{margin-bottom:.9rem}
.lf label{display:block;font-size:.82rem;font-weight:700;color:var(--text2);margin-bottom:.3rem}
.lf input,.lf select{width:100%;padding:.7rem .9rem;border:1.5px solid var(--sl3);border-radius:var(--r8);font-size:.95rem;outline:none;transition:border-color .15s}
.lf input:focus,.lf select:focus{border-color:var(--teal)}
.login-btn{width:100%;padding:.85rem;background:var(--teal);color:white;border:none;border-radius:var(--r8);
  font-size:1rem;font-weight:700;font-family:'Rubik',sans-serif;transition:all .15s;margin-top:.5rem}
.login-btn:hover{background:#0f766e}.login-btn:active{transform:scale(.98)}
.login-err{background:var(--red-bg);color:var(--red);padding:.6rem .9rem;border-radius:var(--r8);
  font-size:.85rem;margin-bottom:.8rem;border:1px solid #fecaca;text-align:center}

/* Shell */
.shell{display:flex;height:100vh;overflow:hidden}
.sb{width:220px;flex-shrink:0;background:var(--navy);color:white;display:flex;flex-direction:column}
.sb-logo{padding:1.1rem;border-bottom:1px solid rgba(255,255,255,.08)}
.sb-bldg{font-family:'Rubik',sans-serif;font-size:.85rem;font-weight:700;color:#e2e8f0;line-height:1.3;margin-top:.3rem}
.sb-sub{font-size:.7rem;color:var(--sl5);margin-top:.1rem}
.sb-nav{flex:1;padding:.6rem;display:flex;flex-direction:column;gap:.1rem;overflow-y:auto}
.sbi{display:flex;align-items:center;gap:.6rem;padding:.58rem .75rem;border-radius:var(--r8);color:#94a3b8;
  font-size:.865rem;font-weight:500;cursor:pointer;transition:all .12s;border:none;background:none;width:100%;text-align:right}
.sbi:hover{background:rgba(255,255,255,.06);color:#e2e8f0}.sbi.on{background:var(--teal);color:white}
.sbi-ic{font-size:.95rem;width:18px;text-align:center;flex-shrink:0}
.sb-foot{padding:.6rem;border-top:1px solid rgba(255,255,255,.08)}
.sb-who{display:flex;align-items:center;gap:.5rem;padding:.4rem .75rem;margin-bottom:.2rem}
.sb-av{width:28px;height:28px;border-radius:50%;background:var(--teal);color:white;font-size:.7rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sb-wname{font-size:.78rem;color:#cbd5e1;font-weight:600}
.sb-wrole{font-size:.67rem;color:var(--sl5)}
.sb-out{display:flex;align-items:center;gap:.55rem;padding:.5rem .75rem;color:#94a3b8;font-size:.8rem;cursor:pointer;border-radius:var(--r8);border:none;background:none;width:100%;transition:all .12s}
.sb-out:hover{color:#f87171;background:rgba(248,113,113,.08)}

.main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
.topbar{background:white;border-bottom:1px solid var(--sl3);padding:.8rem 1.3rem;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.topbar-title{font-family:'Rubik',sans-serif;font-size:1.1rem;font-weight:700;color:var(--navy)}
.topbar-date{font-size:.78rem;color:var(--text3)}
.content{flex:1;overflow-y:auto;padding:1.2rem 1.3rem}

/* Cards */
.card{background:white;border-radius:var(--r12);border:1px solid var(--sl3);box-shadow:var(--sh1)}
.card-hd{padding:.82rem 1.1rem;border-bottom:1px solid var(--sl3);display:flex;align-items:center;justify-content:space-between}
.card-hd h3{font-size:.92rem;font-weight:700}
.card-bd{padding:1.1rem}

/* Stats */
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.9rem;margin-bottom:1.1rem}
.stat{background:white;border-radius:var(--r12);border:1px solid var(--sl3);padding:.9rem 1.1rem;box-shadow:var(--sh1)}
.stat-lbl{font-size:.69rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3)}
.stat-v{font-family:'Rubik',sans-serif;font-size:1.45rem;font-weight:700;margin-top:.25rem}
.stat-v.g{color:var(--green)}.stat-v.r{color:var(--red)}.stat-v.b{color:var(--blue)}.stat-v.a{color:var(--amber)}.stat-v.p{color:var(--purple)}
.stat-sub{font-size:.72rem;color:var(--text3);margin-top:.15rem}

/* Table */
.tw{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:.862rem}
th{background:var(--sl1);color:var(--text3);font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:.58rem .85rem;text-align:right;border-bottom:2px solid var(--sl3);white-space:nowrap}
td{padding:.62rem .85rem;border-bottom:1px solid var(--sl3);vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:var(--sl1)}

/* Badges */
.b{display:inline-flex;align-items:center;padding:.16rem .5rem;border-radius:999px;font-size:.69rem;font-weight:700}
.bg{background:var(--green-bg);color:var(--green)}.br{background:var(--red-bg);color:var(--red)}
.bb{background:var(--blue-bg);color:var(--blue)}.ba{background:var(--amber-bg);color:var(--amber)}
.bs{background:var(--sl2);color:var(--text3)}.bt{background:var(--teal-bg);color:var(--teal)}
.bp{background:var(--purple-bg);color:var(--purple)}

/* Buttons */
.btn{display:inline-flex;align-items:center;gap:.35rem;padding:.5rem .88rem;border-radius:var(--r8);font-size:.865rem;font-weight:600;border:none;cursor:pointer;transition:all .12s;white-space:nowrap}
.btn-p{background:var(--teal);color:white}.btn-p:hover{background:#0f766e}
.btn-b{background:var(--blue);color:white}.btn-b:hover{background:#1d4ed8}
.btn-o{background:white;color:var(--text2);border:1.5px solid var(--sl3)}.btn-o:hover{border-color:var(--teal);color:var(--teal)}
.btn-r{background:var(--red);color:white}.btn-r:hover{background:#b91c1c}
.btn-g{background:var(--green);color:white}.btn-g:hover{background:#15803d}
.btn-ghost{background:transparent;color:var(--text3);padding:.38rem}.btn-ghost:hover{color:var(--red)}
.btn-sm{padding:.3rem .6rem;font-size:.78rem}
.btn-ic{padding:.42rem;border-radius:var(--r8);background:var(--sl2);color:var(--text2);border:none}.btn-ic:hover{background:var(--sl3)}
.btn:disabled{opacity:.5;cursor:not-allowed}

/* Forms */
.fg{display:flex;flex-direction:column;gap:.3rem}
.fg label{font-size:.79rem;font-weight:700;color:var(--text2)}
.fc{padding:.56rem .75rem;border:1.5px solid var(--sl3);border-radius:var(--r8);font-size:.875rem;outline:none;background:white;width:100%;transition:border-color .15s}
.fc:focus{border-color:var(--teal);box-shadow:0 0 0 3px rgba(13,148,136,.1)}
.fc-lg{font-size:1.2rem;font-weight:700;padding:.68rem .9rem;font-family:'Rubik',sans-serif}
.fgrid{display:grid;gap:.75rem}
.fg2{grid-template-columns:1fr 1fr}.fg3{grid-template-columns:1fr 1fr 1fr}.fg4{grid-template-columns:1fr 1fr 1fr 1fr}
.fs2{grid-column:span 2}.fs3{grid-column:span 3}.fs4{grid-column:span 4}

/* Modal */
.ov{position:fixed;inset:0;background:rgba(10,22,44,.55);display:flex;align-items:center;justify-content:center;z-index:999;padding:1rem;backdrop-filter:blur(3px)}
.modal{background:white;border-radius:var(--r16);width:100%;max-width:620px;box-shadow:var(--sh3);max-height:92vh;display:flex;flex-direction:column}
.modal-lg{max-width:820px}.modal-sm{max-width:460px}
.modal-hd{padding:.95rem 1.3rem;border-bottom:1px solid var(--sl3);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.modal-hd h3{font-size:1rem;font-weight:700;font-family:'Rubik',sans-serif}
.modal-bd{padding:1.3rem;overflow-y:auto;flex:1}
.modal-ft{padding:.82rem 1.3rem;border-top:1px solid var(--sl3);display:flex;gap:.55rem;justify-content:flex-end;flex-shrink:0}
.mx{background:none;border:none;font-size:1.15rem;color:var(--text3);cursor:pointer;padding:.2rem;line-height:1}
.mx:hover{color:var(--red)}

/* Type toggle */
.tt{display:flex;background:var(--sl2);border-radius:var(--r8);padding:3px;gap:3px}
.tt-o{flex:1;padding:.46rem;border:none;border-radius:6px;font-size:.865rem;font-weight:600;cursor:pointer;transition:all .15s;background:transparent;color:var(--text3)}
.tt-in{background:white;color:var(--green);box-shadow:var(--sh1)}.tt-ex{background:white;color:var(--red);box-shadow:var(--sh1)}

/* Dropzone */
.dz{border:2px dashed var(--sl3);border-radius:var(--r12);padding:1.4rem;text-align:center;cursor:pointer;transition:all .15s;position:relative}
.dz:hover,.dz.drag{border-color:var(--teal);background:var(--teal-bg)}
.dz input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}

/* Tabs */
.tabs{display:flex;border-bottom:2px solid var(--sl3);margin-bottom:1.1rem}
.tab{padding:.58rem 1rem;font-size:.865rem;font-weight:600;color:var(--text3);cursor:pointer;border:none;background:none;border-bottom:2px solid transparent;margin-bottom:-2px;transition:all .12s}
.tab:hover{color:var(--teal)}.tab.on{color:var(--teal);border-bottom-color:var(--teal)}

/* Toggle */
.tgl{position:relative;display:inline-block;width:38px;height:22px;flex-shrink:0}
.tgl input{opacity:0;width:0;height:0}
.tgl-sl{position:absolute;inset:0;background:var(--sl3);border-radius:11px;cursor:pointer;transition:.2s}
.tgl-sl::before{content:'';position:absolute;width:16px;height:16px;left:3px;bottom:3px;background:white;border-radius:50%;transition:.2s}
.tgl input:checked+.tgl-sl{background:var(--teal)}
.tgl input:checked+.tgl-sl::before{transform:translateX(16px)}

/* Apt card */
.apt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(285px,1fr));gap:.9rem}
.apt-card{background:white;border:1.5px solid var(--sl3);border-radius:var(--r12);padding:1rem;cursor:pointer;transition:all .15s}
.apt-card:hover{border-color:var(--teal);box-shadow:var(--sh2);transform:translateY(-1px)}
.apt-card.debt{border-color:#fecaca}

/* Section box */
.sbox{border:1.5px solid var(--sl3);border-radius:var(--r12);padding:.9rem;margin-bottom:.8rem}
.stitle{font-size:.78rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.65rem}

/* Report */
.rpt-s{border:1px solid var(--sl3);border-radius:var(--r12);overflow:hidden;margin-bottom:.9rem}
.rpt-hd{background:var(--sl1);padding:.62rem .9rem;font-weight:700;font-size:.88rem;display:flex;justify-content:space-between;border-bottom:1px solid var(--sl3)}
.rpt-row{display:flex;justify-content:space-between;padding:.52rem .9rem;border-bottom:1px solid var(--sl3);font-size:.855rem}
.rpt-row:last-child{border-bottom:none}
.rpt-tot{background:var(--blue-bg);color:var(--blue);font-weight:700}
.rpt-pos{background:var(--green-bg);color:var(--green);font-weight:700;font-size:.95rem;padding:.72rem .9rem;border-radius:var(--r8);display:flex;justify-content:space-between}
.rpt-neg{background:var(--red-bg);color:var(--red);font-weight:700;font-size:.95rem;padding:.72rem .9rem;border-radius:var(--r8);display:flex;justify-content:space-between}

/* Gmail status */
.gmail-connected{background:var(--green-bg);border:1.5px solid #bbf7d0;border-radius:var(--r12);padding:1rem;display:flex;align-items:center;gap:.8rem;margin-bottom:1rem}
.gmail-disconnected{background:var(--amber-bg);border:1.5px solid #fde68a;border-radius:var(--r12);padding:1rem;margin-bottom:1rem}

/* Log */
.log-item{display:flex;gap:.75rem;padding:.55rem 0;border-bottom:1px solid var(--sl3)}
.log-item:last-child{border-bottom:none}
.log-av{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:700;flex-shrink:0;margin-top:.1rem}

/* Progress */
.prog{height:5px;background:var(--sl2);border-radius:3px;overflow:hidden}
.prog-b{height:100%;border-radius:3px;transition:width .4s}

/* Toast */
.toast-w{position:fixed;bottom:1.3rem;right:1.3rem;z-index:9999;display:flex;flex-direction:column;gap:.4rem;pointer-events:none}
.toast{background:var(--navy);color:white;padding:.6rem 1rem;border-radius:var(--r8);font-size:.83rem;font-weight:500;box-shadow:var(--sh3);animation:sIn .18s ease;pointer-events:none}
.toast.ok{background:var(--green)}.toast.err{background:var(--red)}
@keyframes sIn{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}

/* Misc */
.row{display:flex;align-items:center;gap:.65rem}
.row-b{display:flex;align-items:center;justify-content:space-between}
.mb{margin-bottom:1rem}.mb-s{margin-bottom:.5rem}
.tm{color:var(--text3)}.ts{font-size:.8rem}.txs{font-size:.7rem}
.fw7{font-weight:700}.mono{font-family:'Rubik',sans-serif}
.empty{text-align:center;padding:2.5rem;color:var(--text3)}
.empty-ic{font-size:2.5rem;margin-bottom:.5rem}
.hr{height:1px;background:var(--sl3);margin:.8rem 0}
.spin{animation:spin 1s linear infinite;display:inline-block}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:var(--sl3);border-radius:3px}
@media(max-width:860px){.stats{grid-template-columns:1fr 1fr}.fg3,.fg4{grid-template-columns:1fr 1fr}.sb{width:190px}}
@media(max-width:600px){.sb{display:none}.stats{grid-template-columns:1fr 1fr}.fg2,.fg3,.fg4{grid-template-columns:1fr}.fs2,.fs3,.fs4{grid-column:span 1}}
@media print{.sb,.topbar,.no-print{display:none!important}.content{padding:0!important}}
`;

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useToast() {
  const [ts, setTs] = useState([]);
  const add = useCallback((msg, type = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setTs(p => [...p, { id, msg, type }]);
    setTimeout(() => setTs(p => p.filter(t => t.id !== id)), 3000);
  }, []);
  const Host = () => (
    <div className="toast-w">
      {ts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>)}
    </div>
  );
  return { toast: add, ToastHost: Host };
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, footer, size = '' }) {
  if (!open) return null;
  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size}`}>
        <div className="modal-hd"><h3>{title}</h3><button className="mx" onClick={onClose}>✕</button></div>
        <div className="modal-bd">{children}</div>
        {footer && <div className="modal-ft">{footer}</div>}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <label className="tgl">
      <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} />
      <span className="tgl-sl" />
    </label>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [who, setWho] = useState(USERS[0]);
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const go = async () => {
    setLoading(true); setErr('');
    try {
      const r = await api.login(who, pass);
      setToken(r.token);
      onLogin(r.user);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-ic">🏢</div>
        <div className="login-title">ועד הבית</div>
        <div className="login-addr">{BUILDING}</div>
        {err && <div className="login-err">{err}</div>}
        <div className="lf"><label>משתמש</label>
          <select value={who} onChange={e => { setWho(e.target.value); setErr(''); }}>
            {USERS.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div className="lf"><label>סיסמה</label>
          <input type="password" value={pass} onChange={e => { setPass(e.target.value); setErr(''); }}
            onKeyDown={e => e.key === 'Enter' && go()} placeholder="הכנס סיסמה" />
        </div>
        <button className="login-btn" onClick={go} disabled={loading}>
          {loading ? '⏳ מתחבר...' : 'כניסה →'}
        </button>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ toast }) {
  const [data, setData] = useState(null);
  const now = new Date();

  useEffect(() => {
    api.getStats().then(setData).catch(e => toast(e.message, 'err'));
  }, []);

  if (!data) return <div className="empty"><span className="spin">⏳</span></div>;
  const { totalIn, totalOut, balance, monthIn, monthOut, recentTx, catBreak, debtors } = data;
  const maxCat = catBreak[0]?.total || 1;

  return (
    <div>
      <div className="stats">
        <div className="stat"><div className="stat-lbl">יתרה כוללת</div><div className={`stat-v mono ${balance >= 0 ? 'g' : 'r'}`}>{fmt(balance)}</div><div className="stat-sub">הכנסות פחות הוצאות</div></div>
        <div className="stat"><div className="stat-lbl">הכנסות {MONTHS[now.getMonth()]}</div><div className="stat-v mono g">{fmt(monthIn)}</div></div>
        <div className="stat"><div className="stat-lbl">הוצאות {MONTHS[now.getMonth()]}</div><div className="stat-v mono r">{fmt(monthOut)}</div></div>
        <div className="stat"><div className="stat-lbl">דירות עם חוב</div><div className="stat-v mono a">{debtors.length}</div><div className="stat-sub">מתוך 26</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1rem' }}>
        <div className="card">
          <div className="card-hd"><h3>תנועות אחרונות</h3></div>
          <div className="tw">
            {!recentTx?.length ? <div className="empty"><div className="empty-ic">📭</div><p>אין תנועות</p></div> :
              <table><thead><tr><th>תאריך</th><th>תיאור</th><th>סוג</th><th>סכום</th></tr></thead>
                <tbody>{recentTx.map(t => (
                  <tr key={t.id}>
                    <td className="tm txs">{t.date}</td>
                    <td><div className="fw7 ts">{t.description}</div>{t.party && <div className="txs tm">{t.party}</div>}</td>
                    <td><span className={`b ${t.type === 'income' ? 'bg' : 'br'}`}>{t.type === 'income' ? 'הכנסה' : 'הוצאה'}</span></td>
                    <td className="mono fw7 ts" style={{ color: t.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                      {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                    </td>
                  </tr>
                ))}</tbody>
              </table>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ flex: 1 }}>
            <div className="card-hd"><h3>הוצאות לפי קטגוריה</h3></div>
            <div className="card-bd">
              {catBreak.map(c => (
                <div key={c.category} style={{ marginBottom: '.65rem' }}>
                  <div className="row-b mb-s"><span className="ts">{c.category}</span><span className="ts fw7">{fmt(c.total)}</span></div>
                  <div className="prog"><div className="prog-b" style={{ width: `${c.total / maxCat * 100}%`, background: 'var(--teal)' }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-hd"><h3>⚠️ חייבים</h3></div>
            {!debtors.length
              ? <div className="empty" style={{ padding: '1rem' }}><span style={{ fontSize: '1.5rem' }}>✅</span><p className="ts" style={{ marginTop: '.3rem' }}>כולם עדכניים</p></div>
              : <div className="tw"><table><thead><tr><th>דירה</th><th>שם</th><th>חוב</th></tr></thead>
                <tbody>{debtors.slice(0, 6).map(a => (
                  <tr key={a.id}><td><span className="b bt">דירה {a.aptNum}</span></td>
                    <td className="ts">{a.ownerName || '?'}</td>
                    <td className="mono fw7 ts" style={{ color: 'var(--red)' }}>{fmt(a.debt)}</td></tr>
                ))}</tbody></table></div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
function Transactions({ user, toast }) {
  const isAdmin = user.role === 'admin';
  const [txs, setTxs] = useState([]);
  const [apts, setApts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showReceipt, setShowReceipt] = useState(null);
  const [editT, setEditT] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [fType, setFType] = useState('all');
  const [fCat, setFCat] = useState('');
  const [fYear, setFYear] = useState(String(new Date().getFullYear()));
  const [fDateFrom, setFDateFrom] = useState('');
  const [fDateTo, setFDateTo] = useState('');
  const [useRange, setUseRange] = useState(false);

  const blank = { date: today(), type: 'income', description: '', amount: '', category: 'תשלום ועד בית', aptId: '', party: '', notes: '', receipt: null };
  const [form, setForm] = useState(blank);
  const up = d => setForm(p => ({ ...p, ...d }));
  const cats = form.type === 'income' ? INCOME_CATS : EXPENSE_CATS;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { type: fType, search };
      if (fCat) params.category = fCat;
      if (useRange) { if (fDateFrom) params.dateFrom = fDateFrom; if (fDateTo) params.dateTo = fDateTo; }
      else if (fYear) params.year = fYear;
      const data = await api.getTx(params);
      setTxs(data);
    } catch (e) { toast(e.message, 'err'); }
    finally { setLoading(false); }
  }, [fType, fCat, fYear, fDateFrom, fDateTo, useRange, search]);

  useEffect(() => { api.getApts().then(setApts).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  const years = [...new Set([...txs.map(t => t.date?.slice(0, 4)), String(new Date().getFullYear())])].filter(Boolean).sort().reverse();
  const tIn = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const tOut = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const saveTx = async () => {
    if (!form.description) return toast('הכנס תיאור', 'err');
    if (!form.amount) return toast('הכנס סכום', 'err');
    try {
      if (editT) await api.updateTx(editT.id, { ...form, amount: parseFloat(form.amount) });
      else await api.addTx({ ...form, amount: parseFloat(form.amount) });
      toast(editT ? 'עודכן ✓' : 'נשמר ✓');
      setShowAdd(false); setEditT(null); setForm(blank);
      load();
    } catch (e) { toast(e.message, 'err'); }
  };

  const delTx = async id => {
    if (!window.confirm('למחוק?')) return;
    try { await api.deleteTx(id); toast('נמחק'); load(); }
    catch (e) { toast(e.message, 'err'); }
  };

  const handleReceipt = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => up({ receipt: { name: f.name, data: ev.target.result, type: f.type } });
    r.readAsDataURL(f);
  };

  const handleImport = async e => {
    const file = e.target.files[0]; if (!file) return;
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    const imported = rows.map(row => {
      const amount = parseFloat(row['סכום'] || row['amount'] || 0);
      if (!amount) return null;
      const typeR = String(row['סוג'] || row['type'] || '');
      const type = typeR.includes('הכנסה') || typeR.toLowerCase().includes('income') ? 'income' : 'expense';
      let dateR = String(row['תאריך'] || row['date'] || today());
      if (/^\d+$/.test(dateR)) { const d = XLSX.SSF.parse_date_code(parseInt(dateR)); dateR = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`; }
      else if (dateR.includes('/')) { const p = dateR.split('/'); if (p.length === 3 && p[2].length === 4) dateR = `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`; }
      return { date: dateR, type, description: String(row['תיאור'] || row['description'] || '—'), amount: Math.abs(amount), category: String(row['קטגוריה'] || row['category'] || (type === 'income' ? 'תשלום ועד בית' : 'אחר')), party: String(row['שם'] || row['party'] || ''), notes: String(row['הערות'] || '') };
    }).filter(Boolean);
    if (!imported.length) return toast('לא נמצאו שורות', 'err');
    try { const r = await api.bulkTx(imported); toast(`יובאו ${r.count} תנועות ✓`); setShowImport(false); load(); }
    catch (e) { toast(e.message, 'err'); }
  };

  const allCats = [...new Set([...EXPENSE_CATS, ...INCOME_CATS])];

  return (
    <div>
      {/* Toolbar */}
      <div className="row mb" style={{ flexWrap: 'wrap', gap: '.55rem' }}>
        {isAdmin && <button className="btn btn-p" onClick={() => { setEditT(null); setForm(blank); setShowAdd(true); }}>+ הוסף תנועה</button>}
        {isAdmin && <button className="btn btn-o" onClick={() => setShowImport(true)}>📥 ייבוא Excel</button>}
        <input className="fc" style={{ flex: 1, minWidth: 160 }} placeholder="🔍 חפש תיאור / שם..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="fc" style={{ width: 'auto' }} value={fType} onChange={e => setFType(e.target.value)}>
          <option value="all">הכל</option><option value="income">הכנסות</option><option value="expense">הוצאות</option>
        </select>
        <select className="fc" style={{ width: 'auto' }} value={fCat} onChange={e => setFCat(e.target.value)}>
          <option value="">כל הקטגוריות</option>{allCats.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Date range / year filter */}
      <div className="card mb" style={{ padding: '.75rem 1rem' }}>
        <div className="row" style={{ flexWrap: 'wrap', gap: '.7rem' }}>
          <div className="row" style={{ gap: '.4rem' }}>
            <button className={`btn btn-sm ${!useRange ? 'btn-p' : 'btn-o'}`} onClick={() => setUseRange(false)}>לפי שנה</button>
            <button className={`btn btn-sm ${useRange ? 'btn-p' : 'btn-o'}`} onClick={() => setUseRange(true)}>טווח תאריכים</button>
          </div>
          {!useRange
            ? <select className="fc" style={{ width: 'auto' }} value={fYear} onChange={e => setFYear(e.target.value)}>
              <option value="">כל השנים</option>{years.map(y => <option key={y}>{y}</option>)}
            </select>
            : <div className="row" style={{ gap: '.5rem', flexWrap: 'wrap' }}>
              <div className="fg" style={{ flexDirection: 'row', alignItems: 'center', gap: '.4rem' }}>
                <label className="ts fw7" style={{ whiteSpace: 'nowrap' }}>מ:</label>
                <input type="date" className="fc" style={{ width: 'auto' }} value={fDateFrom} onChange={e => setFDateFrom(e.target.value)} />
              </div>
              <div className="fg" style={{ flexDirection: 'row', alignItems: 'center', gap: '.4rem' }}>
                <label className="ts fw7" style={{ whiteSpace: 'nowrap' }}>עד:</label>
                <input type="date" className="fc" style={{ width: 'auto' }} value={fDateTo} onChange={e => setFDateTo(e.target.value)} />
              </div>
            </div>}
        </div>
      </div>

      {/* Mini stats */}
      <div className="stats" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: '1rem' }}>
        <div className="stat"><div className="stat-lbl">הכנסות</div><div className="stat-v mono g" style={{ fontSize: '1.2rem' }}>{fmt(tIn)}</div></div>
        <div className="stat"><div className="stat-lbl">הוצאות</div><div className="stat-v mono r" style={{ fontSize: '1.2rem' }}>{fmt(tOut)}</div></div>
        <div className="stat"><div className="stat-lbl">יתרה</div><div className={`stat-v mono ${tIn - tOut >= 0 ? 'g' : 'r'}`} style={{ fontSize: '1.2rem' }}>{fmt(tIn - tOut)}</div></div>
      </div>

      <div className="card">
        {loading ? <div className="empty"><span className="spin">⏳</span></div> :
          <div className="tw">
            {!txs.length ? <div className="empty"><div className="empty-ic">📭</div><p>לא נמצאו תנועות</p></div> :
              <table>
                <thead><tr><th>תאריך</th><th>תיאור</th><th>סוג</th><th>קטגוריה</th><th>דייר/ספק</th><th>קבלה</th><th>סכום</th>{isAdmin && <th></th>}</tr></thead>
                <tbody>{txs.map(t => {
                  const apt = apts.find(a => a.id === t.apt_id);
                  return (
                    <tr key={t.id}>
                      <td className="txs tm" style={{ whiteSpace: 'nowrap' }}>{t.date}</td>
                      <td><div className="fw7 ts">{t.description}</div>{t.notes && <div className="txs tm">{t.notes}</div>}</td>
                      <td><span className={`b ${t.type === 'income' ? 'bg' : 'br'}`}>{t.type === 'income' ? 'הכנסה' : 'הוצאה'}</span></td>
                      <td><span className="b bs">{t.category}</span></td>
                      <td className="ts">{t.party || (apt ? `דירה ${apt.aptNum}` : '—')}</td>
                      <td>{t.receipt_data ? <img src={t.receipt_data} onClick={() => setShowReceipt(t)} style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: 5, cursor: 'pointer', border: '1px solid var(--sl3)' }} alt="" /> : <span className="txs tm">—</span>}</td>
                      <td className="mono fw7 ts" style={{ color: t.type === 'income' ? 'var(--green)' : 'var(--red)', whiteSpace: 'nowrap' }}>{t.type === 'income' ? '+' : '-'}{fmt(t.amount)}</td>
                      {isAdmin && <td><div className="row" style={{ gap: '.3rem' }}>
                        <button className="btn-ic" style={{ padding: '.28rem .45rem', fontSize: '.78rem' }} onClick={() => { setEditT(t); setForm({ date: t.date, type: t.type, description: t.description, amount: String(t.amount), category: t.category, aptId: t.apt_id, party: t.party, notes: t.notes, receipt: t.receipt_data ? { name: t.receipt_name, data: t.receipt_data, type: t.receipt_mime } : null }); setShowAdd(true); }}>✏️</button>
                        <button className="btn-ghost" onClick={() => delTx(t.id)}>🗑</button>
                      </div></td>}
                    </tr>
                  );
                })}</tbody>
              </table>}
          </div>}
      </div>

      {/* Add/Edit */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditT(null); }} title={editT ? 'עריכת תנועה' : 'הוספת תנועה'}
        footer={<><button className="btn btn-o" onClick={() => { setShowAdd(false); setEditT(null); }}>ביטול</button><button className="btn btn-p" onClick={saveTx}>{editT ? 'שמור שינויים' : 'שמור'}</button></>}>
        <div className="fgrid fg2">
          <div className="fg fs2"><label>סוג תנועה</label>
            <div className="tt">
              <button className={`tt-o ${form.type === 'income' ? 'tt-in' : ''}`} onClick={() => up({ type: 'income', category: 'תשלום ועד בית' })}>✅ הכנסה</button>
              <button className={`tt-o ${form.type === 'expense' ? 'tt-ex' : ''}`} onClick={() => up({ type: 'expense', category: EXPENSE_CATS[0] })}>❌ הוצאה</button>
            </div>
          </div>
          <div className="fg"><label>תאריך</label><input type="date" className="fc" value={form.date} onChange={e => up({ date: e.target.value })} /></div>
          <div className="fg"><label>סכום ₪</label><input type="number" className="fc fc-lg" placeholder="0" value={form.amount} onChange={e => up({ amount: e.target.value })} /></div>
          <div className="fg fs2"><label>תיאור</label><input className="fc" placeholder="תיאור קצר" value={form.description} onChange={e => up({ description: e.target.value })} /></div>
          <div className="fg"><label>קטגוריה</label><select className="fc" value={form.category} onChange={e => up({ category: e.target.value })}>{cats.map(c => <option key={c}>{c}</option>)}</select></div>
          <div className="fg"><label>{form.type === 'income' ? 'דירה' : 'ספק'}</label>
            {form.type === 'income'
              ? <select className="fc" value={form.aptId} onChange={e => { const a = apts.find(a => a.id === e.target.value); up({ aptId: e.target.value, party: a ? (a.tenantName || a.ownerName || '') : '' }); }}>
                <option value="">— בחר דירה —</option>
                {apts.map(a => <option key={a.id} value={a.id}>דירה {a.aptNum} – {a.ownerName || '?'}</option>)}
              </select>
              : <input className="fc" placeholder="שם הספק" value={form.party} onChange={e => up({ party: e.target.value })} />}
          </div>
          <div className="fg fs2"><label>הערות / מס' קבלה</label><input className="fc" value={form.notes} onChange={e => up({ notes: e.target.value })} /></div>
          <div className="fg fs2"><label>קבלה / חשבונית</label>
            <div className="dz" style={{ padding: '1rem' }}>
              <input type="file" accept="image/*,application/pdf" onChange={handleReceipt} />
              {form.receipt
                ? <div className="row" style={{ justifyContent: 'center', gap: '.7rem' }}>
                  {form.receipt.type?.startsWith('image') && <img src={form.receipt.data} style={{ height: 50, borderRadius: 5 }} alt="" />}
                  <div><div className="ts fw7">{form.receipt.name}</div><div className="txs tm">מצורף ✓</div></div>
                  <button className="btn-ghost" onClick={e => { e.preventDefault(); up({ receipt: null }); }}>✕</button>
                </div>
                : <><div style={{ fontSize: '2rem' }}>📎</div><div className="ts fw7">לחץ לבחירת קובץ</div><div className="txs tm">JPG, PNG, PDF</div></>}
            </div>
          </div>
        </div>
      </Modal>

      {/* Receipt viewer */}
      <Modal open={!!showReceipt} onClose={() => setShowReceipt(null)} title="קבלה" size="modal-sm">
        {showReceipt?.receipt_mime?.startsWith('image')
          ? <img src={showReceipt.receipt_data} style={{ width: '100%', borderRadius: 8 }} alt="" />
          : <p className="ts tm">{showReceipt?.receipt_name}</p>}
      </Modal>

      {/* Import */}
      <Modal open={showImport} onClose={() => setShowImport(false)} title="ייבוא מ-Excel" size="modal-sm"
        footer={<button className="btn btn-o" onClick={() => setShowImport(false)}>סגור</button>}>
        <div className="dz">
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} />
          <div style={{ fontSize: '2rem' }}>📊</div>
          <div className="ts fw7">לחץ לבחירת Excel / CSV</div>
          <div className="txs tm" style={{ marginTop: '.3rem' }}>עמודות: תאריך | תיאור | סכום | סוג | קטגוריה | שם</div>
        </div>
        <div style={{ marginTop: '.9rem', background: 'var(--sl1)', borderRadius: 8, padding: '.85rem', fontSize: '.78rem', color: 'var(--text3)', lineHeight: 1.6 }}>
          <strong>טיפ:</strong> ייצא ישירות מאתר הבנק ל-Excel. הסוג יזוהה אוטומטית מהעמודה "סוג" (הכנסה/הוצאה).
        </div>
      </Modal>
    </div>
  );
}

// ─── APARTMENTS ───────────────────────────────────────────────────────────────
function Apartments({ user, toast }) {
  const isAdmin = user.role === 'admin';
  const [apts, setApts] = useState([]);
  const [txs, setTxs] = useState([]);
  const [editApt, setEditApt] = useState(null);
  const [viewApt, setViewApt] = useState(null);
  const [tab, setTab] = useState('cards');
  const now = new Date(); const yr = now.getFullYear(); const mp = now.getMonth() + 1;

  const load = () => Promise.all([api.getApts(), api.getTx()]).then(([a, t]) => { setApts(a); setTxs(t); }).catch(e => toast(e.message, 'err'));
  useEffect(() => { load(); }, []);

  const getBal = a => {
    const paid = txs.filter(t => t.type === 'income' && t.apt_id === a.id && t.date?.startsWith(String(yr))).reduce((s, t) => s + t.amount, 0);
    return paid - a.monthlyFee * mp;
  };

  const saveApt = async () => {
    try { await api.updateApt(editApt.id, editApt); toast('עודכן ✓'); setEditApt(null); load(); }
    catch (e) { toast(e.message, 'err'); }
  };

  const AptForm = ({ data, onChange }) => (
    <div className="fgrid">
      <div className="fgrid fg4">
        <div className="fg"><label>מס' דירה</label><input className="fc" value={data.aptNum} onChange={e => onChange({ aptNum: e.target.value })} /></div>
        <div className="fg" style={{ gridColumn: 'span 3' }}><label>תשלום חודשי (₪)</label><input type="number" className="fc" value={data.monthlyFee} onChange={e => onChange({ monthlyFee: parseFloat(e.target.value) || 0 })} /></div>
      </div>
      <div className="sbox">
        <div className="stitle" style={{ color: 'var(--teal)' }}>👤 בעל הדירה</div>
        <div className="fgrid fg3">
          <div className="fg"><label>שם</label><input className="fc" value={data.ownerName || ''} onChange={e => onChange({ ownerName: e.target.value })} placeholder="שם מלא" /></div>
          <div className="fg"><label>טלפון</label><input className="fc" value={data.ownerPhone || ''} onChange={e => onChange({ ownerPhone: e.target.value })} /></div>
          <div className="fg"><label>אימייל</label><input className="fc" value={data.ownerEmail || ''} onChange={e => onChange({ ownerEmail: e.target.value })} placeholder="email@example.com" /></div>
        </div>
      </div>
      <div className="sbox">
        <div className="row-b mb-s">
          <div className="stitle" style={{ color: 'var(--blue)', margin: 0 }}>🏠 שוכר</div>
          <label className="row" style={{ gap: '.5rem', cursor: 'pointer', fontSize: '.82rem', fontWeight: 600 }}>
            <input type="checkbox" checked={!!data.hasTenant} onChange={e => onChange({ hasTenant: e.target.checked })} />יש שוכר
          </label>
        </div>
        {data.hasTenant && <div className="fgrid fg3">
          <div className="fg"><label>שם</label><input className="fc" value={data.tenantName || ''} onChange={e => onChange({ tenantName: e.target.value })} /></div>
          <div className="fg"><label>טלפון</label><input className="fc" value={data.tenantPhone || ''} onChange={e => onChange({ tenantPhone: e.target.value })} /></div>
          <div className="fg"><label>אימייל</label><input className="fc" value={data.tenantEmail || ''} onChange={e => onChange({ tenantEmail: e.target.value })} /></div>
        </div>}
      </div>
      <div className="fg"><label>הערות</label><textarea className="fc" rows={2} value={data.notes || ''} onChange={e => onChange({ notes: e.target.value })} /></div>
    </div>
  );

  return (
    <div>
      <div className="row mb" style={{ justifyContent: 'space-between' }}>
        <div className="tabs" style={{ margin: 0 }}>
          <button className={`tab ${tab === 'cards' ? 'on' : ''}`} onClick={() => setTab('cards')}>כרטיסים</button>
          <button className={`tab ${tab === 'table' ? 'on' : ''}`} onClick={() => setTab('table')}>טבלה</button>
        </div>
        <span className="ts tm">{apts.filter(a => getBal(a) < 0).length} דירות עם חוב</span>
      </div>
      {tab === 'cards' ? (
        <div className="apt-grid">
          {apts.map(a => { const bal = getBal(a); return (
            <div key={a.id} className={`apt-card ${bal < 0 ? 'debt' : ''}`} onClick={() => setViewApt(a)}>
              <div className="row-b"><span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--teal)', background: 'var(--teal-bg)', padding: '.18rem .5rem', borderRadius: 4 }}>דירה {a.aptNum}</span><span className="txs tm">{fmt(a.monthlyFee)}/חודש</span></div>
              <div style={{ fontWeight: 700, fontSize: '.95rem', marginTop: '.5rem' }}>{a.ownerName || <span className="tm">ללא שם</span>}</div>
              <div className="txs tm">{a.hasTenant && a.tenantName ? `🏠 שוכר: ${a.tenantName}` : '👤 בעלים'}</div>
              <div className="hr" style={{ margin: '.6rem 0' }} />
              <div className="row-b"><span className="txs tm">{yr} — יתרה</span>
                <span className="mono fw7 ts" style={{ color: bal >= 0 ? 'var(--green)' : 'var(--red)' }}>{bal >= 0 ? '+' : ''}{fmt(bal)}</span>
              </div>
            </div>
          ); })}
        </div>
      ) : (
        <div className="card"><div className="tw">
          <table><thead><tr><th>דירה</th><th>בעל דירה</th><th>שוכר</th><th>טלפון</th><th>חודשי</th><th>יתרה {yr}</th>{isAdmin && <th></th>}</tr></thead>
          <tbody>{apts.map(a => { const bal = getBal(a); return (
            <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => setViewApt(a)}>
              <td><span className="b bt">דירה {a.aptNum}</span></td>
              <td><div className="fw7 ts">{a.ownerName || '—'}</div></td>
              <td className="ts">{a.hasTenant && a.tenantName ? a.tenantName : <span className="tm">—</span>}</td>
              <td className="ts tm">{a.ownerPhone || '—'}</td>
              <td className="mono ts">{fmt(a.monthlyFee)}</td>
              <td className="mono fw7 ts" style={{ color: bal >= 0 ? 'var(--green)' : 'var(--red)' }}>{bal >= 0 ? '+' : ''}{fmt(bal)}</td>
              {isAdmin && <td onClick={e => e.stopPropagation()}>
                <button className="btn-ic" style={{ padding: '.28rem .45rem', fontSize: '.78rem' }} onClick={e => { e.stopPropagation(); setEditApt({ ...a }); }}>✏️</button>
              </td>}
            </tr>
          ); })}</tbody></table>
        </div></div>
      )}

      {/* View */}
      <Modal open={!!viewApt} onClose={() => setViewApt(null)} title={viewApt ? `דירה ${viewApt.aptNum}` : ''} size="modal-lg">
        {viewApt && (() => {
          const aptTxs = txs.filter(t => t.apt_id === viewApt.id).sort((a, b) => b.date.localeCompare(a.date));
          const bal = getBal(viewApt);
          const paid = txs.filter(t => t.type === 'income' && t.apt_id === viewApt.id && t.date?.startsWith(String(yr))).reduce((s, t) => s + t.amount, 0);
          return (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.8rem', marginBottom: '1rem' }}>
                <div className="sbox" style={{ margin: 0 }}>
                  <div className="stitle" style={{ color: 'var(--teal)' }}>👤 בעל הדירה</div>
                  <div className="fw7">{viewApt.ownerName || 'לא הוזן'}</div>
                  {viewApt.ownerPhone && <div className="ts tm">📱 {viewApt.ownerPhone}</div>}
                  {viewApt.ownerEmail && <div className="ts tm">✉️ {viewApt.ownerEmail}</div>}
                </div>
                <div className="sbox" style={{ margin: 0 }}>
                  <div className="stitle" style={{ color: 'var(--blue)' }}>{viewApt.hasTenant ? '🏠 שוכר' : '🏠 בעלים'}</div>
                  {viewApt.hasTenant ? <><div className="fw7">{viewApt.tenantName}</div>{viewApt.tenantPhone && <div className="ts tm">📱 {viewApt.tenantPhone}</div>}{viewApt.tenantEmail && <div className="ts tm">✉️ {viewApt.tenantEmail}</div>}</> : <div className="ts tm">אין שוכר</div>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '.7rem', marginBottom: '1rem' }}>
                {[['חודשי', fmt(viewApt.monthlyFee), 'var(--blue)', 'var(--blue-bg)'], [`שולם ${yr}`, fmt(paid), 'var(--green)', 'var(--green-bg)'], ['יתרה', fmt(Math.abs(bal)), bal >= 0 ? 'var(--green)' : 'var(--red)', bal >= 0 ? 'var(--green-bg)' : 'var(--red-bg)']].map(([l, v, c, bg]) => (
                  <div key={l} style={{ background: bg, borderRadius: 8, padding: '.75rem', textAlign: 'center' }}>
                    <div className="txs tm">{l}</div><div className="mono fw7 ts" style={{ color: c }}>{v}</div>
                  </div>
                ))}
              </div>
              <div className="fw7 ts mb-s">היסטוריית תנועות</div>
              {!aptTxs.length ? <div className="tm ts">אין תנועות</div> :
                <div className="tw"><table><thead><tr><th>תאריך</th><th>תיאור</th><th>קטגוריה</th><th>סכום</th></tr></thead>
                  <tbody>{aptTxs.map(t => (
                    <tr key={t.id}><td className="txs tm">{t.date}</td><td className="ts">{t.description}</td>
                      <td><span className="b bs">{t.category}</span></td>
                      <td className="mono fw7 ts" style={{ color: t.type === 'income' ? 'var(--green)' : 'var(--red)' }}>{fmt(t.amount)}</td></tr>
                  ))}</tbody></table></div>}
              {isAdmin && <div style={{ marginTop: '1rem', textAlign: 'left' }}>
                <button className="btn btn-o btn-sm" onClick={() => { setViewApt(null); setEditApt({ ...viewApt }); }}>✏️ ערוך פרטי דירה</button>
              </div>}
            </div>
          );
        })()}
      </Modal>

      {isAdmin && <Modal open={!!editApt} onClose={() => setEditApt(null)} title={`עריכת דירה ${editApt?.aptNum}`} size="modal-lg"
        footer={<><button className="btn btn-o" onClick={() => setEditApt(null)}>ביטול</button><button className="btn btn-p" onClick={saveApt}>שמור</button></>}>
        {editApt && <AptForm data={editApt} onChange={d => setEditApt(p => ({ ...p, ...d }))} />}
      </Modal>}
    </div>
  );
}

// ─── REMINDERS ────────────────────────────────────────────────────────────────
function Reminders({ user, toast }) {
  const isAdmin = user.role === 'admin';
  const [apts, setApts] = useState([]);
  const [txs, setTxs] = useState([]);
  const [status, setStatus] = useState({ configured: false, gmailUser: '' });
  const [settings, setSettings] = useState({});
  const [instrDraft, setInstrDraft] = useState('');
  const [editInstr, setEditInstr] = useState(false);
  const [sending, setSending] = useState({});
  const [sendingAll, setSendingAll] = useState(false);
  const now = new Date(); const yr = now.getFullYear(); const mp = now.getMonth() + 1;

  const load = async () => {
    const [a, t, st, s] = await Promise.all([api.getApts(), api.getTx(), api.emailStatus(), api.getSettings()]);
    setApts(a); setTxs(t); setStatus(st); setSettings(s);
    setInstrDraft(s.pay_instructions || '');
  };
  useEffect(() => { load().catch(() => {}); }, []);

  const getBal = a => {
    const paid = txs.filter(t => t.type === 'income' && t.apt_id === a.id && t.date?.startsWith(String(yr))).reduce((s, t) => s + t.amount, 0);
    return paid - a.monthlyFee * mp;
  };
  const debtors = apts.filter(a => getBal(a) < 0);

  const updateApt = async (id, changes) => {
    const apt = apts.find(a => a.id === id);
    if (!apt) return;
    try { await api.updateApt(id, { ...apt, ...changes }); setApts(apts.map(a => a.id === id ? { ...a, ...changes } : a)); }
    catch (e) { toast(e.message, 'err'); }
  };

  const saveSettings = async () => {
    try { await api.saveSettings({ pay_instructions: instrDraft }); setEditInstr(false); toast('הוראות עודכנו ✓'); load(); }
    catch (e) { toast(e.message, 'err'); }
  };

  const sendOne = async aptId => {
    setSending(p => ({ ...p, [aptId]: true }));
    try { const r = await api.emailSend(aptId); toast(r.sent ? 'מייל נשלח! ✓' : `לא נשלח — ${r.reason}`, r.sent ? 'ok' : 'err'); }
    catch (e) { toast(e.message, 'err'); }
    finally { setSending(p => ({ ...p, [aptId]: false })); }
  };

  const sendAll = async () => {
    setSendingAll(true);
    try { const r = await api.emailSendAll(); toast(`נשלחו ${r.sent} מיילים ✓`); }
    catch (e) { toast(e.message, 'err'); }
    finally { setSendingAll(false); }
  };

  const testEmail = async () => {
    try { const r = await api.emailTest(); toast(`מייל בדיקה נשלח ל-${r.to} ✓`); }
    catch (e) { toast(e.message, 'err'); }
  };

  return (
    <div>
      {/* Gmail status */}
      {status.configured
        ? <div className="gmail-connected">
          <span style={{ fontSize: '1.5rem' }}>✅</span>
          <div><div className="fw7 ts">Gmail מחובר</div><div className="txs tm">{status.gmailUser}</div></div>
          <button className="btn btn-o btn-sm" style={{ marginRight: 'auto' }} onClick={testEmail}>שלח מייל בדיקה</button>
        </div>
        : <div className="gmail-disconnected">
          <div className="fw7 ts" style={{ color: 'var(--amber)' }}>⚠️ Gmail לא מוגדר</div>
          <div className="txs tm" style={{ marginTop: '.2rem' }}>עבור ל<strong>הגדרות → Gmail</strong> כדי לחבר את החשבון ולאפשר שליחה אוטומטית.</div>
        </div>}

      {/* Pay instructions */}
      <div className="card mb">
        <div className="card-hd">
          <h3>📝 הוראות תשלום</h3>
          {isAdmin && <button className="btn btn-o btn-sm" onClick={() => setEditInstr(true)}>✏️ ערוך</button>}
        </div>
        <div className="card-bd"><pre style={{ fontFamily: 'inherit', fontSize: '.85rem', color: 'var(--text2)', whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>{settings.pay_instructions}</pre></div>
      </div>

      {/* Debtors */}
      <div className="card mb">
        <div className="card-hd">
          <h3>📧 שליחת תזכורות לחייבים ({debtors.length})</h3>
          {isAdmin && status.configured && <button className="btn btn-p btn-sm" onClick={sendAll} disabled={sendingAll || !debtors.length}>
            {sendingAll ? <><span className="spin">⏳</span> שולח...</> : `📧 שלח לכולם (${debtors.length})`}
          </button>}
        </div>
        <div className="card-bd">
          {!debtors.length
            ? <div className="empty" style={{ padding: '1rem' }}><span style={{ fontSize: '1.5rem' }}>✅</span><p className="ts" style={{ marginTop: '.3rem' }}>אין חייבים</p></div>
            : <div className="tw"><table><thead><tr><th>דירה</th><th>שם</th><th>מייל</th><th>חוב</th><th>פעולה</th></tr></thead>
              <tbody>{debtors.map(a => {
                const email = a.tenantEmail || a.ownerEmail;
                const debt = Math.abs(getBal(a));
                return (
                  <tr key={a.id}>
                    <td><span className="b bt">דירה {a.aptNum}</span></td>
                    <td className="ts fw7">{a.tenantName || a.ownerName || '?'}</td>
                    <td className="ts tm">{email || <span style={{ color: 'var(--red)' }}>אין מייל</span>}</td>
                    <td className="mono fw7 ts" style={{ color: 'var(--red)' }}>{fmt(debt)}</td>
                    <td>
                      {email && status.configured
                        ? <button className="btn btn-b btn-sm" onClick={() => sendOne(a.id)} disabled={sending[a.id]}>
                          {sending[a.id] ? <span className="spin">⏳</span> : '📧 שלח'}
                        </button>
                        : <span className="txs tm">{!email ? 'חסר מייל' : 'Gmail לא מוגדר'}</span>}
                    </td>
                  </tr>
                );
              })}</tbody></table></div>}
        </div>
      </div>

      {/* Per-apt settings */}
      {isAdmin && <div className="card">
        <div className="card-hd"><h3>⚙️ הגדרות תזכורות לכל דירה</h3><span className="ts tm">{apts.filter(a => a.sendReminders).length} פעילות</span></div>
        <div className="card-bd">
          <div className="tw"><table>
            <thead><tr><th>דירה</th><th>שם</th><th>מייל</th><th>תזכורות</th><th>תדירות</th><th>יום בחודש</th></tr></thead>
            <tbody>{apts.map(a => (
              <tr key={a.id}>
                <td><span className="b bt">דירה {a.aptNum}</span></td>
                <td className="ts">{a.ownerName || '—'}</td>
                <td className="ts tm">{a.tenantEmail || a.ownerEmail || <span style={{ color: 'var(--red)' }}>חסר</span>}</td>
                <td><Toggle checked={a.sendReminders} onChange={v => updateApt(a.id, { sendReminders: v })} /></td>
                <td>{a.sendReminders && <select className="fc" style={{ padding: '.3rem .5rem', fontSize: '.78rem', width: 'auto' }} value={a.reminderFreq || 'חודשי'} onChange={e => updateApt(a.id, { reminderFreq: e.target.value })}>
                  {['שבועי', 'דו-שבועי', 'חודשי'].map(f => <option key={f}>{f}</option>)}
                </select>}</td>
                <td>{a.sendReminders && <input type="number" min="1" max="28" className="fc" style={{ width: 56, padding: '.3rem .5rem', fontSize: '.78rem' }} value={a.reminderDay || 1} onChange={e => updateApt(a.id, { reminderDay: parseInt(e.target.value) || 1 })} />}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </div>
      </div>}

      <Modal open={editInstr} onClose={() => setEditInstr(false)} title="עריכת הוראות תשלום" size="modal-sm"
        footer={<><button className="btn btn-o" onClick={() => setEditInstr(false)}>ביטול</button><button className="btn btn-p" onClick={saveSettings}>שמור</button></>}>
        <div className="fg"><label>טקסט שיופיע בכל מייל תזכורת</label>
          <textarea className="fc" rows={10} value={instrDraft} onChange={e => setInstrDraft(e.target.value)} style={{ lineHeight: 1.6 }} />
        </div>
      </Modal>
    </div>
  );
}

// ─── REPORTS ─────────────────────────────────────────────────────────────────
function Reports({ toast }) {
  const [tab, setTab] = useState('halfYear');
  const now = new Date();
  // Half-year state
  const [half, setHalf] = useState(now.getMonth() < 6 ? 'first' : 'second');
  const [year, setYear] = useState(String(now.getFullYear()));
  // Custom range state
  const [dateFrom, setDateFrom] = useState(`${now.getFullYear()}-01-01`);
  const [dateTo, setDateTo] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const EXPENSE_CATS_ALL = EXPENSE_CATS;
  const INCOME_CATS_ALL = INCOME_CATS;

  const fetchReport = async (from, to) => {
    setLoading(true); setData(null);
    try { setData(await api.getReport(from, to)); }
    catch (e) { toast(e.message, 'err'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab === 'halfYear') {
      const [sM, eM] = half === 'first' ? [1, 6] : [7, 12];
      fetchReport(`${year}-${String(sM).padStart(2, '0')}-01`, `${year}-${String(eM).padStart(2, '0')}-${eM === 6 ? '30' : '31'}`);
    }
  }, [tab, half, year]);

  useEffect(() => {
    if (tab === 'custom' && dateFrom && dateTo) fetchReport(dateFrom, dateTo);
  }, [tab, dateFrom, dateTo]);

  const [sM, eM] = half === 'first' ? [0, 5] : [6, 11];

  const ReportBody = () => {
    if (loading) return <div className="empty"><span className="spin">⏳</span></div>;
    if (!data) return null;
    const { totalIn, totalOut, balance, expByCat, incByCat, debtors } = data;
    return (
      <div style={{ maxWidth: 660 }}>
        <div className="rpt-s">
          <div className="rpt-hd" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}><span>הוצאות</span><span className="mono">{fmt(totalOut)}</span></div>
          {EXPENSE_CATS_ALL.map(c => <div key={c} className="rpt-row"><span>{c}</span><span className="mono" style={{ fontWeight: expByCat[c] > 0 ? 700 : 400, color: expByCat[c] > 0 ? 'var(--red)' : 'var(--text3)' }}>{expByCat[c] > 0 ? fmt(expByCat[c]) : '—'}</span></div>)}
          <div className="rpt-row rpt-tot" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}><span>סה"כ הוצאות</span><span className="mono">{fmt(totalOut)}</span></div>
        </div>
        <div className="rpt-s">
          <div className="rpt-hd" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}><span>הכנסות</span><span className="mono">{fmt(totalIn)}</span></div>
          {INCOME_CATS_ALL.map(c => <div key={c} className="rpt-row"><span>{c}</span><span className="mono" style={{ fontWeight: incByCat[c] > 0 ? 700 : 400, color: incByCat[c] > 0 ? 'var(--green)' : 'var(--text3)' }}>{incByCat[c] > 0 ? fmt(incByCat[c]) : '—'}</span></div>)}
          <div className="rpt-row rpt-tot" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}><span>סה"כ הכנסות</span><span className="mono">{fmt(totalIn)}</span></div>
        </div>
        <div className={balance >= 0 ? 'rpt-pos' : 'rpt-neg'} style={{ marginBottom: '.9rem' }}>
          <span>{balance >= 0 ? '✅ יתרת זכות' : '⚠️ יתרת חובה'}</span><span className="mono">{fmt(Math.abs(balance))}</span>
        </div>
        {debtors?.length > 0 && <div className="rpt-s">
          <div className="rpt-hd" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}><span>חייבים בתקופה</span></div>
          {debtors.map(d => <div key={d.aptNum} className="rpt-row"><span>דירה {d.aptNum} — {d.name}</span><span className="mono fw7" style={{ color: 'var(--red)' }}>{fmt(Math.abs(d.diff))}</span></div>)}
        </div>}
        <div style={{ fontSize: '.73rem', color: 'var(--text3)', fontStyle: 'italic', padding: '.75rem', background: 'var(--sl1)', borderRadius: 8, border: '1px solid var(--sl3)' }}>
          הרישום בחשבון הקופה אינו מבטל את הצורך באיסוף ושמירת קבלות. הדוח יודפס בשני עותקים: אחד ללוח המודעות, אחד לתיק הנציגות.
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="tabs">
        <button className={`tab ${tab === 'halfYear' ? 'on' : ''}`} onClick={() => setTab('halfYear')}>מאזן חצי שנתי</button>
        <button className={`tab ${tab === 'custom' ? 'on' : ''}`} onClick={() => setTab('custom')}>טווח תאריכים חופשי</button>
      </div>

      {tab === 'halfYear' && (
        <div>
          <div className="row mb no-print" style={{ flexWrap: 'wrap' }}>
            <select className="fc" style={{ width: 'auto' }} value={half} onChange={e => setHalf(e.target.value)}>
              <option value="first">ינואר – יוני</option><option value="second">יולי – דצמבר</option>
            </select>
            <select className="fc" style={{ width: 'auto' }} value={year} onChange={e => setYear(e.target.value)}>
              {[2023, 2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
            </select>
            <button className="btn btn-o" onClick={() => window.print()}>🖨 הדפסה</button>
          </div>
          <div style={{ maxWidth: 660 }}>
            <div style={{ background: 'linear-gradient(135deg,var(--navy),#1e3560)', borderRadius: '14px 14px 0 0', padding: '1.1rem 1.3rem', color: 'white', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Rubik',sans-serif", fontSize: '1.15rem', fontWeight: 700 }}>דוח מאזן כספי — ועד הבית</div>
              <div style={{ fontSize: '.82rem', opacity: .75, marginTop: '.2rem' }}>{BUILDING} · {MONTHS[sM]}–{MONTHS[eM]} {year}</div>
            </div>
          </div>
          <ReportBody />
        </div>
      )}

      {tab === 'custom' && (
        <div>
          <div className="card mb" style={{ padding: '.85rem 1.1rem' }}>
            <div className="row" style={{ flexWrap: 'wrap', gap: '.7rem', alignItems: 'center' }}>
              <div className="fg" style={{ flexDirection: 'row', alignItems: 'center', gap: '.4rem' }}>
                <label className="ts fw7" style={{ whiteSpace: 'nowrap' }}>מתאריך:</label>
                <input type="date" className="fc" style={{ width: 'auto' }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div className="fg" style={{ flexDirection: 'row', alignItems: 'center', gap: '.4rem' }}>
                <label className="ts fw7" style={{ whiteSpace: 'nowrap' }}>עד תאריך:</label>
                <input type="date" className="fc" style={{ width: 'auto' }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
              <button className="btn btn-o" onClick={() => window.print()}>🖨 הדפסה</button>
            </div>
          </div>
          <div style={{ maxWidth: 660 }}>
            <div style={{ background: 'linear-gradient(135deg,var(--navy),#1e3560)', borderRadius: '14px 14px 0 0', padding: '1.1rem 1.3rem', color: 'white', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Rubik',sans-serif", fontSize: '1.15rem', fontWeight: 700 }}>דוח כספי — ועד הבית</div>
              <div style={{ fontSize: '.82rem', opacity: .75, marginTop: '.2rem' }}>{BUILDING} · {dateFrom} — {dateTo}</div>
            </div>
          </div>
          <ReportBody />
        </div>
      )}
    </div>
  );
}

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────
function AuditLog({ toast }) {
  const [logs, setLogs] = useState([]);
  const colors = { 'דן קליינמן': 'var(--teal)', 'דייויד גורדון': 'var(--blue)', 'רן לבנת': 'var(--purple)' };
  useEffect(() => { api.getLog().then(setLogs).catch(e => toast(e.message, 'err')); }, []);
  return (
    <div className="card">
      <div className="card-hd"><h3>🔍 לוג פעולות</h3><span className="ts tm">{logs.length} רשומות</span></div>
      <div className="card-bd">
        {!logs.length ? <div className="empty"><div className="empty-ic">📋</div><p>אין פעולות</p></div>
          : logs.map(e => (
            <div key={e.id} className="log-item">
              <div className="log-av" style={{ background: colors[e.username] || 'var(--sl4)', color: 'white' }}>{e.initials}</div>
              <div style={{ flex: 1 }}>
                <div className="fw7 ts">{e.username}</div>
                <div className="ts">{e.action}{e.detail && <span className="tm"> · {e.detail}</span>}</div>
                <div className="txs tm">{new Date(e.created_at).toLocaleString('he-IL')}</div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
function Settings({ toast }) {
  const [s, setS] = useState({ gmail_user: '', gmail_app_password: '', admin_email: '' });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => { api.getSettings().then(d => { setS(d); setLoaded(true); }).catch(() => {}); }, []);

  const save = async () => {
    setSaving(true);
    try {
      // Only send password if it changed (not the masked version)
      const payload = { gmail_user: s.gmail_user, admin_email: s.admin_email };
      if (s.gmail_app_password && !s.gmail_app_password.includes('•')) payload.gmail_app_password = s.gmail_app_password;
      await api.saveSettings(payload);
      toast('הגדרות נשמרו ✓');
    } catch (e) { toast(e.message, 'err'); }
    finally { setSaving(false); }
  };

  const test = async () => {
    setTesting(true);
    try { const r = await api.emailTest(); toast(`מייל בדיקה נשלח ל-${r.to} ✓`); }
    catch (e) { toast(e.message, 'err'); }
    finally { setTesting(false); }
  };

  if (!loaded) return <div className="empty"><span className="spin">⏳</span></div>;

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="card mb">
        <div className="card-hd"><h3>📧 הגדרות Gmail</h3></div>
        <div className="card-bd">
          <div style={{ background: 'var(--blue-bg)', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: '1rem', marginBottom: '1.2rem', fontSize: '.82rem', lineHeight: 1.7 }}>
            <div className="fw7 ts" style={{ color: 'var(--blue)', marginBottom: '.4rem' }}>📋 איך מגדירים App Password ב-Gmail:</div>
            <ol style={{ paddingRight: '1.2rem', color: 'var(--text2)' }}>
              <li>כנס ל-<a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>myaccount.google.com/security</a></li>
              <li>ודא שאימות דו-שלבי (2FA) מופעל</li>
              <li>חפש "App passwords" → "אפליקציות וסיסמאות"</li>
              <li>צור סיסמה חדשה — בחר "Mail" + "Other"</li>
              <li>העתק את 16 התווים שנוצרו (ללא רווחים)</li>
              <li>הדבק בשדה "App Password" למטה</li>
            </ol>
          </div>
          <div className="fgrid" style={{ gap: '.85rem' }}>
            <div className="fg"><label>כתובת Gmail שלך</label><input className="fc" type="email" value={s.gmail_user} onChange={e => setS(p => ({ ...p, gmail_user: e.target.value }))} placeholder="your@gmail.com" /></div>
            <div className="fg"><label>App Password (16 תווים)</label>
              <div className="row" style={{ gap: '.4rem' }}>
                <input className="fc" type={showPass ? 'text' : 'password'} value={s.gmail_app_password} onChange={e => setS(p => ({ ...p, gmail_app_password: e.target.value }))} placeholder="xxxx xxxx xxxx xxxx" style={{ flex: 1 }} />
                <button className="btn btn-o btn-sm" onClick={() => setShowPass(p => !p)}>{showPass ? '🙈' : '👁'}</button>
              </div>
            </div>
            <div className="fg"><label>מייל לקבלת סיכומים (שלך)</label><input className="fc" type="email" value={s.admin_email} onChange={e => setS(p => ({ ...p, admin_email: e.target.value }))} placeholder="your@gmail.com" /></div>
          </div>
          <div className="row" style={{ marginTop: '1rem', gap: '.6rem' }}>
            <button className="btn btn-p" onClick={save} disabled={saving}>{saving ? '⏳...' : '💾 שמור הגדרות'}</button>
            <button className="btn btn-o" onClick={test} disabled={testing}>{testing ? '⏳...' : '📧 שלח מייל בדיקה'}</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd"><h3>ℹ️ אודות המערכת</h3></div>
        <div className="card-bd ts tm" style={{ lineHeight: 1.8 }}>
          <p>ועד הבית — {BUILDING}</p>
          <p>26 דירות · גרסה 2.0</p>
          <p style={{ marginTop: '.5rem', fontSize: '.75rem' }}>
            המערכת שולחת תזכורות אוטומטיות כל יום בשעה 09:00 לדיירים שהגדרת, לפי לוח הזמנים שהוגדר לכל אחד.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => {
    try { const u = localStorage.getItem('vaad_user'); return u ? JSON.parse(u) : null; } catch { return null; }
  });
  const [page, setPage] = useState('dashboard');
  const { toast, ToastHost } = useToast();

  const login = u => { setUser(u); localStorage.setItem('vaad_user', JSON.stringify(u)); };
  const logout = () => { setUser(null); clearToken(); localStorage.removeItem('vaad_user'); };

  const isAdmin = user?.role === 'admin';
  const nav = [
    { id: 'dashboard', icon: '📊', label: 'דשבורד' },
    { id: 'transactions', icon: '💳', label: 'תנועות בנק' },
    { id: 'apartments', icon: '🏠', label: 'דירות' },
    { id: 'reminders', icon: '📧', label: 'תזכורות מייל' },
    { id: 'reports', icon: '📋', label: 'דוחות ומאזן' },
    ...(isAdmin ? [{ id: 'log', icon: '🔍', label: 'לוג פעולות' }] : []),
    { id: 'settings', icon: '⚙️', label: 'הגדרות' },
  ];
  const titles = { dashboard: 'סקירה כללית', transactions: 'תנועות בנק', apartments: 'ניהול דירות', reminders: 'תזכורות מיילים', reports: 'דוחות ומאזן', log: 'לוג פעולות', settings: 'הגדרות' };
  const avatarColors = { 'דן קליינמן': 'var(--teal)', 'דייויד גורדון': 'var(--blue)', 'רן לבנת': 'var(--purple)' };

  if (!user) return (<><style>{CSS}</style><Login onLogin={login} /></>);

  return (
    <>
      <style>{CSS}</style>
      <div className="shell">
        <nav className="sb">
          <div className="sb-logo">
            <div style={{ fontSize: '1.4rem' }}>🏢</div>
            <div className="sb-bldg">{BUILDING}</div>
            <div className="sb-sub">ועד הבית</div>
          </div>
          <div className="sb-nav">
            {nav.map(n => (
              <button key={n.id} className={`sbi ${page === n.id ? 'on' : ''}`} onClick={() => setPage(n.id)}>
                <span className="sbi-ic">{n.icon}</span>{n.label}
              </button>
            ))}
          </div>
          <div className="sb-foot">
            <div className="sb-who">
              <div className="sb-av" style={{ background: avatarColors[user.username] || 'var(--teal)' }}>{user.initials}</div>
              <div><div className="sb-wname">{user.username}</div><div className="sb-wrole">{user.role === 'admin' ? 'גזבר' : 'חבר ועד'}</div></div>
            </div>
            <button className="sb-out" onClick={logout}>🚪 יציאה</button>
          </div>
        </nav>
        <div className="main">
          <div className="topbar">
            <div className="topbar-title">{titles[page]}</div>
            <div className="topbar-date">{new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
          <div className="content">
            {page === 'dashboard' && <Dashboard toast={toast} />}
            {page === 'transactions' && <Transactions user={user} toast={toast} />}
            {page === 'apartments' && <Apartments user={user} toast={toast} />}
            {page === 'reminders' && <Reminders user={user} toast={toast} />}
            {page === 'reports' && <Reports toast={toast} />}
            {page === 'log' && isAdmin && <AuditLog toast={toast} />}
            {page === 'settings' && <Settings toast={toast} />}
          </div>
        </div>
      </div>
      <ToastHost />
    </>
  );
}
