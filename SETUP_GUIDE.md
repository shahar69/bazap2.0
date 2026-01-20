# Bazap 2.0 - Setup and Running Guide

## Project Overview

Bazap 2.0 is a comprehensive equipment management system designed for the IDF's 388 Battalion. It features:
- Real-time inventory tracking
- Receipt/equipment distribution system
- Complete audit history
- Role-based access control
- Hebrew language interface

## Architecture

### Backend
- **Framework**: ASP.NET Core 8.0
- **Database**: SQLite
- **ORM**: Entity Framework Core
- **API Pattern**: RESTful Web API

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: CSS (Hebrew RTL support)

## Prerequisites

- .NET 8.0 SDK or later
- Node.js 18.0 or later
- npm or yarn package manager

## Backend Setup

### Step 1: Install .NET Dependencies

Navigate to the backend directory:
```bash
cd backend/Bazap.API
```

### Step 2: Build the Project

```bash
dotnet build
```

### Step 3: Run Database Migrations

The database will be automatically created and migrated on first run. No manual migration steps are needed.

### Step 4: Start the Backend Server

```bash
dotnet run
```

The API will be available at: `http://localhost:5000`

You can view the Swagger API documentation at: `http://localhost:5000/swagger`

## Frontend Setup

### Step 1: Install Dependencies

Navigate to the frontend directory:
```bash
cd frontend
npm install
```

Or with yarn:
```bash
yarn install
```

### Step 2: Start the Development Server

```bash
npm run dev
```

The application will be available at: `http://localhost:5173`

The frontend is configured to proxy API calls to the backend at `http://localhost:5000`

### Step 3: Build for Production

```bash
npm run build
```

The compiled files will be in the `dist` folder.

## Default Credentials

To log in to the application:

**Username**: `admin`
**Password**: `admin123`

**Note**: Change this password in production and add proper user management.

## Project Structure

```
bazap2.0/
├── backend/
│   └── Bazap.API/
│       ├── Models/              # Data models (User, Item, Receipt, etc.)
│       ├── Data/                # DbContext and database configuration
│       ├── Controllers/         # API controllers
│       ├── Services/            # Business logic services
│       ├── DTOs/                # Data transfer objects
│       ├── Program.cs           # Application entry point
│       └── Bazap.API.csproj     # Project file
│
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable React components
│   │   ├── pages/               # Page components
│   │   │   ├── LoginPage.tsx
│   │   │   ├── EquipmentReceiptPage.tsx
│   │   │   ├── ItemManagementPage.tsx
│   │   │   └── HistoryPage.tsx
│   │   ├── services/            # API and context services
│   │   ├── styles/              # CSS stylesheets
│   │   ├── App.tsx              # Main app component
│   │   ├── main.tsx             # Entry point
│   │   └── types.ts             # TypeScript type definitions
│   ├── index.html               # HTML template
│   ├── vite.config.ts           # Vite configuration
│   ├── package.json             # NPM dependencies
│   └── tsconfig.json            # TypeScript configuration
│
└── README.md                     # Project documentation
```

## Key Features

### 1. Authentication & Login
- User login with username and password
- Session management with localStorage
- Role-based access control (Admin, Almachsan)

### 2. Equipment Receipt (הוצאת ציוד)
- Quick equipment distribution interface
- Real-time inventory updates
- Multiple items per receipt
- Inventory validation before distribution
- Success/error feedback

### 3. Item Management (ניהול פריטים)
- Add new equipment items
- Edit existing items
- Delete items (with validation)
- Track inventory levels
- Mark items as active/inactive

### 4. History & Audit Log
- View all equipment receipts
- Filter by date range
- Search by recipient or item name
- See who created each receipt
- Complete audit trail

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Items
- `GET /api/items` - Get all items
- `GET /api/items/{id}` - Get specific item
- `POST /api/items` - Create new item
- `PUT /api/items/{id}` - Update item
- `DELETE /api/items/{id}` - Delete item

### Receipts
- `GET /api/receipts` - Get all receipts (with filters)
- `GET /api/receipts/{id}` - Get specific receipt
- `POST /api/receipts` - Create new receipt
- `DELETE /api/receipts/{id}` - Delete receipt

## Database Schema

### Users Table
- Id (int, primary key)
- Username (string, unique)
- PasswordHash (string)
- Role (string) - Admin or Almachsan
- IsActive (bool)
- CreatedAt (datetime)

### Items Table
- Id (int, primary key)
- Name (string, required)
- Code (string, unique, optional)
- QuantityInStock (int)
- IsActive (bool)
- CreatedAt (datetime)
- UpdatedAt (datetime)

### Receipts Table
- Id (int, primary key)
- RecipientName (string)
- ReceiptDate (datetime)
- CreatedByUserId (int, foreign key)
- CreatedAt (datetime)

### ReceiptItems Table (Junction)
- Id (int, primary key)
- ReceiptId (int, foreign key)
- ItemId (int, foreign key)
- Quantity (int)

## Troubleshooting

### Backend Won't Start
1. Ensure .NET 8.0 is installed: `dotnet --version`
2. Check if port 5000 is available
3. Clear the bin/obj folders and rebuild: `dotnet clean && dotnet build`

### Frontend Build Issues
1. Clear node_modules: `rm -rf node_modules && npm install`
2. Clear npm cache: `npm cache clean --force`
3. Check Node version: `node --version` (should be 18+)

### API Connection Issues
1. Verify backend is running on http://localhost:5000
2. Check CORS is enabled in Program.cs
3. Verify the proxy configuration in vite.config.ts matches your backend URL

### Database Issues
1. Delete bazap.db file to reset database
2. Run `dotnet run` again to recreate it with migrations

## Performance Optimization

The system is optimized for:
- **Fast UI response**: React with Vite
- **Efficient data queries**: EF Core with proper indexing
- **Real-time updates**: No polling, direct API calls
- **Minimal network traffic**: Only necessary data transferred

## Security Considerations

For production deployment:
1. Change default admin password immediately
2. Implement proper authentication (JWT tokens instead of basic tokens)
3. Use HTTPS
4. Implement rate limiting
5. Add comprehensive logging
6. Regular security audits
7. Database backups

## Future Enhancements

Potential features for future versions:
1. Barcode/QR code scanning for items
2. Equipment return management
3. Approval workflows
4. Advanced reporting and analytics
5. Multi-language support beyond Hebrew
6. Mobile app for on-site equipment distribution
7. Integration with IDF personnel database
8. Equipment maintenance tracking
9. Inventory forecasting
10. Multi-site support for multiple units

## Support

For issues or questions, contact the development team or refer to the requirements document in README.md.

## License

Internal Use Only - IDF 388 Battalion
