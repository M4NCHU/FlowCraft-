using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FlowCraft.Api.Auth;
using FlowCraft.Domain.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace FlowCraft.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController : ControllerBase
{
    private const string TenantIdClaimType = "tenant_id";

    private readonly TokenService _tokenService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthController> _logger;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;

    public AuthController(
        TokenService tokenService,
        IConfiguration configuration,
        ILogger<AuthController> logger,
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager)
    {
        _tokenService = tokenService;
        _configuration = configuration;
        _logger = logger;
        _userManager = userManager;
        _signInManager = signInManager;
    }

    public sealed record LoginRequest(
        [Required] string UserNameOrEmail,
        [Required] string Password);

    public sealed record LoginResponse(DateTime ExpiresAtUtc);

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var identifier = (request.UserNameOrEmail ?? string.Empty).Trim();

        _logger.LogInformation(
            "Login attempt. identifier={Identifier}, remoteIp={RemoteIp}",
            identifier,
            HttpContext.Connection.RemoteIpAddress);

        if (string.IsNullOrWhiteSpace(identifier) || string.IsNullOrWhiteSpace(request.Password))
            return Unauthorized(new { message = "Invalid credentials" });

        var user = await _userManager.FindByNameAsync(identifier)
                   ?? await _userManager.FindByEmailAsync(identifier);

        if (user is null || !user.IsActive)
        {
            _logger.LogWarning("Login failed. User not found or inactive. identifier={Identifier}", identifier);
            return Unauthorized(new { message = "Invalid credentials" });
        }

        var signInResult = await _signInManager.CheckPasswordSignInAsync(
            user,
            request.Password,
            lockoutOnFailure: true);

        if (!signInResult.Succeeded)
        {
            _logger.LogWarning("Login failed. Invalid password. identifier={Identifier}", identifier);
            return Unauthorized(new { message = "Invalid credentials" });
        }

        var expiresMinutes = _configuration.GetValue<int?>("Jwt:ExpiresMinutes") ?? 60;
        if (expiresMinutes <= 0) expiresMinutes = 60;

        var expiresAt = DateTime.UtcNow.AddMinutes(expiresMinutes);
        var roles = await _userManager.GetRolesAsync(user);

        Guid? tenantId = user.TenantId;

        if (tenantId is null && !roles.Contains(Roles.Admin))
        {
            _logger.LogWarning(
                "Login failed. User has no tenant assigned. userId={UserId}, identifier={Identifier}",
                user.Id,
                identifier);

            return Forbid();
        }

        var token = _tokenService.GenerateToken(
            userId: user.Id.ToString(),
            userName: user.UserName ?? string.Empty,
            roles: roles,
            tenantId: tenantId,
            expiresMinutes: expiresMinutes);

        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Expires = expiresAt,
            Path = "/"
        };

        Response.Cookies.Append("fc_access_token", token, cookieOptions);

        _logger.LogInformation(
            "Login succeeded. identifier={Identifier}, userId={UserId}, tenantId={TenantId}, roles=[{Roles}], expiresAtUtc={ExpiresAt}",
            identifier,
            user.Id,
            tenantId?.ToString() ?? "",
            string.Join(",", roles),
            expiresAt.ToString("O"));

        return Ok(new LoginResponse(expiresAt));
    }

    [Authorize]
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("fc_access_token", new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Path = "/"
        });

        _logger.LogInformation("User logged out and JWT cookie cleared.");

        return Ok();
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult Me()
    {
        var userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue("sub") ?? "unknown";
        var name = User.FindFirstValue(JwtRegisteredClaimNames.UniqueName)
                   ?? User.Identity?.Name
                   ?? "unknown";

        var tenantId = User.FindFirstValue(TenantIdClaimType);

        _logger.LogInformation(
            "Authenticated user info requested. userId={UserId}, name={Name}, tenantId={TenantId}",
            userId,
            name,
            tenantId ?? "");

        var claims = User.Claims.Select(c => new { c.Type, c.Value }).ToList();

        return Ok(new
        {
            userId,
            name,
            tenantId,
            claims
        });
    }
    
    // [Authorize(Roles = Roles.Admin)]
    [HttpPost("register")]
    public async Task<ActionResult<RegisterResponse>> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        var userName = (request.UserName ?? string.Empty).Trim();
        var email = (request.Email ?? string.Empty).Trim();
        var role = string.IsNullOrWhiteSpace(request.Role) ? Roles.User : request.Role.Trim();

        _logger.LogInformation(
            "Register attempt. userName={UserName}, email={Email}, tenantId={TenantId}, role={Role}, remoteIp={RemoteIp}",
            userName,
            email,
            request.TenantId?.ToString() ?? "",
            role,
            HttpContext.Connection.RemoteIpAddress);

        if (string.IsNullOrWhiteSpace(userName) || string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Invalid payload" });

        var existingByName = await _userManager.FindByNameAsync(userName);
        if (existingByName is not null)
            return Conflict(new { message = "Username already taken" });

        var existingByEmail = await _userManager.FindByEmailAsync(email);
        if (existingByEmail is not null)
            return Conflict(new { message = "Email already taken" });

        if (role != Roles.User && role != Roles.Admin)
            return BadRequest(new { message = "Invalid role" });

        if (role != Roles.Admin && request.TenantId is null)
            return BadRequest(new { message = "TenantId is required for non-admin users" });

        var now = DateTime.UtcNow;

        var user = new ApplicationUser
        {
            UserName = userName,
            Email = email,
            TenantId = request.TenantId,
            IsActive = true
        };

        var createRes = await _userManager.CreateAsync(user, request.Password);
        if (!createRes.Succeeded)
        {
            _logger.LogWarning(
                "Register failed. userName={UserName}, email={Email}, errors=[{Errors}]",
                userName,
                email,
                string.Join(" | ", createRes.Errors.Select(e => $"{e.Code}:{e.Description}")));

            return BadRequest(new
            {
                message = "User creation failed",
                errors = createRes.Errors.Select(e => new { e.Code, e.Description })
            });
        }

        var roleRes = await _userManager.AddToRoleAsync(user, role);
        if (!roleRes.Succeeded)
        {
            _logger.LogWarning(
                "Register failed on role assign. userId={UserId}, role={Role}, errors=[{Errors}]",
                user.Id,
                role,
                string.Join(" | ", roleRes.Errors.Select(e => $"{e.Code}:{e.Description}")));

            await _userManager.DeleteAsync(user);

            return BadRequest(new
            {
                message = "Role assignment failed",
                errors = roleRes.Errors.Select(e => new { e.Code, e.Description })
            });
        }

        DateTime? expiresAt = null;

        if (request.SignIn)
        {
            var expiresMinutes = _configuration.GetValue<int?>("Jwt:ExpiresMinutes") ?? 60;
            if (expiresMinutes <= 0) expiresMinutes = 60;

            expiresAt = DateTime.UtcNow.AddMinutes(expiresMinutes);
            var roles = await _userManager.GetRolesAsync(user);

            var token = _tokenService.GenerateToken(
                userId: user.Id.ToString(),
                userName: user.UserName ?? string.Empty,
                roles: roles,
                tenantId: user.TenantId,
                expiresMinutes: expiresMinutes);

            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Expires = expiresAt.Value,
                Path = "/"
            };

            Response.Cookies.Append("fc_access_token", token, cookieOptions);
        }

        _logger.LogInformation(
            "Register succeeded. userId={UserId}, userName={UserName}, tenantId={TenantId}, role={Role}",
            user.Id,
            user.UserName ?? "",
            user.TenantId?.ToString() ?? "",
            role);

        return Ok(new RegisterResponse(
            UserId: user.Id.ToString(),
            UserName: user.UserName ?? "",
            Email: user.Email ?? "",
            TenantId: user.TenantId,
            ExpiresAtUtc: expiresAt));
    }


    [AllowAnonymous]
    [HttpOptions("login")]
    public IActionResult LoginOptions()
    {
        Response.Headers["Allow"] = "OPTIONS, POST";
        return Ok();
    }
}
