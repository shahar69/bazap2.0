using System.Collections.Generic;

namespace Bazap.API.Models;

public class ItemGroup
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Category { get; set; }
    public List<Item> Items { get; set; } = new();
}
