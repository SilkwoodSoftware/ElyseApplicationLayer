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

//Retrieves the authorised roles for the connected user using secure DAL architecture
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;

public class UserRolesService
{
    private readonly StoredProcedureService _storedProcedureService;
    private readonly ILogger<UserRolesService> _logger;

    public UserRolesService(StoredProcedureService storedProcedureService, ILogger<UserRolesService> logger)
    {
        _storedProcedureService = storedProcedureService ?? throw new ArgumentNullException(nameof(storedProcedureService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<object> GetUserRoles()
    {
        _logger.LogInformation("Retrieving user roles via secure DAL architecture");

        var parameters = new Dictionary<string, object>();

        try
        {
            // Route through StoredProcedureService -> READER DAL service with complete credential isolation
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_user_roles", parameters);
            
            _logger.LogInformation("User roles retrieval completed successfully via DAL service");

            // Extract user roles from first result set and metadata from subsequent sets
            var userRoles = new List<Dictionary<string, object?>>();
            string? transactionMessage = null;
            string? transactionStatus = null;

            if (result.ResultSets.Count > 0)
            {
                // First result set contains the user roles data
                foreach (var row in result.ResultSets[0])
                {
                    userRoles.Add(row);
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
                userRoles = userRoles,
                transactionMessage = transactionMessage ?? "Data retrieved successfully",
                transactionStatus = transactionStatus ?? "SUCCESS"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while retrieving user roles via DAL service");
            throw;
        }
    }
}
