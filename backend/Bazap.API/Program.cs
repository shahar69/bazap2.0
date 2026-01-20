using Bazap.API.Data;
using Bazap.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Configure SQLite
var dbPath = Path.Combine(AppContext.BaseDirectory, "bazap.db");
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

// Add services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IItemService, ItemService>();
builder.Services.AddScoped<IReceiptService, ReceiptService>();

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

// Migrate database on startup
try
{
    using (var scope = app.Services.CreateScope())
    {
        var context = scope.ServiceProvider.GetRequiredService<BazapContext>();
        logger.LogInformation("📊 Initializing database...");
        
        // Delete existing database to start fresh (development only)
        context.Database.EnsureDeleted();
        logger.LogInformation("🗑️  Old database deleted");
        
        // Create all tables from the model
        context.Database.EnsureCreated();
        logger.LogInformation("📋 Database tables created");
        
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
        
        logger.LogInformation("✅ Database initialized successfully");
    }
}
catch (Exception ex)
{
    logger.LogError(ex, "❌ Failed to initialize database");
    throw;
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
