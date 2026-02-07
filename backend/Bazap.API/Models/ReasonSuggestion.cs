namespace Bazap.API.Models;

public class ReasonSuggestion
{
    public int Id { get; set; }
    public string ItemMakat { get; set; } = "";
    public string Reason { get; set; } = "";
    public int UsageCount { get; set; }
    public DateTime LastUsed { get; set; }
    public int? UserId { get; set; } // Null = department-wide
    public User? User { get; set; }
}
