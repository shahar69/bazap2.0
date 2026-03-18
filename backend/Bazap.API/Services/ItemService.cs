using Bazap.API.Models;
using Bazap.API.DTOs;
using Bazap.API.Data;
using Microsoft.EntityFrameworkCore;

namespace Bazap.API.Services;

public interface IItemService
{
    Task<List<ItemDto>> GetAllItemsAsync(bool includeInactive = false);
    Task<ItemDto?> GetItemByIdAsync(int id);
    Task<ItemDto> CreateItemAsync(CreateItemRequest request);
    Task<ItemDto> UpdateItemAsync(int id, UpdateItemRequest request);
    Task<bool> DeleteItemAsync(int id);
}

public class ItemService : IItemService
{
    private readonly BazapContext _context;

    public ItemService(BazapContext context)
    {
        _context = context;
    }

    public async Task<List<ItemDto>> GetAllItemsAsync(bool includeInactive = false)
    {
        var query = _context.Items.AsQueryable();
        
        if (!includeInactive)
            query = query.Where(i => i.IsActive);

        var items = await query.OrderBy(i => i.Name).ToListAsync();
        var itemIds = items.Select(i => i.Id).ToList();
        var mappings = await _context.ItemSapMappings.Where(m => itemIds.Contains(m.ItemId)).ToDictionaryAsync(m => m.ItemId);

        return items.Select(i => ToDto(i, mappings.GetValueOrDefault(i.Id))).ToList();
    }

    public async Task<ItemDto?> GetItemByIdAsync(int id)
    {
        var item = await _context.Items.FindAsync(id);
        
        if (item == null)
            return null;
        var mapping = await _context.ItemSapMappings.FirstOrDefaultAsync(m => m.ItemId == id);
        return ToDto(item, mapping);
    }

    public async Task<ItemDto> CreateItemAsync(CreateItemRequest request)
    {
        // Check for duplicates
        if (await _context.Items.AnyAsync(i => i.Name == request.Name))
            throw new InvalidOperationException("פריט בשם זה כבר קיים");

        if (!string.IsNullOrEmpty(request.Code) && 
            await _context.Items.AnyAsync(i => i.Code == request.Code))
            throw new InvalidOperationException("פריט עם קוד זה כבר קיים");

        var item = new Item
        {
            Name = request.Name,
            Code = request.Code,
            QuantityInStock = request.QuantityInStock,
            IsActive = true
        };

        _context.Items.Add(item);
        await _context.SaveChangesAsync();

        return ToDto(item, null);
    }

    public async Task<ItemDto> UpdateItemAsync(int id, UpdateItemRequest request)
    {
        var item = await _context.Items.FindAsync(id);
        if (item == null)
            throw new InvalidOperationException("פריט לא נמצא");

        // Check for name duplicates (excluding self)
        if (request.Name != item.Name && 
            await _context.Items.AnyAsync(i => i.Name == request.Name))
            throw new InvalidOperationException("פריט בשם זה כבר קיים");

        // Check for code duplicates (excluding self)
        if (!string.IsNullOrEmpty(request.Code) && request.Code != item.Code &&
            await _context.Items.AnyAsync(i => i.Code == request.Code))
            throw new InvalidOperationException("פריט עם קוד זה כבר קיים");

        item.Name = request.Name;
        if (!string.IsNullOrEmpty(request.Code))
            item.Code = request.Code;
        if (request.QuantityInStock.HasValue)
            item.QuantityInStock = request.QuantityInStock.Value;
        if (request.IsActive.HasValue)
            item.IsActive = request.IsActive.Value;
        item.UpdatedAt = DateTime.UtcNow;

        _context.Items.Update(item);
        await _context.SaveChangesAsync();

        var mapping = await _context.ItemSapMappings.FirstOrDefaultAsync(m => m.ItemId == id);
        return ToDto(item, mapping);
    }

    public async Task<bool> DeleteItemAsync(int id)
    {
        var item = await _context.Items.FindAsync(id);
        if (item == null)
            return false;

        // Check if item has any receipt items
        if (await _context.ReceiptItems.AnyAsync(ri => ri.ItemId == id))
            throw new InvalidOperationException("לא ניתן למחוק פריט שכבר חולק");

        _context.Items.Remove(item);
        await _context.SaveChangesAsync();
        return true;
    }

    private static ItemDto ToDto(Item item, ItemSapMapping? mapping)
    {
        var mappingStatus = mapping == null
            ? "unmapped"
            : string.IsNullOrWhiteSpace(mapping.SapItemCode)
                ? "missing_code"
                : mapping.IsVerified ? "verified" : "mapped";

        return new ItemDto
        {
            Id = item.Id,
            Name = item.Name,
            Code = item.Code,
            QuantityInStock = item.QuantityInStock,
            IsActive = item.IsActive,
            SapItemCode = mapping?.SapItemCode,
            SapItemName = mapping?.SapItemName,
            SapMappingVerified = mapping?.IsVerified ?? false,
            SapMappingStatus = mappingStatus,
            CreatedAt = item.CreatedAt,
            UpdatedAt = item.UpdatedAt
        };
    }
}
