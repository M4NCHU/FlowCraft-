using System.ComponentModel.DataAnnotations;
using FlowCraft.Domain.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace FlowCraft.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
// [Authorize(Roles = Roles.Admin)]
public sealed class RolesController : ControllerBase
{
    private readonly RoleManager<IdentityRole<Guid>> _roleManager;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ILogger<RolesController> _logger;

    public RolesController(
        RoleManager<IdentityRole<Guid>> roleManager,
        UserManager<ApplicationUser> userManager,
        ILogger<RolesController> logger)
    {
        _roleManager = roleManager;
        _userManager = userManager;
        _logger = logger;
    }

    public sealed record CreateRoleRequest([Required] string Name);
    public sealed record AssignRoleRequest(
        [Required] Guid UserId,
        [Required] string RoleName);

    [HttpGet]
    public IActionResult GetAllRoles()
    {
        var roles = _roleManager.Roles
            .Select(r => new { r.Id, r.Name })
            .ToList();

        return Ok(roles);
    }

    [HttpPost]
    public async Task<IActionResult> CreateRole([FromBody] CreateRoleRequest request)
    {
        var roleName = request.Name.Trim();

        _logger.LogInformation($"CreateRole called. name={roleName}");

        if (await _roleManager.RoleExistsAsync(roleName))
        {
            return BadRequest(new { message = "Role already exists" });
        }

        var result = await _roleManager.CreateAsync(new IdentityRole<Guid>(roleName));
        if (!result.Succeeded)
        {
            _logger.LogWarning($"CreateRole failed. name={roleName}, errors={string.Join(",", result.Errors.Select(e => e.Description))}");
            return BadRequest(new { message = "Failed to create role", errors = result.Errors });
        }

        _logger.LogInformation($"Role created. name={roleName}");
        return Ok(new { message = "Role created", name = roleName });
    }

    [HttpPost("assign")]
    public async Task<IActionResult> AssignRole([FromBody] AssignRoleRequest request)
    {
        _logger.LogInformation($"AssignRole called. userId={request.UserId}, roleName={request.RoleName}");

        var user = await _userManager.FindByIdAsync(request.UserId.ToString());
        if (user is null)
        {
            return NotFound(new { message = "User not found" });
        }

        if (!await _roleManager.RoleExistsAsync(request.RoleName))
        {
            return NotFound(new { message = "Role not found" });
        }

        if (await _userManager.IsInRoleAsync(user, request.RoleName))
        {
            return BadRequest(new { message = "User already has this role" });
        }

        var result = await _userManager.AddToRoleAsync(user, request.RoleName);
        if (!result.Succeeded)
        {
            _logger.LogWarning($"AssignRole failed. userId={request.UserId}, role={request.RoleName}, errors={string.Join(",", result.Errors.Select(e => e.Description))}");
            return BadRequest(new { message = "Failed to assign role", errors = result.Errors });
        }

        _logger.LogInformation($"Role assigned. userId={request.UserId}, role={request.RoleName}");
        return Ok(new { message = "Role assigned" });
    }

    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetUserRoles(Guid userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return NotFound(new { message = "User not found" });
        }

        var roles = await _userManager.GetRolesAsync(user);
        return Ok(new { userId, roles });
    }
}
