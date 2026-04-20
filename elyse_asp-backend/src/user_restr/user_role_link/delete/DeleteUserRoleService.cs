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

using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;

public class DeleteUserRoleService
{
    private readonly StoredProcedureService _storedProcedureService;
    private readonly ILogger<DeleteUserRoleService> _logger;

    public DeleteUserRoleService(StoredProcedureService storedProcedureService, ILogger<DeleteUserRoleService> logger)
    {
        _storedProcedureService = storedProcedureService ?? throw new ArgumentNullException(nameof(storedProcedureService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<object> DeleteUserRole(long userId, string roleToDelete)
    {
        _logger.LogInformation("Deleting user role via secure DAL architecture");

        var parameters = new Dictionary<string, object>
        {
            { "@user_sid_id_to_delete", userId },
            { "@role_to_delete", roleToDelete }
        };

        try
        {
            // Route through StoredProcedureService -> AUTHORISER DAL service with complete credential isolation
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("authorising.usp_DEL_user_role", parameters);
            
            _logger.LogInformation("User role deletion completed successfully via DAL service");

            // Extract output parameters from first result set (stored procedure output pattern)
            if (result.ResultSets.Count > 0 && result.ResultSets[0].Count > 0)
            {
                var firstRow = result.ResultSets[0][0];
                return new
                {
                    transactionMessage = firstRow.ContainsKey("message") ? firstRow["message"]?.ToString()?.Trim() : null,
                    transactionStatus = firstRow.ContainsKey("transaction_status") ? firstRow["transaction_status"]?.ToString()?.Trim() : null,
                };
            }

            return new
            {
                transactionMessage = "Deletion completed",
                transactionStatus = "SUCCESS"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while deleting user role via DAL service");
            throw;
        }
    }
}
