using Bazap.API.DTOs;
using Bazap.API.Models;

namespace Bazap.API.Services;

public interface IEventService
{
    Task<EventDto> CreateEventAsync(CreateEventRequest request, int userId);
    Task<EventDto> GetEventAsync(int id);
    Task<EventDto> AddItemToEventAsync(int id, AddItemToEventRequest request);
    Task RemoveItemFromEventAsync(int id, int eventItemId);
    Task CompleteEventAsync(int id);
    Task SubmitEventForInspectionAsync(int id);
    Task<List<EventDto>> ListEventsAsync(int userId, EventStatus? status);
}

public interface IInspectionService
{
    Task<InspectionActionDto> RecordDecisionAsync(InspectionDecisionRequest request, int userId);
    Task<LabelDataDto> GetLabelDataAsync(int eventItemId);
}

public interface IItemSearchService
{
    Task<List<ItemSearchResponse>> SearchItemsAsync(ItemSearchRequest request);
    Task<List<ItemGroupDto>> GetItemGroupsAsync();
    Task<List<ItemSearchResponse>> GetRecentItemsAsync(int limit);
    Task<List<ItemSearchResponse>> GetFrequentItemsAsync(int limit);
}

public interface IPrintService
{
    Task<byte[]> GenerateLabelPdfAsync(int eventItemId, int copies = 1);
    Task<byte[]> GenerateBatchLabelsPdfAsync(List<int> eventItemIds);
}
