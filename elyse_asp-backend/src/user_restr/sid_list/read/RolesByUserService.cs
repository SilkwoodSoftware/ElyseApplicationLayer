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

// Retrieves the authorised roles for a given selected user using secure DAL architecture
// This is only available for a user with Authoriser privileges.
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;
using System.Linq;

public class RolesByUserService
{
    private readonly StoredProcedureService _storedProcedureService;
    private readonly ILogger<RolesByUserService> _logger;

    public RolesByUserService(StoredProcedureService storedProcedureService, ILogger<RolesByUserService> logger)
    {
        _storedProcedureService = storedProcedureService ?? throw new ArgumentNullException(nameof(storedProcedureService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<object> GetRolesByUser(long userId)
    {
        _logger.LogInformation("Retrieving roles by user via secure DAL architecture");

        var parameters = new Dictionary<string, object>
        {
            { "@userid", userId }
        };

        try
        {
            // Route through StoredProcedureService -> AUTHORISER DAL service with complete credential isolation
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("authorising.usp_SEL_roles_by_user", parameters);
            
            _logger.LogInformation("Roles by user retrieval completed successfully via DAL service");

            // Extract roles from first result set
            var roles = new List<string>();
            string? transactionMessage = null;
            string? transactionStatus = null;

            if (result.ResultSets.Count > 0)
            {
                // First result set contains the roles data
                foreach (var row in result.ResultSets[0])
                {
                    var roleName = row.ContainsKey("Role Name") ? row["Role Name"]?.ToString() : null;
                    if (!string.IsNullOrEmpty(roleName))
                    {
                        roles.Add(roleName);
                    }
                }

                // Check for output parameters in additional result sets
                if (result.ResultSets.Count > 1 && result.ResultSets[1].Count > 0)
                {
                    var metaRow = result.ResultSets[1][0];
                    transactionMessage = metaRow.ContainsKey("message") ? metaRow["message"]?.ToString()?.Trim() : null;
                    transactionStatus = metaRow.ContainsKey("transaction_status") ? metaRow["transaction_status"]?.ToString()?.Trim() : null;
                }
            }

            return new
            {
                roles,
                transactionMessage = transactionMessage ?? "Data retrieved successfully",
                transactionStatus = transactionStatus ?? "SUCCESS"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while retrieving roles by user via DAL service");
            throw;
        }
    }
}
