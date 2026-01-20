# 🚀 Bazap 2.0 - Startup & Troubleshooting Guide

## Quick Start

### Option 1: Automated Startup (Recommended)
```bash
# Simply run the start script
start.bat  # Windows
./start.sh # Linux/Mac
```

The script will:
- ✅ Verify .NET SDK is installed
- ✅ Verify Node.js is installed
- ✅ Start Backend on http://localhost:5000
- ✅ Start Frontend on http://localhost:5173

### Option 2: Manual Startup

**Terminal 1 - Backend:**
```bash
cd backend/Bazap.API
dotnet restore
dotnet run
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 🔐 Default Login Credentials

- **Username:** `admin`
- **Password:** `admin123`

## 📍 Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | Main application |
| Backend API | http://localhost:5000/api | REST API endpoints |
| Swagger UI | http://localhost:5000/swagger | API documentation |

## ✅ Verification Checklist

### Backend
1. ✅ Should see: "🚀 Bazap 2.0 API Starting..."
2. ✅ Should see: "📊 Applying database migrations..."
3. ✅ Should see: "✅ Database initialized successfully"
4. ✅ Should see: "🔗 API will listen on: http://localhost:5000"
5. ✅ Browser test: Open http://localhost:5000/swagger - should load Swagger UI

### Frontend
1. ✅ Should see: "✓ built in Xs"
2. ✅ Browser test: http://localhost:5173 - should load login page
3. ✅ Enter credentials: admin / admin123
4. ✅ Should redirect to equipment receipt page

## 🔧 Troubleshooting

### "Cannot find module 'react' or its corresponding type declarations"

**Solution:**
```bash
cd frontend
npm install
npm run dev
```

### "Network Error" on Login

**Check 1 - Backend Running:**
```bash
# Open browser and test
http://localhost:5000/swagger
```
Should show Swagger UI. If not, backend isn't running.

**Check 2 - Port Conflict:**
```bash
# Windows: Check if port 5000 is in use
netstat -ano | findstr :5000

# Linux/Mac
lsof -i :5000
```

**Check 3 - Restart Services:**
Kill both processes and restart from scratch.

### "ERR_NAME_NOT_RESOLVED" in Browser

Ensure you're using:
- ✅ `http://localhost:5000` (not `https`)
- ✅ `http://localhost:5173` for frontend

### Database Issues

**Reset Database:**
```bash
cd backend/Bazap.API
rm bazap.db  # Delete database file
dotnet run   # Recreate with seed data
```

### Port Already in Use

**Find and kill process:**

Windows:
```bash
netstat -ano | findstr :5000
taskkill /PID [PID] /F
```

Linux/Mac:
```bash
lsof -i :5000
kill -9 [PID]
```

## 📊 Project Structure

```
bazap2.0/
├── backend/
│   └── Bazap.API/
│       ├── Controllers/       # API endpoints
│       ├── Services/          # Business logic
│       ├── Models/            # Data models
│       ├── Data/              # Database context
│       ├── DTOs/              # Data transfer objects
│       └── Program.cs         # App configuration
├── frontend/
│   ├── src/
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services & context
│   │   ├── components/        # Reusable components
│   │   └── styles/            # CSS styles
│   ├── package.json           # Dependencies
│   └── vite.config.ts         # Vite configuration
└── start.bat                  # Quick start script
```

## 🐛 Debug Mode

### Enable Detailed Logging

Backend console will automatically show:
- 🚀 Startup events
- 📊 Database operations
- 📖 API endpoint info
- ❌ Errors with full details

### Check Browser Console

Open DevTools (F12) and check:
- Console tab - API errors and logs
- Network tab - HTTP requests/responses
- Application tab - LocalStorage for tokens

## 🔒 Features

- ✅ User authentication with BCrypt hashing
- ✅ Equipment receipt management
- ✅ Item inventory tracking
- ✅ Receipt history with search/filtering
- ✅ Hebrew language support
- ✅ Responsive design
- ✅ Real-time inventory updates

## 📝 Common Tasks

### Add New User (via Database)
```csharp
// Use Entity Framework migrations
dotnet ef migrations add AddNewUser
dotnet ef database update
```

### Create New Equipment Item
1. Login as admin
2. Go to "Item Management"
3. Click "Add New Item"
4. Fill in details and click "Save"

### Create Equipment Receipt
1. Go to "Equipment Receipt"
2. Enter recipient name
3. Select items and quantities
4. Click "Submit"

## 🆘 Get Help

If issues persist:
1. ✅ Check browser console (F12)
2. ✅ Check backend console output
3. ✅ Delete `bazap.db` and restart
4. ✅ Clear browser cache and localStorage
5. ✅ Restart both services completely

---
**Last Updated:** January 20, 2026
**Version:** 2.0
