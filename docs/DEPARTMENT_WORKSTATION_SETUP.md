# התקנת עמדת בחינה על מחשב Windows 10

## דרישות
- Git for Windows
- Node.js 20 ומעלה
- .NET SDK שמתאים לפרויקט
- מדפסת מדבקות מחוברת ב-USB ומוגדרת כמדפסת ב-Windows

## הורדה ראשונה
```powershell
git clone https://github.com/shahar69/bazap2.0.git
cd bazap2.0
git checkout codex/inspection-system
```

## התקנה
```powershell
dotnet restore .\bazap2.0.sln
dotnet build .\bazap2.0.sln

cd .\frontend
npm install
npm run build
cd ..
```

## הפעלה בעמדה
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-department-workstation.ps1
```

המערכת תיפתח בדפדפן בכתובת:

```text
http://127.0.0.1:5174
```

## משתמש הדגמה
```text
admin / admin123
```

## מדפסת מדבקות
בשלב הנוכחי המערכת פותחת חלון הדפסה מיד אחרי פתק השבתה. יש לבחור במדפסת המדבקות של Windows.

להדפסה שקטה לגמרי בלי חלון הדפסה נדרש רכיב מקומי קטן שמדבר ישירות עם המדפסת.

## עדכון גרסה
```powershell
git pull
dotnet build .\bazap2.0.sln
cd .\frontend
npm install
npm run build
cd ..
```
