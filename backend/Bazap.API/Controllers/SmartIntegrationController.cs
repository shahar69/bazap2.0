using Bazap.API.DTOs;
using Bazap.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Bazap.API.Controllers;

[ApiController]
[Route("api/smart-integration")]
[AllowAnonymous]
public class SmartIntegrationController : ControllerBase
{
    private readonly IAiImportService _aiImportService;
    private readonly ISapSyncOrchestrator _sapSyncOrchestrator;
    private readonly ISapMappingService _sapMappingService;

    public SmartIntegrationController(
        IAiImportService aiImportService,
        ISapSyncOrchestrator sapSyncOrchestrator,
        ISapMappingService sapMappingService)
    {
        _aiImportService = aiImportService;
        _sapSyncOrchestrator = sapSyncOrchestrator;
        _sapMappingService = sapMappingService;
    }

    [HttpPost("import/preview")]
    public async Task<ActionResult<SmartImportResultDto>> PreviewImport([FromBody] SmartImportRequest request)
    {
        try
        {
            var result = await _aiImportService.PreviewImportAsync(request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("import/commit")]
    public async Task<ActionResult<EventDto>> CommitImport([FromBody] SmartImportCommitRequest request)
    {
        try
        {
            var result = await _aiImportService.CommitImportAsync(request, 1);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("sap/export")]
    public async Task<IActionResult> ExportSap([FromBody] SapExportRequest request)
    {
        try
        {
            var (content, preview) = await _sapSyncOrchestrator.ExportOrdersAsync(request);
            Response.Headers["X-Bazap-Orders-Count"] = preview.OrdersCount.ToString();
            Response.Headers["X-Bazap-Rows-Count"] = preview.RowsCount.ToString();
            return File(content, "application/zip", preview.FileName);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("sap/push")]
    public async Task<ActionResult<List<SapPushResultDto>>> PushSap([FromBody] SapPushRequest request)
    {
        try
        {
            var result = await _sapSyncOrchestrator.PushOrdersAsync(request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("sap/status/{eventId}")]
    public async Task<ActionResult<EventSapStatusDto>> GetSapStatus(int eventId)
    {
        try
        {
            var result = await _sapSyncOrchestrator.GetStatusAsync(eventId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("sap/retry/{eventId}")]
    public async Task<ActionResult<SapPushResultDto>> RetrySap(int eventId)
    {
        try
        {
            var result = await _sapSyncOrchestrator.RetryAsync(eventId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("sap/mappings/items")]
    public async Task<ActionResult<List<ItemSapMappingDto>>> GetItemMappings()
    {
        var result = await _sapMappingService.GetItemMappingsAsync();
        return Ok(result);
    }

    [HttpPut("sap/mappings/items/{itemId}")]
    public async Task<ActionResult<ItemSapMappingDto>> UpdateItemMapping(int itemId, [FromBody] UpdateItemSapMappingRequest request)
    {
        try
        {
            var result = await _sapMappingService.UpdateItemMappingAsync(itemId, request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
