using Bazap.API.Models;
using Bazap.API.DTOs;
using Bazap.API.Data;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.EntityFrameworkCore;

namespace Bazap.API.Services;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task<User?> GetUserByIdAsync(int userId);
    Task<RefreshTokenResponse> RefreshTokenAsync(string token);
}

public class AuthService : IAuthService
{
    private readonly BazapContext _context;
    private readonly IConfiguration _configuration;

    public AuthService(BazapContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = _context.Users.FirstOrDefault(u => u.Username == request.Username && u.IsActive);
        
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return new LoginResponse 
            { 
                Success = false, 
                Message = "שם משתמש או סיסמה שגויים" 
            };
        }

        var accessToken = GenerateAccessToken(user);
        var refreshToken = GenerateRefreshToken();
        
        return new LoginResponse
        {
            Success = true,
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            User = new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                Role = user.Role
            }
        };
    }

    public async Task<RefreshTokenResponse> RefreshTokenAsync(string token)
    {
        try
        {
            var principal = GetPrincipalFromExpiredToken(token);
            var userId = int.Parse(principal.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var user = _context.Users.FirstOrDefault(u => u.Id == userId);
            
            if (user == null || !user.IsActive)
            {
                return new RefreshTokenResponse 
                { 
                    Success = false, 
                    Message = "משתמש לא קיים" 
                };
            }

            var newAccessToken = GenerateAccessToken(user);
            
            return new RefreshTokenResponse
            {
                Success = true,
                AccessToken = newAccessToken
            };
        }
        catch
        {
            return new RefreshTokenResponse 
            { 
                Success = false, 
                Message = "טוקן חדש לא תקין" 
            };
        }
    }

    public async Task<User?> GetUserByIdAsync(int userId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        return user;
    }

    private string GenerateAccessToken(User user)
    {
        var jwtKey = _configuration["Jwt:Key"] ?? "super_secret_key_123456789_for_bazap_system_2026";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var token = new JwtSecurityToken(
            issuer: "bazap",
            audience: "bazap-app",
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string GenerateRefreshToken()
    {
        var randomNumber = new byte[32];
        using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomNumber);
            return Convert.ToBase64String(randomNumber);
        }
    }

    private ClaimsPrincipal GetPrincipalFromExpiredToken(string token)
    {
        var jwtKey = _configuration["Jwt:Key"] ?? "super_secret_key_123456789_for_bazap_system_2026";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

        var tokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = false,
            ValidateIssuer = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = key,
            ValidateLifetime = false
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out SecurityToken securityToken);

        if (!(securityToken is JwtSecurityToken jwtSecurityToken) ||
            !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
        {
            throw new SecurityTokenException("Invalid token");
        }

        return principal;
    }
}
