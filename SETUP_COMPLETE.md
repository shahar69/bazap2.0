# ✅ Bazap 2.0 - Setup Complete

## Services Running

### Backend API - ASP.NET Core
- **Status**: ✅ Running
- **Port**: 5000
- **URL**: http://localhost:5000
- **Swagger Docs**: http://localhost:5000/swagger
- **Framework**: .NET 10.0
- **Database**: SQLite (bazap.db)

### Frontend - React + Vite
- **Status**: ✅ Running
- **Port**: 5173
- **URL**: http://localhost:5173
- **Framework**: React + TypeScript + Vite

---

## 🚀 Quick Access

### Login Application
Visit: **http://localhost:5173**

### API Documentation
Visit: **http://localhost:5000/swagger**

### Default Credentials
- **Username**: `admin`
- **Password**: `admin123`

---

## 🔧 System Information

- **Node.js**: v25.3.0
- **.NET SDK**: 10.0.102
- **npm**: Installed
- **macOS**: Configured with Homebrew

---

## 📝 Dependencies Installed

### Backend Dependencies
- Microsoft.EntityFrameworkCore 8.0.0
- Microsoft.EntityFrameworkCore.Sqlite 8.0.0
- Swashbuckle.AspNetCore 6.5.0
- BCrypt.Net-Next 4.0.3
- Microsoft.AspNetCore.Authentication.JwtBearer 8.0.0
- System.IdentityModel.Tokens.Jwt 7.0.3
- Microsoft.IdentityModel.Tokens 7.0.3

### Frontend Dependencies
- React
- TypeScript
- Vite
- All npm packages (92 packages audited)

---

## 🛑 To Stop Services

In the terminal, press `Ctrl+C` in each running service window.

---

## 🔄 To Restart Services

### Backend
```bash
cd backend/Bazap.API
dotnet run
```

### Frontend
```bash
cd frontend
npm run dev
```

---

## ⚠️ Notes

- Minor package vulnerabilities present in JWT libraries (see `npm audit` output)
- Database is reset on each backend startup
- All systems initialized and ready for use

---

**Setup completed on**: January 21, 2026
