namespace Bazap.API.DTOs;

public class ItemSearchRequest
{
    public string Query { get; set; } = string.Empty;
    public int? GroupId { get; set; }
    public int Limit { get; set; } = 10;
}

public class ItemSearchResponse
{
    public int Id { get; set; }
    public string Makat { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public int FrequencyScore { get; set; }
}

public class ItemGroupDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Category { get; set; }
}
