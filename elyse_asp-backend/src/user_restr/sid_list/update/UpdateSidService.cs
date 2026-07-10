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

// Updates user details using secure DAL architecture
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;

public class UpdateSidService
{
    private readonly StoredProcedureService _storedProcedureService;
    private readonly ILogger<UpdateSidService> _logger;

    public UpdateSidService(StoredProcedureService storedProcedureService, ILogger<UpdateSidService> logger)
    {
        _storedProcedureService = storedProcedureService ?? throw new ArgumentNullException(nameof(storedProcedureService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<object> UpdateSid(long userId, string? sidName, string? userDescription, string? sidIsGroup)
    {
        _logger.LogInformation("Updating SID via secure DAL architecture");

        var parameters = new Dictionary<string, object>
        {
            { "@sidrecordid", userId },
            { "@sid_name", sidName ?? (object)DBNull.Value },
            { "@sid_description", userDescription ?? (object)DBNull.Value },
            { "@sid_isgroup", sidIsGroup ?? (object)DBNull.Value }
        };

        try
        {
            // Route through StoredProcedureService -> DAL service with complete credential isolation
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_UPD_sid", parameters);
            
            _logger.LogInformation("SID update completed successfully via DAL service");

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
                transactionMessage = "Update completed",
                transactionStatus = "SUCCESS"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while updating SID via DAL service");
            throw;
        }
    }
}
