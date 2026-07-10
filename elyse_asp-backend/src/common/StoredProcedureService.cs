/*
 * Copyright 2025 Silkwood Software Pty. Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Threading;
using System.Linq;
using System.Security.Principal;
using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.AspNetCore.Http;


/// <summary>
/// Singleton service that loads application role passwords once on startup
/// </summary>
public class ApplicationRolePasswordProvider
{
    private readonly Dictionary<string, string> _passwords;
    private readonly ILogger<ApplicationRolePasswordProvider> _logger;

    public ApplicationRolePasswordProvider(ILogger<ApplicationRolePasswordProvider> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _passwords = LoadApplicationRoleCredentials();
    }

    public Dictionary<string, string> GetPasswords() => _passwords;

    /// <summary>
    /// Load application role credentials from environment variables (.env file)
    /// Uses credentials from environment variables like CONFIGURATOR_PASSWORD, READER_PASSWORD, etc.
    /// </summary>
    private Dictionary<string, string> LoadApplicationRoleCredentials()
    {
        var credentials = new Dictionary<string, string>();
        
        try
        {
            // Load role passwords from environment variables
            var roles = new[] { "Configurator", "Reader", "Reviewer", "Controller", "Editor", "Authoriser" };
            
            foreach (var role in roles)
            {
                var envVarName = $"{role.ToUpper()}_PASSWORD";
                var password = Environment.GetEnvironmentVariable(envVarName);
                
                if (!string.IsNullOrEmpty(password))
                {
                    credentials[role.ToUpper()] = password;
                    _logger.LogInformation($"Loaded credentials for role: {role} from {envVarName}");
                }
                else
                {
                    _logger.LogWarning($"No credentials found for role: {role} in environment variable {envVarName}");
                }
            }
            
            _logger.LogInformation($"Loaded {credentials.Count} application role credentials from environment variables");
            return credentials;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load application role credentials from environment variables");
            throw new InvalidOperationException("Failed to load application role credentials", ex);
        }
    }
}

public class ConnectionLimiter
{
    private readonly SemaphoreSlim _semaphore;

    public ConnectionLimiter(int maxConcurrentConnections)
    {
        _semaphore = new SemaphoreSlim(maxConcurrentConnections);
    }

    public async Task<T> ExecuteWithinLimitAsync<T>(Func<Task<T>> operation)
    {
        await _semaphore.WaitAsync();
        try
        {
            return await operation();
        }
        finally
        {
            _semaphore.Release();
        }
    }
}

public class CircuitBreaker
{
    private readonly TimeSpan _openTime = TimeSpan.FromSeconds(5);
    private bool _isOpen;
    private DateTime _lastFailure;

    public async Task<T> ExecuteAsync<T>(Func<Task<T>> operation)
    {
        // Circuit breaker disabled - just execute the operation
        return await operation();
    }
}

public class StoredProcedureService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<StoredProcedureService> _logger;
    private readonly Dictionary<string, StoredProcedureDefinition> _storedProcedureDefinitions;
    private readonly ConnectionLimiter _connectionLimiter;
    private readonly CircuitBreaker _circuitBreaker;
    private readonly Dictionary<string, string> _applicationRolePasswords;
    private readonly IHttpContextAccessor _httpContextAccessor;

    /// <summary>
    /// Static cache for stored procedure parameter metadata.
    /// DeriveParameters makes a round-trip to SQL Server to discover parameter names/types/directions.
    /// Since parameter metadata doesn't change at runtime, we cache it after the first call
    /// and clone from cache on subsequent calls. This eliminates ~50-100ms per API call.
    /// Cache is cleared on application restart (e.g., after stored procedure changes).
    /// </summary>
    private static readonly ConcurrentDictionary<string, SqlParameter[]> _parameterCache = new();

    public StoredProcedureService(IConfiguration configuration, ILogger<StoredProcedureService> logger, Dictionary<string, StoredProcedureDefinition> storedProcedureDefinitions, ConnectionLimiter connectionLimiter, CircuitBreaker circuitBreaker, IHttpContextAccessor httpContextAccessor, ApplicationRolePasswordProvider passwordProvider)
    {
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _storedProcedureDefinitions = storedProcedureDefinitions ?? throw new ArgumentNullException(nameof(storedProcedureDefinitions));
        _connectionLimiter = connectionLimiter ?? throw new ArgumentNullException(nameof(connectionLimiter));
        _circuitBreaker = circuitBreaker ?? throw new ArgumentNullException(nameof(circuitBreaker));
        _httpContextAccessor = httpContextAccessor ?? throw new ArgumentNullException(nameof(httpContextAccessor));
        
        // Get application role credentials from singleton provider (loaded once on startup)
        _applicationRolePasswords = passwordProvider?.GetPasswords() ?? throw new ArgumentNullException(nameof(passwordProvider));
        _logger.LogDebug("Initialized for direct database access with integrated DAL functionality and KCD support");
    }

     public async Task<StoredProcedureResult> ExecuteStoredProcedureAsync(string storedProcedureName, Dictionary<string, object> inputParameters)
    {
        return await _circuitBreaker.ExecuteAsync(async () =>
        {
            return await _connectionLimiter.ExecuteWithinLimitAsync(async () =>
            {
                return await ExecuteStoredProcedureWithRetryAsync(storedProcedureName, inputParameters);
            });
        });
    }

    private async Task<StoredProcedureResult> ExecuteStoredProcedureWithRetryAsync(string storedProcedureName, Dictionary<string, object> inputParameters)
    {
        int maxRetries = 3;
        int retryDelay = 1000; // 1 second

        for (int i = 0; i < maxRetries; i++)
        {
            try
            {
                // Direct database access with integrated DAL functionality
                return await ExecuteViaDirectDatabaseAsync(storedProcedureName, inputParameters);
            }
            catch (Exception ex) when (IsRetriableException(ex))
            {
                if (i == maxRetries - 1) throw;
                await Task.Delay(retryDelay * (i + 1));
                _logger.LogWarning(ex, $"Retry {i + 1}/{maxRetries} for stored procedure '{storedProcedureName}' via direct database");
            }
        }

        throw new Exception($"Max retries exceeded - database connection failed");
    }

    /// <summary>
    /// Direct database execution with integrated DAL functionality
    /// Connection pooling is hard-coded to false
    /// </summary>
    private async Task<StoredProcedureResult> ExecuteViaDirectDatabaseAsync(string storedProcedureName, Dictionary<string, object> inputParameters)
    {
        if (!_storedProcedureDefinitions.TryGetValue(storedProcedureName, out var storedProcedureDefinition))
        {
            throw new ArgumentException($"Stored procedure '{storedProcedureName}' is not registered.", nameof(storedProcedureName));
        }

        var requiredRole = storedProcedureDefinition.ApplicationRole;
        
        _logger.LogInformation($"Executing stored procedure '{storedProcedureName}' via direct database connection using {requiredRole} role");

        // Get application role password for the required role
        if (!_applicationRolePasswords.TryGetValue(requiredRole.ToUpper(), out var rolePassword))
        {
            throw new InvalidOperationException($"No application role password found for role '{requiredRole}'");
        }

        // Build connection string using Windows Authentication
        // Connection pooling is hard-coded to false
        var connectionString = BuildConnectionString();

        // Check if KCD (Kerberos Constrained Delegation) is enabled via .env configuration
        bool useKcd = bool.Parse(Environment.GetEnvironmentVariable("USE_KCD") ?? "false");
        
        if (useKcd)
        {
            // KCD enabled - impersonate the authenticated user
            var windowsIdentity = GetAuthenticatedWindowsIdentity();
            
            if (windowsIdentity == null)
            {
                // No authenticated user in HTTP context
                var httpContext = _httpContextAccessor.HttpContext;
                if (httpContext != null)
                {
                    // We're in an HTTP request but have no authenticated user - this is an error
                    throw new InvalidOperationException("USE_KCD=true but no authenticated Windows user found. Ensure Windows Authentication is enabled and user is authenticated.");
                }
                else
                {
                    // No HTTP context (startup/background task) - fall back to service account
                    _logger.LogWarning("USE_KCD=true but no HTTP context (startup/background task) - using service account credentials");
                    using var connection = new SqlConnection(connectionString);
                    await connection.OpenAsync();
                    
                    return await ExecuteStoredProcedureInternalAsync(connection, storedProcedureName, inputParameters, requiredRole, rolePassword);
                }
            }
            
            _logger.LogInformation($"KCD enabled - impersonating authenticated user: {windowsIdentity.Name}");
            
            // Impersonate the authenticated user when opening SQL connection (KCD)
            return await WindowsIdentity.RunImpersonated(windowsIdentity.AccessToken, async () =>
            {
                using var connection = new SqlConnection(connectionString);
                await connection.OpenAsync();
                
                return await ExecuteStoredProcedureInternalAsync(connection, storedProcedureName, inputParameters, requiredRole, rolePassword);
            });
        }
        else
        {
            // KCD disabled - use standard Windows Authentication with service account
            _logger.LogDebug("KCD disabled (USE_KCD=false) - using service account credentials");
            
            using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync();
            
            return await ExecuteStoredProcedureInternalAsync(connection, storedProcedureName, inputParameters, requiredRole, rolePassword);
        }
    }

    /// <summary>
    /// Internal method to execute stored procedure with an open connection
    /// Extracted to avoid code duplication between impersonated and non-impersonated paths
    /// </summary>
    private async Task<StoredProcedureResult> ExecuteStoredProcedureInternalAsync(
        SqlConnection connection,
        string storedProcedureName,
        Dictionary<string, object> inputParameters,
        string requiredRole,
        string rolePassword)
    {

        try
        {
            // Set application role (no cookie needed since pooling is disabled)
            await SetApplicationRoleAsync(connection, requiredRole, rolePassword);
            _logger.LogDebug($"Application role {requiredRole} set successfully");

            // Execute stored procedure
            using var command = new SqlCommand(storedProcedureName, connection);
            command.CommandType = CommandType.StoredProcedure;
            command.CommandTimeout = 120;

            // Auto-discover parameters using cache (avoids SQL Server round-trip on subsequent calls)
            ApplyCachedParameters(command, storedProcedureName, connection);

            // Set input parameter values
            foreach (var parameter in inputParameters)
            {
                if (command.Parameters.Contains(parameter.Key))
                {
                    command.Parameters[parameter.Key].Value = parameter.Value ?? DBNull.Value;
                }
            }

            // Execute and collect results
            var reader = await command.ExecuteReaderAsync();
            var resultSets = new List<List<Dictionary<string, object>>>();
            var schemaInfo = new List<List<string>>();

            do
            {
                var columnNames = new List<string>();
                for (int i = 0; i < reader.FieldCount; i++)
                {
                    columnNames.Add(reader.GetName(i));
                }
                schemaInfo.Add(columnNames);

                var resultSet = new List<Dictionary<string, object>>();
                while (await reader.ReadAsync())
                {
                    var row = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        row[reader.GetName(i)] = reader.GetValue(i);
                    }
                    resultSet.Add(row);
                }
                resultSets.Add(resultSet);
            } while (await reader.NextResultAsync());

            reader.Close();

            // Extract output parameters
            var outputParameters = new Dictionary<string, object>();
            foreach (SqlParameter param in command.Parameters)
            {
                if (param.Direction == ParameterDirection.Output || param.Direction == ParameterDirection.InputOutput)
                {
                    outputParameters[param.ParameterName] = param.Value == DBNull.Value ? null : param.Value!;
                }
            }

            // Note: Application role is automatically cleared when connection closes
            // since Pooling=false (hard-coded), no explicit cleanup needed
            
            return new StoredProcedureResult
            {
                ResultSets = resultSets,
                OutputParameters = outputParameters,
                SchemaInfo = schemaInfo
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error executing stored procedure '{storedProcedureName}' via direct database connection");
            throw;
        }
    }

    /// <summary>
    /// Build connection string using Windows Authentication from environment variables
    /// Connection pooling is HARD-CODED to false as per requirements
    /// </summary>
    private string BuildConnectionString()
    {
        var host = Environment.GetEnvironmentVariable("DB_HOST") ?? throw new InvalidOperationException("DB_HOST not configured in .env file");
        var port = Environment.GetEnvironmentVariable("DB_PORT") ?? "1433";
        var database = Environment.GetEnvironmentVariable("DB_NAME") ?? throw new InvalidOperationException("DB_NAME not configured in .env file");
        var encrypt = bool.Parse(Environment.GetEnvironmentVariable("DB_ENCRYPT") ?? "true");
        var trustCert = bool.Parse(Environment.GetEnvironmentVariable("DB_TRUST_SERVER_CERTIFICATE") ?? "true");

        // IMPORTANT: Connection pooling is HARD-CODED to false
        var connectionString = $"Server={host},{port};Database={database};Integrated Security=true;Encrypt={encrypt};TrustServerCertificate={trustCert};Pooling=false;Connection Timeout=15";
        
        _logger.LogDebug($"Built connection string for {host}\\{database} with Pooling=false (hard-coded)");
        return connectionString;
    }

    /// <summary>
    /// Set SQL Server application role
    /// No cookie/cleanup needed since Pooling=false (hard-coded)
    /// Application role context is automatically cleared when connection closes
    /// </summary>
    private async Task SetApplicationRoleAsync(SqlConnection connection, string roleName, string rolePassword)
    {
        try
        {
            using var command = new SqlCommand("sp_setapprole", connection);
            command.CommandType = CommandType.StoredProcedure;
            command.Parameters.AddWithValue("@rolename", roleName.ToLower());
            command.Parameters.AddWithValue("@password", rolePassword);
            
            await command.ExecuteNonQueryAsync();
            _logger.LogDebug($"Successfully set application role: {roleName}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to set application role: {roleName}");
            throw;
        }
    }

    private bool IsRetriableException(Exception ex)
    {
        // Retry on communication errors, timeout errors, or transient SQL errors
        // But NOT on security/authentication errors - those should fail immediately
        return ex is TimeoutException ||
               ex is System.IO.IOException ||
               ex is System.Net.Sockets.SocketException ||
               (ex is SqlException sqlEx && IsTransientError(sqlEx)) ||
               ex.Message.Contains("pipe", StringComparison.OrdinalIgnoreCase) || // Named pipe communication errors
               ex.Message.Contains("timeout", StringComparison.OrdinalIgnoreCase);
    }

    private SqlDbType GetSqlDbTypeFromType(Type type)
    {
        if (type == typeof(int))
            return SqlDbType.Int;
        if (type == typeof(string))
            return SqlDbType.NVarChar;
        if (type == typeof(long))
            return SqlDbType.BigInt;
        if (type == typeof(DateTime))
            return SqlDbType.DateTime;
        if (type == typeof(byte[]))
            return SqlDbType.VarBinary;
        throw new ArgumentException($"Unsupported type: {type.Name}");
    }
    
    private int GetSqlParameterSize(Type type)
    {
        if (type == typeof(string))
            return -1; // Use -1 for max size of NVarChar
        if (type == typeof(byte[]))
            return -1; // Use -1 for max size of VarBinary
        return 0; // Use 0 for default size of other types
    }

    private bool IsTransientError(SqlException ex)
    {
        int[] transientErrorNumbers = { 4060, 40197, 40501, 40613, 49918, 49919, 49920 };
        return transientErrorNumbers.Contains(ex.Number);
    }


    /// <summary>
    /// Get the authenticated Windows identity from the current HTTP request
    /// Required for Kerberos Constrained Delegation (KCD)
    /// </summary>
    private WindowsIdentity? GetAuthenticatedWindowsIdentity()
    {
        try
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext?.User?.Identity is WindowsIdentity windowsIdentity && windowsIdentity.IsAuthenticated)
            {
                _logger.LogDebug($"Found authenticated Windows user: {windowsIdentity.Name}");
                return windowsIdentity;
            }
            
            _logger.LogWarning("No authenticated Windows identity found in HTTP context");
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving Windows identity from HTTP context");
            return null;
        }
    }

    /// <summary>
    /// Apply cached stored procedure parameters to a command.
    /// On first call for a given stored procedure, discovers parameters via DeriveParameters
    /// and caches the metadata. On subsequent calls, clones parameters from cache.
    /// This eliminates a SQL Server round-trip (~50-100ms) per API call.
    /// </summary>
    private void ApplyCachedParameters(SqlCommand command, string storedProcedureName, SqlConnection connection)
    {
        if (_parameterCache.TryGetValue(storedProcedureName, out var cachedParams))
        {
            // Cache hit - clone parameters from cache
            foreach (var cachedParam in cachedParams)
            {
                var clonedParam = new SqlParameter
                {
                    ParameterName = cachedParam.ParameterName,
                    SqlDbType = cachedParam.SqlDbType,
                    Size = cachedParam.Size,
                    Direction = cachedParam.Direction,
                    Precision = cachedParam.Precision,
                    Scale = cachedParam.Scale,
                    IsNullable = cachedParam.IsNullable
                };
                command.Parameters.Add(clonedParam);
            }
            _logger.LogDebug($"Used cached parameters for stored procedure '{storedProcedureName}' ({cachedParams.Length} params)");
        }
        else
        {
            // Cache miss - discover parameters from SQL Server and cache them
            SqlCommandBuilder.DeriveParameters(command);
            
            // Cache a snapshot of the discovered parameters
            var paramsToCache = new SqlParameter[command.Parameters.Count];
            for (int i = 0; i < command.Parameters.Count; i++)
            {
                var p = command.Parameters[i];
                paramsToCache[i] = new SqlParameter
                {
                    ParameterName = p.ParameterName,
                    SqlDbType = p.SqlDbType,
                    Size = p.Size,
                    Direction = p.Direction,
                    Precision = p.Precision,
                    Scale = p.Scale,
                    IsNullable = p.IsNullable
                };
            }
            _parameterCache.TryAdd(storedProcedureName, paramsToCache);
            _logger.LogInformation($"Cached parameters for stored procedure '{storedProcedureName}' ({paramsToCache.Length} params)");
        }
    }

}

/// <summary>
/// Result model for stored procedure execution
/// </summary>
public class StoredProcedureResult
{
    public List<List<Dictionary<string, object>>> ResultSets { get; set; } = new List<List<Dictionary<string, object>>>();
    public Dictionary<string, object> OutputParameters { get; set; } = new Dictionary<string, object>();
    public List<List<string>> SchemaInfo { get; set; } = new List<List<string>>();
}
