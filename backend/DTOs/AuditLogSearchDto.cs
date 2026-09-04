namespace Club_Abacus_System.DTOs;

public class AuditLogSearchDto
{
    public string? TargetType { get; set; }
    public Guid? TargetId { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
}