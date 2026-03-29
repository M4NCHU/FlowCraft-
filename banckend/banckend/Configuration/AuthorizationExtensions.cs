using FlowCraft.Domain.Auth;
using Microsoft.Extensions.DependencyInjection;

namespace FlowCraft.Api.Configuration;

public static class AuthorizationExtensions
{
    public static IServiceCollection AddFlowCraftAuthorization(this IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            options.AddPolicy(Policies.CanEditLayouts, policy =>
                policy.RequireRole(Roles.Admin, Roles.Manager, Roles.Editor));

            options.AddPolicy(Policies.CanManageProjects, policy =>
                policy.RequireRole(Roles.Admin, Roles.Manager));

            options.AddPolicy(Policies.CanViewReports, policy =>
                policy.RequireRole(Roles.Admin, Roles.Manager, Roles.Editor, Roles.Viewer));
        });

        return services;
    }
}
