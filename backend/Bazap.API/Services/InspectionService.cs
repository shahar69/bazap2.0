using Bazap.API.Data;
using Bazap.API.DTOs;
using Bazap.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Bazap.API.Services;

public class InspectionService : IInspectionService
{
    private readonly BazapContext _context;
    private readonly ILogger<InspectionService> _logger;

    public InspectionService(BazapContext context, ILogger<InspectionService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<InspectionActionDto> RecordDecisionAsync(InspectionDecisionRequest request, int userId)
    {
        var eventItem = await _context.EventItems
            .Include(ei => ei.Event!)
            .ThenInclude(e => e.Items)
            .FirstOrDefaultAsync(ei => ei.Id == request.EventItemId)
            ?? throw new KeyNotFoundException($"EventItem {request.EventItemId} not found");

        if (request.Decision == InspectionDecision.Disabled && request.DisableReason == null)
            throw new InvalidOperationException("יש לבחור סיבת השבתה");

        var action = new InspectionAction
        {
            EventItemId = request.EventItemId,
            Decision = request.Decision,
            DisableReason = request.DisableReason,
            Notes = request.Notes,
            InspectedByUserId = userId,
            InspectedAt = DateTime.UtcNow
        };

        _context.InspectionActions.Add(action);

        eventItem.InspectionStatus = request.Decision == InspectionDecision.Pass ? ItemInspectionStatus.Pass : ItemInspectionStatus.Fail;

        var evt = eventItem.Event ?? throw new InvalidOperationException("אירוע לא קיים עבור הפריט");

        if (evt.Status == EventStatus.Pending)
        {
            // Mark the event as in-progress on the first decision
            evt.Status = EventStatus.InProgress;
            _context.Events.Update(evt);
        }

        _context.EventItems.Update(eventItem);

        await _context.SaveChangesAsync();

        // Learn from this reason for future suggestions
        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            await LearnReasonAsync(eventItem.ItemMakat, request.Notes, userId);
        }

        if (evt != null)
        {
            // Reload items to ensure latest statuses for completion calculation
            await _context.Entry(evt).Collection(e => e.Items).LoadAsync();
            if (evt.Items.All(i => i.InspectionStatus != ItemInspectionStatus.Pending))
            {
                evt.Status = EventStatus.Completed;
                _context.Events.Update(evt);
                await _context.SaveChangesAsync();
            }
        }

        _logger.LogInformation("Inspection decision recorded for EventItem {EventItemId}: {Decision}", request.EventItemId, request.Decision);

        var user = await _context.Users.FindAsync(userId);

        return new InspectionActionDto
        {
            Id = action.Id,
            EventItemId = action.EventItemId,
            Decision = action.Decision,
            DisableReason = action.DisableReason,
            Notes = action.Notes,
            InspectedByUser = user?.Username ?? "Unknown",
            InspectedAt = action.InspectedAt
        };
    }

    public async Task<LabelDataDto> GetLabelDataAsync(int eventItemId)
    {
        var eventItem = await _context.EventItems
            .Include(ei => ei.Event)
            .Include(ei => ei.InspectionActions)
            .FirstOrDefaultAsync(ei => ei.Id == eventItemId)
            ?? throw new KeyNotFoundException($"EventItem {eventItemId} not found");

        var lastAction = eventItem.InspectionActions.OrderByDescending(a => a.InspectedAt).FirstOrDefault()
            ?? throw new InvalidOperationException("No inspection action found");

        var inspector = await _context.Users.FindAsync(lastAction.InspectedByUserId);

        return new LabelDataDto
        {
            EventItemId = eventItemId,
            Makat = eventItem.ItemMakat,
            ItemName = eventItem.ItemName,
            DisableReason = lastAction.DisableReason ?? DisableReason.Other,
            ActionDate = lastAction.InspectedAt,
            InspectorName = inspector?.Username ?? "Unknown",
            EventNumber = eventItem.Event?.Number ?? "Unknown"
        };
    }

    private async Task LearnReasonAsync(string makat, string reason, int userId)
    {
        reason = reason.Trim();
        if (string.IsNullOrWhiteSpace(reason)) return;

        var existing = await _context.ReasonSuggestions
            .FirstOrDefaultAsync(r =>
                r.ItemMakat == makat &&
                r.Reason.ToLower() == reason.ToLower() &&
                r.UserId == userId
            );

        if (existing != null)
        {
            existing.UsageCount++;
            existing.LastUsed = DateTime.UtcNow;
        }
        else
        {
            _context.ReasonSuggestions.Add(new ReasonSuggestion
            {
                ItemMakat = makat,
                Reason = reason,
                UsageCount = 1,
                LastUsed = DateTime.UtcNow,
                UserId = userId
            });
        }

        await _context.SaveChangesAsync();
    }

    public async Task<List<string>> GetReasonSuggestionsAsync(string makat, int userId)
    {
        // Personal suggestions (higher priority)
        var personal = await _context.ReasonSuggestions
            .Where(r => r.ItemMakat == makat && r.UserId == userId)
            .OrderByDescending(r => r.LastUsed)
            .Take(3)
            .Select(r => r.Reason)
            .ToListAsync();

        // Recently used by this user (last 7 days, any item)
        var recent = await _context.InspectionActions
            .Where(a =>
                a.InspectedByUserId == userId &&
                a.Notes != null &&
                a.InspectedAt > DateTime.UtcNow.AddDays(-7)
            )
            .OrderByDescending(a => a.InspectedAt)
            .Select(a => a.Notes!)
            .Distinct()
            .Take(5)
            .ToListAsync();

        // Department-wide common reasons for this item type
        var departmentWide = await _context.ReasonSuggestions
            .Where(r => r.ItemMakat == makat && r.UserId != userId)
            .GroupBy(r => r.Reason)
            .OrderByDescending(g => g.Sum(r => r.UsageCount))
            .Take(3)
            .Select(g => g.Key)
            .ToListAsync();

        return personal
            .Concat(recent)
            .Concat(departmentWide)
            .Distinct()
            .Take(8)
            .ToList();
    }
}
