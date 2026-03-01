# ועד הבית - רמז 3, רמת השרון
## מערכת ניהול קופת ועד בית

---

## דרישות מערכת
- Node.js 18+ 
- npm או yarn

---

## התקנה והפעלה

### שלב 1 - התקנת תלויות
```bash
npm install
```

### שלב 2 - יצירת מסד הנתונים והזרעה ראשונית
```bash
npm run seed
```
הפקודה תיצור:
- קובץ `data/vaad.db` עם כל הטבלאות
- משתמש אדמין (kleinman.d@gmail.com / dk4987789)
- 26 דירות עם נתוני ברירת מחדל
- 7 ספקים לדוגמה
- הגדרת יתרת פתיחה = 0

### שלב 3 - הפעלה בסביבת פיתוח
```bash
npm run dev
```
גישה: http://localhost:3000

### שלב 4 (אופציונלי) - בנייה לייצור
```bash
npm run build
npm start
```

---

## פרטי כניסה
- **אימייל:** kleinman.d@gmail.com
- **סיסמה:** dk4987789

---

## מבנה הפרויקט

```
src/
  app/
    (app)/              # דפי האפליקציה (מוגנים)
      dashboard/        # דשבורד
      apartments/       # ניהול דירות
      vendors/          # ניהול ספקים
      transactions/     # תנועות כספיות
      balance/          # מאזן
      settings/         # הגדרות
    api/                # API routes
      auth/             # התחברות/יציאה
      apartments/       # CRUD דירות
      vendors/          # CRUD ספקים
      transactions/     # CRUD + ייבוא CSV
      balance/          # דוח מאזן
      dashboard/        # נתוני דשבורד
      settings/         # הגדרות
    login/              # עמוד כניסה
  lib/
    db.ts              # חיבור SQLite
    auth.ts            # JWT authentication
    constants.ts       # קטגוריות ואמצעי תשלום
    seed.js            # סקריפט זריעה
  components/
    layout/
      Sidebar.tsx       # תפריט צד
data/
  vaad.db             # מסד הנתונים (נוצר אחרי seed)
```

---

## תכונות
- ✅ התחברות מאובטחת עם JWT
- ✅ ניהול 26 דירות (CRUD מלא)
- ✅ ניהול ספקים קבועים וחד-פעמיים
- ✅ הזנת תנועות הכנסה/הוצאה
- ✅ ייבוא תנועות מ-CSV
- ✅ הורדת תבנית CSV
- ✅ ייצוא לCSV (דירות, ספקים, תנועות, מאזן)
- ✅ דשבורד עם יתרה ודיירים שלא שילמו
- ✅ מאזן חצי שנתי לפי קטגוריות
- ✅ ממשק RTL מלא
- ✅ רספונסיב + כפתור FAB למובייל
- ✅ יתרת פתיחה מתוך הגדרות
