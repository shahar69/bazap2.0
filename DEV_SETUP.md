# 🛠️ Bazap 2.0 - Development Environment Setup

## System Requirements

### Windows
- ✅ .NET 8.0 SDK or later
- ✅ Node.js 18+ and npm
- ✅ Command Prompt or PowerShell
- ✅ 500 MB disk space

### Linux/Mac
- ✅ .NET 8.0 SDK or later
- ✅ Node.js 18+ and npm
- ✅ Bash shell
- ✅ 500 MB disk space

## Prerequisites Check

### Check .NET Installation
```bash
dotnet --version
# Should show: 8.0.0 or higher
```

### Check Node.js Installation
```bash
node --version
npm --version
# Should show: v18+ and 9+
```

### If Not Installed

#### Windows - Install .NET SDK
1. Visit: https://dotnet.microsoft.com/download
2. Download: .NET 8.0 SDK
3. Run installer
4. Restart terminal

#### Windows - Install Node.js
1. Visit: https://nodejs.org/
2. Download: LTS version
3. Run installer
4. Restart terminal

#### Linux/Mac - Using Package Manager
```bash
# macOS (Homebrew)
brew install dotnet-sdk node

# Ubuntu/Debian
sudo apt install dotnet-sdk-8.0 nodejs npm

# Fedora
sudo dnf install dotnet-sdk-8.0 nodejs npm
```

## Project Structure

```
bazap2.0/
│
├── backend/
│   └── Bazap.API/
│       ├── Program.cs              # Application entry point
│       ├── Bazap.API.csproj       # Project configuration
│       ├── appsettings.json        # Production settings
│       ├── appsettings.Development.json  # Dev settings
│       │
│       ├── Controllers/            # API endpoints
│       │   ├── AuthController.cs
│       │   ├── ItemsController.cs
│       │   └── ReceiptsController.cs
│       │
│       ├── Services/               # Business logic
│       │   ├── AuthService.cs
│       │   ├── ItemService.cs
│       │   └── ReceiptService.cs
│       │
│       ├── Models/                 # Data models
│       │   ├── User.cs
│       │   ├── Item.cs
│       │   ├── Receipt.cs
│       │   └── ReceiptItem.cs
│       │
│       ├── Data/
│       │   └── BazapContext.cs    # Database context
│       │
│       └── DTOs/                   # Data transfer objects
│           ├── AuthDto.cs
│           ├── ItemDto.cs
│           └── ReceiptDto.cs
│
├── frontend/
│   ├── package.json                # npm dependencies
│   ├── tsconfig.json               # TypeScript config
│   ├── vite.config.ts              # Build configuration
│   ├── index.html                  # HTML entry point
│   │
│   └── src/
│       ├── main.tsx                # React entry point
│       ├── App.tsx                 # Root component
│       ├── types.ts                # TypeScript types
│       │
│       ├── pages/                  # Page components
│       │   ├── LoginPage.tsx
│       │   ├── EquipmentReceiptPage.tsx
│       │   ├── ItemManagementPage.tsx
│       │   └── HistoryPage.tsx
│       │
│       ├── services/               # API & state
│       │   ├── api.ts              # Axios configuration
│       │   └── AuthContext.tsx     # Auth provider
│       │
│       ├── components/             # Reusable components
│       │   └── (to be added)
│       │
│       └── styles/
│           └── app.css             # Global styles
│
├── start.bat                       # Windows quick start
├── start.sh                        # Linux/Mac quick start
├── bazap.db                        # SQLite database (auto-created)
│
└── Documentation/
    ├── STARTUP_GUIDE.md           # Comprehensive guide
    ├── QUICK_START.md             # Quick reference
    ├── CHANGES_SUMMARY.md         # What was fixed
    └── DEV_SETUP.md               # This file
```

## Configuration Files

### Backend Configuration

#### Program.cs (Application Setup)
```csharp
// What it does:
// 1. Configures database (SQLite)
// 2. Registers services
// 3. Sets up CORS
// 4. Configures middleware
// 5. Sets up logging
```

#### appsettings.Development.json
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "Kestrel": {
    "Endpoints": {
      "Http": {
        "Url": "http://localhost:5000"  // Server address
      }
    }
  }
}
```

### Frontend Configuration

#### vite.config.ts
```typescript
// Vite configuration for:
// - React plugin support
// - Development server setup
// - Build optimization
// - Port configuration (5173)
```

#### tsconfig.json
```json
// TypeScript configuration for:
// - React JSX support
// - Module resolution
// - Strict type checking
```

## Database Setup

### SQLite Database
- **Location:** `backend/Bazap.API/bazap.db`
- **Type:** SQLite3 (file-based)
- **Size:** ~50KB (small, portable)
- **Auto-created:** Yes, on first run

### Seed Data
Default admin user created automatically:
```
Username: admin
Password: admin123 (BCrypt hashed)
Role: Admin
Active: true
```

### Migrations
Entity Framework automatically:
1. Creates tables on startup
2. Applies migrations
3. Seeds default data

## Services Overview

### AuthService
```csharp
// Handles:
// - User login
// - Password verification (BCrypt)
// - Token generation
// - User retrieval
```

### ItemService
```csharp
// Handles:
// - Create items
// - Update items
// - Delete items
// - List items with filtering
// - Inventory tracking
```

### ReceiptService
```csharp
// Handles:
// - Create receipts
// - Delete receipts
// - List receipts with filtering
// - Receipt detail retrieval
// - Date-based filtering
```

## API Documentation

### Swagger/OpenAPI
- **Access:** http://localhost:5000/swagger
- **Features:**
  - Interactive endpoint testing
  - Request/response schemas
  - Authorization testing
  - Code generation

## Port Configuration

| Service | Port | Protocol | URL |
|---------|------|----------|-----|
| Backend | 5000 | HTTP | http://localhost:5000 |
| Frontend | 5173 | HTTP | http://localhost:5173 |

### Change Ports (if needed)

**Backend:**
Edit `appsettings.Development.json`:
```json
"Kestrel": {
  "Endpoints": {
    "Http": {
      "Url": "http://localhost:5001"  // Change 5000 to 5001
    }
  }
}
```

**Frontend:**
Edit `vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    port: 5174  // Change 5173 to 5174
  }
});
```

## Environment Variables

### Backend
No environment variables needed for development.
All settings are in `appsettings.Development.json`

### Frontend
No environment variables needed for development.
API base URL is hardcoded in `src/services/api.ts`:
```typescript
const API_BASE_URL = 'http://localhost:5000/api';
```

## npm Scripts

### Frontend Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Backend Commands
```bash
dotnet run       # Start development server
dotnet build     # Compile code
dotnet clean     # Clean build artifacts
dotnet ef        # Entity Framework CLI
```

## Dependency Management

### Backend Dependencies
- **EntityFrameworkCore** - ORM for database
- **EntityFrameworkCore.Sqlite** - SQLite provider
- **Swashbuckle.AspNetCore** - Swagger UI
- **BCrypt.Net-Next** - Password hashing

### Frontend Dependencies
- **react** - UI framework
- **react-dom** - React DOM rendering
- **axios** - HTTP client
- **typescript** - Type safety
- **vite** - Build tool

## Troubleshooting Common Setup Issues

### .NET Not Found
```bash
# Windows: Add to PATH if needed
# Check installation:
dotnet --version

# If not found:
# 1. Restart terminal
# 2. Restart computer
# 3. Reinstall SDK
```

### npm Permissions Error (Linux/Mac)
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm

# Or use nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
```

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID [number] /F

# Linux/Mac
lsof -i :5000
kill -9 [process_id]
```

### Database Corruption
```bash
# Delete and recreate
cd backend/Bazap.API
rm bazap.db  # Linux/Mac: rm bazap.db
del bazap.db # Windows
dotnet run
```

## Development Workflow

### 1. Start Development Environment
```bash
start.bat  # Windows
./start.sh # Linux/Mac
```

### 2. Check Backend Status
Look for these messages in backend terminal:
```
🚀 Bazap 2.0 API Starting...
📊 Applying database migrations...
✅ Database initialized successfully
🔗 API will listen on: http://localhost:5000
```

### 3. Check Frontend Status
Look for this message in frontend terminal:
```
VITE v5.0.0  ready in xxx ms

➜  Local:   http://localhost:5173/
```

### 4. Access Application
- Visit: http://localhost:5173
- Login: admin / admin123
- Start developing!

### 5. Make Changes
- **Backend:** Save files, see auto-reload in terminal
- **Frontend:** Save files, browser auto-refreshes
- **Database:** Auto-migrated if schema changes

## Best Practices

### Code Organization
- ✅ Keep models simple and focused
- ✅ Put business logic in services
- ✅ Use DTOs for API responses
- ✅ Keep components small and reusable
- ✅ Use TypeScript for type safety

### Error Handling
- ✅ Always use try-catch in async code
- ✅ Return meaningful error messages
- ✅ Log errors for debugging
- ✅ Handle 404, 400, 500 status codes

### Security
- ✅ Hash passwords with BCrypt
- ✅ Validate all inputs
- ✅ Use HTTPS in production
- ✅ Implement proper CORS
- ✅ Protect sensitive data

### Performance
- ✅ Use async/await for I/O
- ✅ Implement pagination for large lists
- ✅ Cache frequently accessed data
- ✅ Minimize API calls
- ✅ Optimize database queries

## Resources

### Official Documentation
- **.NET:** https://docs.microsoft.com/dotnet/
- **React:** https://react.dev/
- **TypeScript:** https://www.typescriptlang.org/
- **Entity Framework:** https://learn.microsoft.com/ef/

### Learning Resources
- ASP.NET Core: https://learn.microsoft.com/aspnet/core/
- React Hooks: https://react.dev/reference/react
- Entity Framework Core: https://learn.microsoft.com/ef/core/

## Getting Help

### Check These Files First
1. `STARTUP_GUIDE.md` - Comprehensive troubleshooting
2. `QUICK_START.md` - Quick reference
3. `CHANGES_SUMMARY.md` - What was modified

### Debug Mode
1. Open browser DevTools (F12)
2. Check Console and Network tabs
3. Check backend terminal output
4. Look for error messages with 🔴 or ❌

---

**Happy Developing! 🚀**

Need help? Check the guides or review the logs!
