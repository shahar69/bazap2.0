namespace Bazap.API.DTOs;

public class CreateItemRequest
{
    public required string Name { get; set; }
    public string? Code { get; set; }
    public int QuantityInStock { get; set; } = 0;
}

public class UpdateItemRequest
{
    public required string Name { get; set; }
    public string? Code { get; set; }
    public int? QuantityInStock { get; set; }
    public bool? IsActive { get; set; }
}

public class ItemDto
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Code { get; set; }
    public int QuantityInStock { get; set; }
    public bool IsActive { get; set; }
    public string? SapItemCode { get; set; }
    public string? SapItemName { get; set; }
    public bool SapMappingVerified { get; set; }
    public string SapMappingStatus { get; set; } = "unmapped";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
