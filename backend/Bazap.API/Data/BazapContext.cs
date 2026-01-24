using Bazap.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Bazap.API.Data;

public class BazapContext : DbContext
{
    public BazapContext(DbContextOptions<BazapContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Item> Items { get; set; }
    public DbSet<Receipt> Receipts { get; set; }
    public DbSet<ReceiptItem> ReceiptItems { get; set; }
    public DbSet<Event> Events { get; set; }
    public DbSet<EventItem> EventItems { get; set; }
    public DbSet<InspectionAction> InspectionActions { get; set; }
    public DbSet<LabelPrint> LabelPrints { get; set; }
    public DbSet<ItemGroup> ItemGroups { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User configuration
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();

        // Item configuration
        modelBuilder.Entity<Item>()
            .HasIndex(i => i.Code)
            .IsUnique();

        // Receipt configuration
        modelBuilder.Entity<Receipt>()
            .HasOne(r => r.CreatedByUser)
            .WithMany()
            .HasForeignKey(r => r.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        // ReceiptItem configuration
        modelBuilder.Entity<ReceiptItem>()
            .HasOne(ri => ri.Receipt)
            .WithMany(r => r.Items)
            .HasForeignKey(ri => ri.ReceiptId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ReceiptItem>()
            .HasOne(ri => ri.Item)
            .WithMany(i => i.ReceiptItems)
            .HasForeignKey(ri => ri.ItemId)
            .OnDelete(DeleteBehavior.Restrict);

        // Event configuration
        modelBuilder.Entity<Event>()
            .HasMany(e => e.Items)
            .WithOne(i => i.Event)
            .HasForeignKey(i => i.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<EventItem>()
            .HasOne(ei => ei.Item)
            .WithMany(i => i.EventItems)
            .HasForeignKey(ei => ei.ItemId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<EventItem>()
            .HasMany(ei => ei.InspectionActions)
            .WithOne(a => a.EventItem)
            .HasForeignKey(a => a.EventItemId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<InspectionAction>()
            .HasMany(a => a.LabelPrints)
            .WithOne(lp => lp.InspectionAction)
            .HasForeignKey(lp => lp.InspectionActionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ItemGroup>()
            .HasMany(g => g.Items)
            .WithOne()
            .HasForeignKey("ItemGroupId")
            .OnDelete(DeleteBehavior.SetNull);

        // Seed default admin user (password: admin123)
        var adminPasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123");
        modelBuilder.Entity<User>().HasData(
            new User
            {
                Id = 1,
                Username = "admin",
                PasswordHash = adminPasswordHash,
                Role = "Admin",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            }
        );
    }
}
