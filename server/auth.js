const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const SECRET = process.env.JWT_SECRET || 'vaad-remez3-dev-secret';

const USERS = [
  { id:'dan',   username:'דן קליינמן',    password:'dk49877894',    role:'admin',  initials:'ד.ק' },
  { id:'david', username:'דייויד גורדון', password:'vaadremez2026!', role:'member', initials:'ד.ג' },
  { id:'ran',   username:'רן לבנת',       password:'vaadremez2026!', role:'member', initials:'ר.ל' },
];

// Pre-hash all passwords once at startup
const HASHED = USERS.map(u => ({ ...u, hash: bcrypt.hashSync(u.password, 10) }));

function login(username, password) {
  const user = HASHED.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.hash)) return null;
  const token = jwt.sign({ id:user.id, username:user.username, role:user.role, initials:user.initials }, SECRET, { expiresIn:'14d' });
  return { token, user: { id:user.id, username:user.username, role:user.role, initials:user.initials } };
}

function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error:'לא מחובר' });
  try { req.user = jwt.verify(h.replace('Bearer ',''), SECRET); next(); }
  catch { res.status(401).json({ error:'פג תוקף — התחבר מחדש' }); }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error:'אין הרשאה' });
  next();
}

module.exports = { login, auth, adminOnly };
