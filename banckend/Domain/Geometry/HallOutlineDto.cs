using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.DTOs.ProductionHall
{
    public sealed record OutlinePoint(decimal X, decimal Y);

    public sealed record HallOutlineDto(
        string Name,
        string Code,
        string? Description,
        IReadOnlyList<OutlinePoint> Outline);
}
