using Bazap.API.Data;
using Bazap.API.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Bazap.API.Services;

public class ItemSearchService : IItemSearchService
{
    private readonly BazapContext _context;
    private readonly ILogger<ItemSearchService> _logger;

    public ItemSearchService(BazapContext context, ILogger<ItemSearchService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<ItemSearchResponse>> SearchItemsAsync(ItemSearchRequest request)
    {
        var query = _context.Items.AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Query))
        {
            var searchTerm = request.Query.ToLowerInvariant();
            query = query.Where(i =>
                (!string.IsNullOrEmpty(i.Code) && i.Code.ToLower().Contains(searchTerm)) ||
                (!string.IsNullOrEmpty(i.Name) && i.Name.ToLower().Contains(searchTerm))
            );
        }

        var limit = request.Limit <= 0 ? 20 : Math.Min(request.Limit, 200);

        return await query
            .Where(i => i.IsActive)
            .OrderBy(i => i.Id)
            .Take(limit)
            .Select(i => new ItemSearchResponse
            {
                Id = i.Id,
                Makat = i.Code ?? string.Empty,
                Name = i.Name ?? string.Empty,
                Description = i.Description,
                IsActive = i.IsActive,
                FrequencyScore = 0
            })
            .ToListAsync();
    }

    public async Task<List<ItemGroupDto>> GetItemGroupsAsync()
    {
        return await _context.ItemGroups
            .Select(g => new ItemGroupDto
            {
                Id = g.Id,
                Name = g.Name,
                Category = g.Category
            })
            .ToListAsync();
    }

    public async Task<List<ItemSearchResponse>> GetRecentItemsAsync(int limit)
    {
        var safeLimit = limit <= 0 ? 20 : Math.Min(limit, 200);

        return await _context.Items
            .Where(i => i.IsActive)
            .OrderByDescending(i => i.Id)
            .Take(safeLimit)
            .Select(i => new ItemSearchResponse
            {
                Id = i.Id,
                Makat = i.Code ?? string.Empty,
                Name = i.Name ?? string.Empty,
                Description = i.Description,
                IsActive = i.IsActive,
                FrequencyScore = 0
            })
            .ToListAsync();
    }

    public async Task<List<ItemSearchResponse>> GetFrequentItemsAsync(int limit)
    {
        var safeLimit = limit <= 0 ? 20 : Math.Min(limit, 200);

        return await _context.Items
            .Where(i => i.IsActive)
            .OrderByDescending(i => i.Id)
            .Take(safeLimit)
            .Select(i => new ItemSearchResponse
            {
                Id = i.Id,
                Makat = i.Code ?? string.Empty,
                Name = i.Name ?? string.Empty,
                Description = i.Description,
                IsActive = i.IsActive,
                FrequencyScore = 0
            })
            .ToListAsync();
    }
}
