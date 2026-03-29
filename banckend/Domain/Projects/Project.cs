using FlowCraft.Domain.Layouts;

namespace FlowCraft.Domain.Projects;

public class Project
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public ICollection<Layout> Layouts { get; set; } = new List<Layout>();
}
