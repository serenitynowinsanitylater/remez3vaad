# 🏢 ועד בית — רמז 3, רמת השרון

מערכת ניהול ועד בית מלאה — Node.js + React + SQLite

---

## 🚀 הרצה מקומית (פיתוח)

### דרישות
- Node.js גרסה 18 ומעלה
- npm

### התקנה

```bash
# 1. שכפל את הריפוזיטורי
git clone https://github.com/YOUR_USERNAME/vaad-remez3.git
cd vaad-remez3

# 2. התקן תלויות
npm run install:all

# 3. צור קובץ .env
cp .env.example .env
# ערוך את .env עם הפרטים שלך

# 4. הרץ (שרת + React ביחד)
npm run dev
```

האפליקציה תעלה על:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

---

## 📧 הגדרת Gmail לשליחת מיילים אוטומטיים

### שלב 1 — הפעל 2FA
1. כנס ל-[myaccount.google.com/security](https://myaccount.google.com/security)
2. הפעל "2-Step Verification" אם לא פעיל

### שלב 2 — צור App Password
1. חפש "App passwords" (או [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords))
2. לחץ "Create"
3. שם: "ועד בית" → לחץ "Create"
4. **שמור את 16 התווים** — תוכל לראותם רק פעם אחת!

### שלב 3 — הגדר בקובץ .env או ב-Render
```
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop   ← ה-16 תווים (ללא רווחים)
ADMIN_EMAIL=your@gmail.com
```

### שלב 4 — בדיקה
כנס להגדרות באפליקציה → Gmail → "שלח מייל בדיקה"

---

## ☁️ פריסה על Render (חינמי)

### שלב 1 — GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/vaad-remez3.git
git push -u origin main
```

### שלב 2 — Render
1. כנס ל-[render.com](https://render.com) → "New Web Service"
2. חבר את חשבון GitHub ובחר את הריפוזיטורי
3. הגדרות:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Environment:** `Node`

### שלב 3 — משתני סביבה ב-Render
בלשונית "Environment" הוסף:
| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | מחרוזת אקראית ארוכה |
| `GMAIL_USER` | your@gmail.com |
| `GMAIL_APP_PASSWORD` | xxxxxxxxxxxxxxxxxxxx |
| `ADMIN_EMAIL` | your@gmail.com |
| `DB_PATH` | `/opt/render/project/src/data/vaad.db` |

### שלב 4 — Disk (חשוב! לשמירת מסד הנתונים)
ב-Render → "Add Disk":
- **Name:** `vaad-data`
- **Mount Path:** `/opt/render/project/src/data`
- **Size:** 1GB (חינמי)

> ⚠️ בלי Disk, הנתונים יימחקו בכל deploy! ה-Disk שומר את קובץ vaad.db.

---

## 👥 משתמשים

| שם | תפקיד | הרשאות |
|----|--------|---------|
| דן קליינמן | גזבר / Admin | כל הגישה + לוג פעולות |
| דייויד גורדון | חבר ועד | צפייה + תזכורות |
| רן לבנת | חבר ועד | צפייה + תזכורות |

---

## 📁 מבנה הפרויקט

```
vaad-remez3/
├── server/
│   ├── index.js      ← Express API + Cron
│   ├── db.js         ← SQLite setup
│   ├── auth.js       ← JWT auth
│   └── mailer.js     ← Nodemailer + Gmail
├── client/
│   ├── src/
│   │   ├── App.js    ← כל הממשק (React)
│   │   ├── api.js    ← קריאות לשרת
│   │   └── index.js
│   └── public/
├── data/             ← vaad.db (נוצר אוטומטית)
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 🔄 עדכון אחרי שינויים

```bash
git add .
git commit -m "תיאור השינוי"
git push
```
Render מ-deploy אוטומטית כשמעלים ל-GitHub.

---

## 🛡️ אבטחה

- סיסמאות מוצפנות עם bcrypt
- JWT tokens עם תפוגה 14 יום
- App Password לא נשמר בקוד — רק ב-.env או ב-Render
- לוג כל פעולות (גלוי לגזבר בלבד)
