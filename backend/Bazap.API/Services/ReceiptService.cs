using Bazap.API.Models;
using Bazap.API.DTOs;
using Bazap.API.Data;
using Microsoft.EntityFrameworkCore;

namespace Bazap.API.Services;

public interface IReceiptService
{
    Task<List<ReceiptDto>> GetAllReceiptsAsync(DateTime? fromDate = null, DateTime? toDate = null, string? searchTerm = null, int? itemId = null);
    Task<ReceiptDto?> GetReceiptByIdAsync(int id);
    Task<ReceiptDto> CreateReceiptAsync(CreateReceiptRequest request, int userId);
    Task<bool> DeleteReceiptAsync(int id);
    Task<bool> CancelReceiptAsync(int id, string reason);
}

public class ReceiptService : IReceiptService
{
    private readonly BazapContext _context;

    public ReceiptService(BazapContext context)
    {
        _context = context;
    }

    public async Task<List<ReceiptDto>> GetAllReceiptsAsync(DateTime? fromDate = null, DateTime? toDate = null, string? searchTerm = null, int? itemId = null)
    {
        var query = _context.Receipts
            .Include(r => r.CreatedByUser)
            .Include(r => r.Items)
            .ThenInclude(ri => ri.Item)
            .AsQueryable();

        if (fromDate.HasValue)
            query = query.Where(r => r.ReceiptDate >= fromDate);

        if (toDate.HasValue)
            query = query.Where(r => r.ReceiptDate <= toDate.Value.AddDays(1));

        if (!string.IsNullOrEmpty(searchTerm))
            query = query.Where(r => r.RecipientName.Contains(searchTerm) || 
                                    r.Items.Any(i => i.Item!.Name.Contains(searchTerm)));

        if (itemId.HasValue)
            query = query.Where(r => r.Items.Any(i => i.ItemId == itemId));

        return await query
            .OrderByDescending(r => r.ReceiptDate)
            .Select(r => new ReceiptDto
            {
                Id = r.Id,
                RecipientName = r.RecipientName,
                ReceiptDate = r.ReceiptDate,
                CreatedByUserId = r.CreatedByUserId,
                CreatedByUsername = r.CreatedByUser != null ? r.CreatedByUser.Username : null,
                Items = r.Items.Select(ri => new ReceiptItemDto
                {
                    Id = ri.Id,
                    ItemId = ri.ItemId,
                    ItemName = ri.Item != null ? ri.Item.Name : null,
                    Quantity = ri.Quantity
                }).ToList(),
                CreatedAt = r.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<ReceiptDto?> GetReceiptByIdAsync(int id)
    {
        var receipt = await _context.Receipts
            .Include(r => r.CreatedByUser)
            .Include(r => r.Items)
            .ThenInclude(ri => ri.Item)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (receipt == null)
            return null;

        return new ReceiptDto
        {
            Id = receipt.Id,
            RecipientName = receipt.RecipientName,
            ReceiptDate = receipt.ReceiptDate,
            CreatedByUserId = receipt.CreatedByUserId,
            CreatedByUsername = receipt.CreatedByUser?.Username,
            Items = receipt.Items.Select(ri => new ReceiptItemDto
            {
                Id = ri.Id,
                ItemId = ri.ItemId,
                ItemName = ri.Item?.Name,
                Quantity = ri.Quantity
            }).ToList(),
            CreatedAt = receipt.CreatedAt
        };
    }

    public async Task<ReceiptDto> CreateReceiptAsync(CreateReceiptRequest request, int userId)
    {
        if (string.IsNullOrWhiteSpace(request.RecipientName))
            throw new InvalidOperationException("יש להזין שם מקבל");

        if (request.Items == null || request.Items.Count == 0)
            throw new InvalidOperationException("קבלה חייבת להכיל לפחות פריט אחד");

        // Validate items exist and have sufficient quantity
        foreach (var requestItem in request.Items)
        {
            var item = await _context.Items.FindAsync(requestItem.ItemId);
            if (item == null)
                throw new InvalidOperationException($"פריט {requestItem.ItemId} לא נמצא");

            if (requestItem.Quantity <= 0)
                throw new InvalidOperationException("כמות חייבת להיות חיובית");

            if (item.QuantityInStock < requestItem.Quantity)
                throw new InvalidOperationException($"כמות במלאי של {item.Name} אינה מספיקה. זמין: {item.QuantityInStock}, מבוקש: {requestItem.Quantity}");
        }

        var receipt = new Receipt
        {
            RecipientName = request.RecipientName,
            CreatedByUserId = userId,
            ReceiptDate = DateTime.UtcNow
        };

        _context.Receipts.Add(receipt);
        await _context.SaveChangesAsync(); // Save receipt first to get ID

        // Add receipt items and update inventory
        foreach (var requestItem in request.Items)
        {
            var item = await _context.Items.FindAsync(requestItem.ItemId);
            if (item != null)
            {
                var receiptItem = new ReceiptItem
                {
                    ReceiptId = receipt.Id,
                    ItemId = requestItem.ItemId,
                    Quantity = requestItem.Quantity
                };

                item.QuantityInStock -= requestItem.Quantity;
                _context.ReceiptItems.Add(receiptItem);
                _context.Items.Update(item);
            }
        }

        await _context.SaveChangesAsync();

        var createdReceipt = await GetReceiptByIdAsync(receipt.Id);
        return createdReceipt ?? throw new InvalidOperationException("שגיאה בהוספת קבלה");
    }

    public async Task<bool> DeleteReceiptAsync(int id)
    {
        var receipt = await _context.Receipts
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (receipt == null)
            return false;

        // Restore inventory
        foreach (var receiptItem in receipt.Items)
        {
            var item = await _context.Items.FindAsync(receiptItem.ItemId);
            if (item != null)
            {
                item.QuantityInStock += receiptItem.Quantity;
                _context.Items.Update(item);
            }
        }

        _context.Receipts.Remove(receipt);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> CancelReceiptAsync(int id, string reason)
    {
        var receipt = await _context.Receipts
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (receipt == null)
            return false;

        // Restore inventory
        foreach (var receiptItem in receipt.Items)
        {
            var item = await _context.Items.FindAsync(receiptItem.ItemId);
            if (item != null)
            {
                item.QuantityInStock += receiptItem.Quantity;
                _context.Items.Update(item);
            }
        }

        // Mark as cancelled instead of deleting
        receipt.IsCancelled = true;
        receipt.CancellationReason = reason;
        receipt.CancelledAt = DateTime.UtcNow;
        _context.Receipts.Update(receipt);
        await _context.SaveChangesAsync();
        return true;
    }
}
