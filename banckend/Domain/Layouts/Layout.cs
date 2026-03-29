namespace FlowCraft.Domain.Layouts;

using FlowCraft.Domain.Projects;

public class Layout
{
    public Guid Id { get; set; }

    public Guid ProjectId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public decimal HallWidthMeters { get; set; }

    public decimal HallLengthMeters { get; set; }

    public string SnapshotJson { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public Project Project { get; set; } = null!;
}
