using Application.DTOs.ProductionHall;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Geometry
{
    public static class GeometryUtils
    {
        public static decimal ComputePolygonArea(IReadOnlyList<OutlinePoint> points)
        {
            if (points == null || points.Count < 3)
                return 0m;

            double sum = 0;

            for (int i = 0; i < points.Count; i++)
            {
                var p1 = points[i];
                var p2 = points[(i + 1) % points.Count];

                sum += (double)p1.X * (double)p2.Y - (double)p2.X * (double)p1.Y;
            }

            var area = Math.Abs(sum) / 2.0;
            return (decimal)area;
        }
    }

}
