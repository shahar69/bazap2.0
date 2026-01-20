# 🎯 Bazap 2.0 - Quick Reference Card

## 🚀 START HERE

```bash
start.bat  # Windows
```

Wait 10 seconds, then visit:
- **Login:** http://localhost:5173
- **API Docs:** http://localhost:5000/swagger

**Default Login:**
- Username: `admin`
- Password: `admin123`

---

## ✅ What Works Now

| Component | Status | URL |
|-----------|--------|-----|
| Frontend | ✅ Ready | http://localhost:5173 |
| Backend API | ✅ Ready | http://localhost:5000 |
| Database | ✅ Ready | SQLite (bazap.db) |
| Authentication | ✅ Ready | BCrypt + Token |
| Swagger Docs | ✅ Ready | http://localhost:5000/swagger |

---

## 🔧 If Something Goes Wrong

### Backend Won't Start
```bash
cd backend/Bazap.API
dotnet clean
dotnet restore
dotnet run
```

### Frontend Won't Load
```bash
cd frontend
npm install
npm run dev
```

### "Network Error" on Login
1. Check backend is running (visit http://localhost:5000/swagger)
2. Wait 5 seconds for backend to fully initialize
3. Clear browser cache (Ctrl+Shift+Delete)
4. Refresh page (Ctrl+F5)

### Port Already in Use
```bash
# Find process on port 5000
netstat -ano | findstr :5000
taskkill /PID [number] /F

# Then restart
start.bat
```

### Reset Everything
```bash
# Delete database
cd backend/Bazap.API
del bazap.db

# Restart
cd ..
dotnet run
```

---

## 📊 API Endpoints Cheat Sheet

### Login
```
POST http://localhost:5000/api/auth/login
Body: { "username": "admin", "password": "admin123" }
Returns: { "success": true, "token": "...", "user": {...} }
```

### Get Items
```
GET http://localhost:5000/api/items
Returns: [{ "id": 1, "name": "Item", "quantityInStock": 10 }]
```

### Create Receipt
```
POST http://localhost:5000/api/receipts
Body: { 
  "recipientName": "John",
  "items": [{ "itemId": 1, "quantity": 5 }]
}
```

---

## 💡 Useful Dev Tools

### Open Console
- **Windows:** F12
- **Mac:** Cmd+Option+I
- **Linux:** F12

### Check Backend Logs
- Look at the backend terminal window
- You'll see: 🚀, 📊, ✅, 🔗, ❌ emojis with messages

### Check Frontend Logs
- Open browser DevTools (F12)
- Go to Console tab
- Look for API errors or network issues

---

## 🎨 Features

- ✅ User login (admin/admin123)
- ✅ Equipment receipts
- ✅ Item management
- ✅ Receipt history
- ✅ Hebrew language UI
- ✅ Responsive design
- ✅ Real-time inventory

---

## 📁 File Locations

| What | Where |
|------|-------|
| Backend Code | `/backend/Bazap.API` |
| Frontend Code | `/frontend/src` |
| Database | `/backend/Bazap.API/bazap.db` |
| API Docs | http://localhost:5000/swagger |
| Full Guide | `STARTUP_GUIDE.md` |

---

## ⏰ Startup Timeline

| Time | What Happens |
|------|--------------|
| 0s | `start.bat` runs |
| 1s | Backend window opens |
| 2s | Frontend window opens |
| 3s | Backend initializing database |
| 5s | Backend ready on port 5000 |
| 6s | Frontend ready on port 5173 |
| 7s | You can visit http://localhost:5173 |

---

## 🚨 Common Errors & Fixes

| Error | Fix |
|-------|-----|
| "Network Error" on login | Wait 5 more seconds, refresh |
| "Cannot find module 'react'" | `cd frontend && npm install` |
| "Port 5000 already in use" | Kill other process on 5000 |
| "Database locked" | Restart both services |
| "Unauthorized (401)" | Clear localStorage, login again |

---

## 📞 Still Having Issues?

1. **Read:** `STARTUP_GUIDE.md` (comprehensive guide)
2. **Check:** Console logs (F12 in browser)
3. **Check:** Backend terminal output
4. **Reset:** Delete `bazap.db` and restart
5. **Restart:** Close all windows and run `start.bat` again

---

**Made with ❤️ for equipment management**

Version: 2.0 | Updated: January 20, 2026
