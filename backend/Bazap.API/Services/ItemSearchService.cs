using Bazap.API.Data;
using Bazap.API.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Bazap.API.Services;

public class ItemSearchService : IItemService
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
            var searchTerm = request.Query.ToLower();
            query = query.Where(i => 
                i.Code.ToLower().Contains(searchTerm) || 
                i.Name.ToLower().Contains(searchTerm)
            );
        }

        var items = await query
            .Where(i => i.IsActive)
            .Take(request.Limit)
            .Select(i => new ItemSearchResponse
            {
                Id = i.Id,
                Makat = i.Code,
                Name = i.Name,
                Description = i.Description,
                IsActive = i.IsActive,
                FrequencyScore = 0
            })
            .ToListAsync();

        return items;
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
        return await _context.Items
            .Where(i => i.IsActive)
            .OrderByDescending(i => i.Id)
            .Take(limit)
            .Select(i => new ItemSearchResponse
            {
                Id = i.Id,
                Makat = i.Code,
                Name = i.Name,
                Description = i.Description,
                IsActive = i.IsActive,
                FrequencyScore = 0
            })
            .ToListAsync();
    }

    public async Task<List<ItemSearchResponse>> GetFrequentItemsAsync(int limit)
    {
        return await _context.Items
            .Where(i => i.IsActive)
            .OrderByDescending(i => i.Id)
            .Take(limit)
            .Select(i => new ItemSearchResponse
            {
                Id = i.Id,
                Makat = i.Code,
                Name = i.Name,
                Description = i.Description,
                IsActive = i.IsActive,
                FrequencyScore = 0
            })
            .ToListAsync();
    }
}
