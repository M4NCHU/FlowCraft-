using Application.DTOs.Tenant;
using Application.Services.Interfaces;
using Domain.Instance;
using FlowCraft.Domain.Auth;
using Infrastructure.Repositories.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;

namespace Application.Services;

public class TenantService : ITenantService
{
    private readonly ITenantRepository _tenantRepository;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ILogger<TenantService> _logger;

    public TenantService(
        ITenantRepository tenantRepository,
        UserManager<ApplicationUser> userManager,
        ILogger<TenantService> logger)
    {
        _tenantRepository = tenantRepository;
        _userManager = userManager;
        _logger = logger;
    }

    public Task<IReadOnlyList<Tenant>> GetAllAsync(CancellationToken cancellationToken = default)
        => _tenantRepository.GetAllAsync(cancellationToken);

    public Task<Tenant?> GetByIdReadOnlyAsync(Guid tenantId, CancellationToken cancellationToken = default)
        => _tenantRepository.GetByIdReadOnlyAsync(tenantId, cancellationToken);

    public Task<Tenant?> GetDetailsByIdAsync(Guid tenantId, CancellationToken cancellationToken = default)
        => _tenantRepository.GetDetailsByIdAsync(tenantId, cancellationToken);

    public Task<Tenant?> GetByCodeAsync(string code, CancellationToken cancellationToken = default)
        => _tenantRepository.GetByCodeAsync(code, cancellationToken);

    public async Task<Tenant> UpdateAsync(
        Guid tenantId,
        string name,
        string? code,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tenant name is required.", nameof(name));

        var tenant = await _tenantRepository.GetByIdAsync(tenantId, cancellationToken);
        if (tenant is null)
            throw new InvalidOperationException($"Tenant {tenantId} not found.");

        var newName = name.Trim();
        var newCode = string.IsNullOrWhiteSpace(code) ? null : code.Trim();

        if (newCode is not null && !string.Equals(newCode, tenant.Code, StringComparison.Ordinal))
        {
            var exists = await _tenantRepository.CodeExistsAsync(newCode, cancellationToken);
            if (exists)
                throw new InvalidOperationException($"Tenant code '{newCode}' already exists.");
        }

        tenant.Name = newName;
        tenant.Code = newCode;
        tenant.UpdatedAtUtc = DateTime.UtcNow;

        await _tenantRepository.SaveChangesAsync(cancellationToken);

        return tenant;
    }

    public async Task<Tenant> CreateAsync(
        string name,
        string? code,
        TenantCreateOptions adminOptions,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tenant name is required.", nameof(name));

        if (adminOptions is null)
            throw new ArgumentNullException(nameof(adminOptions));

        var tenantName = name.Trim();
        var tenantCode = string.IsNullOrWhiteSpace(code) ? null : code.Trim();

        var adminUserName = adminOptions.UserName?.Trim();
        var adminEmail = adminOptions.Email?.Trim();

        if (string.IsNullOrWhiteSpace(adminUserName))
            throw new ArgumentException("Admin username is required.", nameof(adminOptions.UserName));

        if (string.IsNullOrWhiteSpace(adminEmail))
            throw new ArgumentException("Admin email is required.", nameof(adminOptions.Email));

        if (string.IsNullOrWhiteSpace(adminOptions.Password))
            throw new ArgumentException("Admin password is required.", nameof(adminOptions.Password));

        if (tenantCode is not null)
        {
            var codeExists = await _tenantRepository.CodeExistsAsync(tenantCode, cancellationToken);
            if (codeExists)
                throw new InvalidOperationException($"Tenant code '{tenantCode}' already exists.");
        }

        var existingByEmail = await _userManager.FindByEmailAsync(adminEmail);
        if (existingByEmail is not null)
            throw new InvalidOperationException($"User with email '{adminEmail}' already exists.");

        var existingByName = await _userManager.FindByNameAsync(adminUserName);
        if (existingByName is not null)
            throw new InvalidOperationException($"User with username '{adminUserName}' already exists.");

        var now = DateTime.UtcNow;

        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Name = tenantName,
            Code = tenantCode,
            IsActive = true,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        ApplicationUser? adminUser = null;

        try
        {
            await _tenantRepository.AddAsync(tenant, cancellationToken);
            await _tenantRepository.SaveChangesAsync(cancellationToken);

            adminUser = new ApplicationUser
            {
                Id = Guid.NewGuid(),
                UserName = adminUserName,
                Email = adminEmail,
                EmailConfirmed = true,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
                TenantId = tenant.Id
            };

            var createResult = await _userManager.CreateAsync(adminUser, adminOptions.Password);
            if (!createResult.Succeeded)
                throw new InvalidOperationException("Failed to create tenant admin user. " + IdentityErrors(createResult));

            var roleResult = await _userManager.AddToRoleAsync(adminUser, Roles.TenantAdmin);
            if (!roleResult.Succeeded)
                throw new InvalidOperationException("Failed to assign tenant admin role. " + IdentityErrors(roleResult));

            _logger.LogInformation(
                "Tenant {TenantId} created with admin user {UserId}",
                tenant.Id,
                adminUser.Id);

            return tenant;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Tenant creation failed. tenantId={TenantId}, adminEmail={AdminEmail}, adminUserName={AdminUserName}",
                tenant.Id,
                adminEmail,
                adminUserName);

            if (adminUser is not null)
            {
                try
                {
                    await _userManager.DeleteAsync(adminUser);
                }
                catch (Exception delUserEx)
                {
                    _logger.LogError(delUserEx, "Rollback: failed to delete admin user {UserId}", adminUser.Id);
                }
            }

            try
            {
                _tenantRepository.Remove(tenant);
                await _tenantRepository.SaveChangesAsync(cancellationToken);
            }
            catch (Exception delTenantEx)
            {
                _logger.LogError(delTenantEx, "Rollback: failed to delete tenant {TenantId}", tenant.Id);
            }

            throw;
        }

        static string IdentityErrors(IdentityResult result)
            => string.Join("; ", result.Errors.Select(e => $"{e.Code}: {e.Description}"));
    }
}
