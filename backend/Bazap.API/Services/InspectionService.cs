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
            .Include(ei => ei.Event)
            .FirstOrDefaultAsync(ei => ei.Id == request.EventItemId)
            ?? throw new KeyNotFoundException($"EventItem {request.EventItemId} not found");

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
        _context.EventItems.Update(eventItem);

        await _context.SaveChangesAsync();

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
            .ThenInclude(a => a.InspectionAction)
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
}
