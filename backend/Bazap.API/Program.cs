using Bazap.API.Data;
using Bazap.API.Models;
using Bazap.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Configure SQLite with file in current directory
var dbPath = "bazap_data.db";
builder.Services.AddDbContext<BazapContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

// Add JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "super_secret_key_123456789_for_bazap_system_2026";
var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = "bazap",
            ValidAudience = "bazap-app",
            IssuerSigningKey = key,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// Add OpenTelemetry tracing
builder.AddBazapTracing();

builder.Services.AddHttpClient();

// Add services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IItemService, ItemService>();
builder.Services.AddScoped<IReceiptService, ReceiptService>();
builder.Services.AddScoped<IEventService, EventService>();
builder.Services.AddScoped<IInspectionService, InspectionService>();
builder.Services.AddScoped<IItemSearchService, ItemSearchService>();
builder.Services.AddScoped<IPrintService, PrintService>();
builder.Services.AddScoped<IAiImportService, AiImportService>();
builder.Services.AddScoped<ISapExportService, SapExportService>();
builder.Services.AddScoped<ISapMappingService, SapMappingService>();
builder.Services.AddScoped<SapIntegrationProfileResolver>();
builder.Services.AddScoped<FileExportSapTransportAdapter>();
builder.Services.AddScoped<ServiceLayerSapTransportAdapter>();
builder.Services.AddScoped<ISapSyncOrchestrator, SapSyncOrchestrator>();

// Add controllers
builder.Services.AddControllers();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
    {
        builder.AllowAnyOrigin()
               .AllowAnyMethod()
               .AllowAnyHeader();
    });
});

// Add Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure logging
var logger = app.Services.GetRequiredService<ILogger<Program>>();
logger.LogInformation("🚀 Bazap 2.0 API Starting...");
logger.LogInformation("📡 OpenTelemetry tracing configured - exporting to http://localhost:4317");

// Migrate database on startup
try
{
    using (var scope = app.Services.CreateScope())
    {
        var context = scope.ServiceProvider.GetRequiredService<BazapContext>();
        logger.LogInformation("📊 Initializing database...");
        
        // Just ensure the database exists, don't delete it
        context.Database.EnsureCreated();
        logger.LogInformation("📋 Database tables created");
        EnsureSapTables(context);
        
        // Seed default data
        var existingUsers = context.Users.Any();
        if (!existingUsers)
        {
            var adminPasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123");
            var adminUser = new Bazap.API.Models.User
            {
                Username = "admin",
                PasswordHash = adminPasswordHash,
                Role = "Admin",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(adminUser);
            context.SaveChanges();
            logger.LogInformation("👤 Admin user created (admin/admin123)");
        }

        // Seed default equipment items from log export (or fallback set)
        SeedEquipmentFromLog(context, logger);
        
        logger.LogInformation("✅ Database initialized successfully");
    }
}
catch (Exception ex)
{
    logger.LogError(ex, "❌ Failed to initialize database");
    // Don't throw - let the app start even if DB init fails, it will show friendly errors
}

// Configure middleware
app.UseCors("AllowAll");

// Add authentication and authorization
app.UseAuthentication();
app.UseAuthorization();

// Add error handling middleware
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        var exceptionHandlerPathFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerPathFeature>();
        
        if (exceptionHandlerPathFeature?.Error is Exception exception)
        {
            logger.LogError(exception, "Unhandled exception");
            await context.Response.WriteAsJsonAsync(new { 
                error = "שגיאה בשרת", 
                details = app.Environment.IsDevelopment() ? exception.Message : null 
            });
        }
    });
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    logger.LogInformation("📖 Swagger UI available at /swagger");
}
else
{
    app.UseHttpsRedirection();
}

app.UseAuthorization();
app.MapControllers();

logger.LogInformation("🔗 API will listen on: http://localhost:5000");
app.Run();

// Helpers
static void SeedEquipmentFromLog(BazapContext context, ILogger logger)
{
    if (context.Items.Any())
    {
        logger.LogInformation("📦 Items already exist, skipping log seed");
        return;
    }

    var imported = ImportFromLog(context, logger);
    if (imported > 0)
    {
        logger.LogInformation("✅ Seeded {Count} equipment items from log.txt", imported);
        return;
    }

    // Fallback hardcoded items for tests if log import failed/empty
    var fallbackItems = new []
    {
        new Item { Name = "קורא מפלס", Code = "KM-001", Description = "דוגמת בדיקה", QuantityInStock = 5, IsActive = true },
        new Item { Name = "חוליה גמישה", Code = "HG-002", Description = "דוגמת בדיקה", QuantityInStock = 10, IsActive = true },
        new Item { Name = "מגפון", Code = "MG-003", Description = "דוגמת בדיקה", QuantityInStock = 3, IsActive = true },
        new Item { Name = "פתיל לב", Code = "PL-004", Description = "דוגמת בדיקה", QuantityInStock = 8, IsActive = true },
        new Item { Name = "אנטנת סנפיר", Code = "AS-005", Description = "דוגמת בדיקה", QuantityInStock = 4, IsActive = true }
    };

    context.Items.AddRange(fallbackItems);
    context.SaveChanges();
    logger.LogInformation("✅ Seeded {Count} fallback equipment items", fallbackItems.Length);
}

static int ImportFromLog(BazapContext context, ILogger logger)
{
    var logPath = FindFileUpwards("log.txt");
    if (logPath == null)
    {
        logger.LogWarning("⚠️ log.txt not found; skipping log import");
        return 0;
    }

    var lines = File.ReadAllLines(logPath);
    if (lines.Length <= 1)
    {
        logger.LogWarning("⚠️ log.txt has no data to import");
        return 0;
    }

    var uniqueItems = new Dictionary<string, Item>();

    for (var i = 1; i < lines.Length; i++) // skip header
    {
        var line = lines[i].Trim();
        if (string.IsNullOrWhiteSpace(line))
            continue;

        var parts = line.Split('\t');

        var quantityStr = parts.ElementAtOrDefault(0)?.Trim() ?? "0";
        var comments = parts.ElementAtOrDefault(1)?.Trim() ?? string.Empty;
        var orderNumber = parts.ElementAtOrDefault(2)?.Trim() ?? string.Empty;
        var makat = parts.ElementAtOrDefault(3)?.Trim() ?? string.Empty;
        var name = parts.ElementAtOrDefault(4)?.Trim() ?? string.Empty;
        var date = parts.ElementAtOrDefault(5)?.Trim() ?? string.Empty;

        var hasName = !string.IsNullOrWhiteSpace(name);
        var hasCode = !string.IsNullOrWhiteSpace(makat);

        if (!hasName && !hasCode)
            continue;

        var key = hasCode ? makat : name;
        var quantity = int.TryParse(quantityStr, out var q) ? Math.Max(0, q) : 0;

        if (!uniqueItems.TryGetValue(key, out var item))
        {
            var descriptionParts = new List<string>();
            if (!string.IsNullOrWhiteSpace(orderNumber)) descriptionParts.Add($"מס הזמנה {orderNumber}");
            if (!string.IsNullOrWhiteSpace(comments)) descriptionParts.Add($"הערות: {comments}");
            if (!string.IsNullOrWhiteSpace(date)) descriptionParts.Add($"תאריך: {date}");

            item = new Item
            {
                Name = hasName ? name : makat,
                Code = hasCode ? makat : null,
                Description = descriptionParts.Count > 0 ? string.Join(" | ", descriptionParts) : null,
                QuantityInStock = quantity,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            uniqueItems[key] = item;
        }
        else
        {
            item.QuantityInStock += quantity;
        }
    }

    if (uniqueItems.Count == 0)
    {
        logger.LogWarning("⚠️ No equipment rows were imported from log.txt");
        return 0;
    }

    context.Items.AddRange(uniqueItems.Values);
    context.SaveChanges();
    return uniqueItems.Count;
}

static string? FindFileUpwards(string fileName, int maxDepth = 12)
{
    var current = AppContext.BaseDirectory;
    for (var i = 0; i < maxDepth; i++)
    {
        var candidate = Path.Combine(current, fileName);
        if (File.Exists(candidate))
            return candidate;

        var parent = Directory.GetParent(current);
        if (parent == null)
            break;
        current = parent.FullName;
    }

    return null;
}

static void EnsureSapTables(BazapContext context)
{
    context.Database.ExecuteSqlRaw(@"
CREATE TABLE IF NOT EXISTS SapIntegrationProfiles (
    Id INTEGER PRIMARY KEY,
    Mode TEXT NOT NULL,
    BaseUrl TEXT NULL,
    CompanyDb TEXT NULL,
    AuthMode TEXT NOT NULL,
    ItemKeyMode TEXT NOT NULL,
    Username TEXT NULL,
    Password TEXT NULL,
    DefaultWarehouse TEXT NULL,
    GoodsIssueSeries TEXT NULL,
    GoodsReceiptSeries TEXT NULL,
    EnabledDocumentTypes TEXT NOT NULL,
    UseDirectServiceLayer INTEGER NOT NULL DEFAULT 0,
    UpdatedAt TEXT NOT NULL
);");

    context.Database.ExecuteSqlRaw(@"
CREATE TABLE IF NOT EXISTS ItemSapMappings (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    ItemId INTEGER NOT NULL,
    LocalMakat TEXT NOT NULL,
    SapItemCode TEXT NULL,
    SapItemName TEXT NULL,
    IsVerified INTEGER NOT NULL DEFAULT 0,
    LastSyncAt TEXT NULL,
    CreatedAt TEXT NOT NULL,
    UpdatedAt TEXT NOT NULL,
    FOREIGN KEY(ItemId) REFERENCES Items(Id) ON DELETE CASCADE
);");

    context.Database.ExecuteSqlRaw(@"
CREATE UNIQUE INDEX IF NOT EXISTS IX_ItemSapMappings_ItemId ON ItemSapMappings(ItemId);");

    context.Database.ExecuteSqlRaw(@"
CREATE TABLE IF NOT EXISTS SapSyncLogs (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    EventId INTEGER NOT NULL,
    Direction TEXT NOT NULL,
    SapDocumentType TEXT NOT NULL,
    Status TEXT NOT NULL,
    SapDocEntry INTEGER NULL,
    SapDocNum INTEGER NULL,
    RequestPayload TEXT NULL,
    ResponsePayload TEXT NULL,
    ErrorMessage TEXT NULL,
    CreatedAt TEXT NOT NULL,
    UpdatedAt TEXT NOT NULL,
    FOREIGN KEY(EventId) REFERENCES Events(Id) ON DELETE CASCADE
);");

    var profileExists = context.SapIntegrationProfiles.Any();
    if (!profileExists)
    {
        context.SapIntegrationProfiles.Add(new SapIntegrationProfile
        {
            Mode = "file_export",
            AuthMode = "basic",
            ItemKeyMode = "local_makat_mapping",
            EnabledDocumentTypes = "GoodsIssue,GoodsReceipt",
            UseDirectServiceLayer = false,
            UpdatedAt = DateTime.UtcNow
        });
        context.SaveChanges();
    }
}
