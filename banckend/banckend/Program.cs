using System.Text;
using FlowCraft.Api.Auth;
using FlowCraft.Api.Configuration;
using FlowCraft.Domain.Auth;
using FlowCraft.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    var origins = builder.Configuration
        .GetSection("Cors:FrontendOrigins")
        .Get<string[]>() ?? Array.Empty<string>();

    options.AddPolicy("Frontend", policy =>
    {
        if (origins.Length > 0)
        {
            policy
                .WithOrigins(origins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        }
        else
        {
            policy
                .AllowAnyOrigin()
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
    });
});

builder.Services.AddDbContext<FlowCraftDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
    options.UseNpgsql(connectionString);
});

builder.Services
    .AddIdentityCore<ApplicationUser>(options =>
    {
        options.User.RequireUniqueEmail = true;

        options.Password.RequiredLength = 8;
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = false;
        options.Password.RequireNonAlphanumeric = false;
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<FlowCraftDbContext>()
    .AddSignInManager();

var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection.GetValue<string>("Key")
    ?? throw new InvalidOperationException("Jwt:Key is not configured");
var jwtIssuer = jwtSection.GetValue<string>("Issuer")
    ?? throw new InvalidOperationException("Jwt:Issuer is not configured");
var jwtAudience = jwtSection.GetValue<string>("Audience")
    ?? throw new InvalidOperationException("Jwt:Audience is not configured");
var jwtExpiresMinutes = jwtSection.GetValue<int?>("ExpiresMinutes") ?? 60;

var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = signingKey,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2)
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                if (string.IsNullOrEmpty(context.Token))
                {
                    var tokenFromCookie = context.HttpContext.Request.Cookies["fc_access_token"];
                    if (!string.IsNullOrEmpty(tokenFromCookie))
                    {
                        context.Token = tokenFromCookie;
                    }
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddFlowCraftAuthorization();

builder.Services.AddSingleton(new TokenOptions(jwtIssuer, jwtAudience, signingKey, jwtExpiresMinutes));
builder.Services.AddScoped<TokenService>();

builder.Services.AddFlowCraftApplicationServices();
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

    var fromConfig = config.GetSection("Auth:DefaultRoles").Get<string[]>() ?? Array.Empty<string>();

    var roles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    foreach (var r in fromConfig)
    {
        if (!string.IsNullOrWhiteSpace(r))
            roles.Add(r.Trim());
    }

    roles.Add(Roles.Admin);
    roles.Add(Roles.Manager);
    roles.Add(Roles.Editor);
    roles.Add(Roles.Planner);
    roles.Add(Roles.Viewer);
    roles.Add(Roles.TenantAdmin);

    foreach (var roleName in roles)
    {
        if (!await roleManager.RoleExistsAsync(roleName))
        {
            var result = await roleManager.CreateAsync(new IdentityRole<Guid>(roleName));
            if (!result.Succeeded)
            {
                throw new Exception(
                    $"Failed to create role {roleName}: {string.Join(",", result.Errors.Select(e => e.Description))}");
            }
        }
    }

    var seedAdminSection = config.GetSection("SeedAdmin");
    var seedEnabled = seedAdminSection.GetValue<bool?>("Enabled") ?? true;

    if (seedEnabled && !userManager.Users.Any())
    {
        var adminUserName = seedAdminSection.GetValue<string>("UserName") ?? "admin";
        var adminEmail = seedAdminSection.GetValue<string>("Email") ?? "admin@flowcraft.local";
        var adminPassword = seedAdminSection.GetValue<string>("Password") ?? "Admin123!";

        var admin = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = adminUserName,
            Email = adminEmail,
            EmailConfirmed = true,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var result = await userManager.CreateAsync(admin, adminPassword);
        if (!result.Succeeded)
        {
            throw new Exception(
                $"Failed to create admin user: {string.Join(",", result.Errors.Select(e => e.Description))}");
        }

        var roleResult = await userManager.AddToRoleAsync(admin, Roles.Admin);
        if (!roleResult.Succeeded)
        {
            throw new Exception(
                $"Failed to assign Admin role to admin user: {string.Join(",", roleResult.Errors.Select(e => e.Description))}");
        }
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "FlowCraft API v1");
        options.RoutePrefix = "swagger";
    });
}

app.UseHttpsRedirection();
app.UseCors("Frontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

public sealed record TokenOptions(string Issuer, string Audience, SecurityKey SigningKey, int ExpiresMinutes);
