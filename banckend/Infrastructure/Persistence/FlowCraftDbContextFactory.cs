using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace FlowCraft.Infrastructure.Persistence;

public sealed class FlowCraftDbContextFactory : IDesignTimeDbContextFactory<FlowCraftDbContext>
{
    public FlowCraftDbContext CreateDbContext(string[] args)
    {
        var configuration = BuildConfiguration();
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? configuration["ConnectionStrings:DefaultConnection"];

        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException(
                "Connection string 'DefaultConnection' was not found for design-time EF operations.");

        var optionsBuilder = new DbContextOptionsBuilder<FlowCraftDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new FlowCraftDbContext(optionsBuilder.Options);
    }

    private static IConfigurationRoot BuildConfiguration()
    {
        var basePath = ResolveBackendConfigDirectory();

        return new ConfigurationBuilder()
            .SetBasePath(basePath)
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();
    }

    private static string ResolveBackendConfigDirectory()
    {
        var candidates = new[]
        {
            Path.Combine(Directory.GetCurrentDirectory(), "banckend"),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "banckend"),
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "banckend"),
        };

        foreach (var candidate in candidates)
        {
            var fullPath = Path.GetFullPath(candidate);
            if (File.Exists(Path.Combine(fullPath, "appsettings.json")))
                return fullPath;
        }

        throw new DirectoryNotFoundException(
            "Could not locate the backend configuration directory containing appsettings.json.");
    }
}
