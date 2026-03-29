using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace FlowCraft.Api.Auth;

public sealed class TokenService
{
    private const string TenantIdClaimType = "tenant_id";

    private readonly TokenOptions _options;
    private readonly ILogger<TokenService> _logger;

    public TokenService(TokenOptions options, ILogger<TokenService> logger)
    {
        _options = options;
        _logger = logger;
    }

    public string GenerateToken(
        string userId,
        string userName,
        IEnumerable<string> roles,
        int expiresMinutes)
        => GenerateToken(userId, userName, roles, tenantId: null, expiresMinutes);

    public string GenerateToken(
        string userId,
        string userName,
        IEnumerable<string> roles,
        Guid? tenantId,
        int expiresMinutes)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("userId is required.", nameof(userId));

        if (string.IsNullOrWhiteSpace(userName))
            throw new ArgumentException("userName is required.", nameof(userName));

        if (expiresMinutes <= 0)
            throw new ArgumentOutOfRangeException(nameof(expiresMinutes), "expiresMinutes must be > 0.");

        var rolesList = roles?
            .Where(r => !string.IsNullOrWhiteSpace(r))
            .Select(r => r.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList()
            ?? new List<string>();

        _logger.LogInformation(
            "Generating JWT token for userId={UserId}, userName={UserName}, roles=[{Roles}], tenantId={TenantId}, expiresInMinutes={ExpiresMinutes}",
            userId,
            userName,
            string.Join(",", rolesList),
            tenantId?.ToString() ?? "",
            expiresMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId),
            new(JwtRegisteredClaimNames.UniqueName, userName),
        };

        foreach (var role in rolesList)
            claims.Add(new Claim(ClaimTypes.Role, role));

        if (tenantId is Guid tid)
            claims.Add(new Claim(TenantIdClaimType, tid.ToString()));

        var creds = new SigningCredentials(_options.SigningKey, SecurityAlgorithms.HmacSha256);

        var now = DateTime.UtcNow;
        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: now,
            expires: now.AddMinutes(expiresMinutes),
            signingCredentials: creds);

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

        _logger.LogInformation(
            "JWT token generated for userId={UserId}, validFrom={ValidFrom}, validTo={ValidTo}",
            userId,
            now.ToString("O"),
            token.ValidTo.ToString("O"));

        return tokenString;
    }
}
