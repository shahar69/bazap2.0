using Bazap.API.DTOs;
using Bazap.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Bazap.API.Controllers;

[ApiController]
[Route("api/department-inspection")]
[AllowAnonymous]
public class DepartmentInspectionController : ControllerBase
{
    private readonly IDepartmentInspectionService _service;

    public DepartmentInspectionController(IDepartmentInspectionService service)
    {
        _service = service;
    }

    [HttpGet("records")]
    public async Task<ActionResult<IReadOnlyList<InspectionRecordDto>>> GetRecords([FromQuery] InspectionRecordQuery query)
    {
        return Ok(await _service.GetRecordsAsync(query));
    }

    [HttpPost("records")]
    public async Task<ActionResult<InspectionRecordDto>> CreateRecord([FromBody] InspectionRecordRequest request)
    {
        var record = await _service.CreateRecordAsync(request);
        return CreatedAtAction(nameof(GetRecords), new { id = record.Id }, record);
    }

    [HttpGet("report")]
    public async Task<ActionResult<CommanderReportDto>> GetReport([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        return Ok(await _service.GetCommanderReportAsync(from, to));
    }

    [HttpPost("labels")]
    public async Task<IActionResult> GenerateLabels([FromBody] DisableLabelRequest request)
    {
        var bytes = await _service.GenerateLabelsAsync(request);
        return File(bytes, "text/html; charset=utf-8", $"disable-labels-{DateTime.Today:yyyy-MM-dd}.html");
    }

    [HttpGet("sap-export")]
    public async Task<IActionResult> ExportSap([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var bytes = await _service.ExportSapCsvAsync(from, to);
        return File(bytes, "text/csv; charset=utf-8", $"sap-export-{DateTime.Today:yyyy-MM-dd}.csv");
    }
}
