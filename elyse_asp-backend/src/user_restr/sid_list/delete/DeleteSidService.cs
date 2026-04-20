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

// Deletes a SID from the database using secure DAL architecture
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;

public class DeleteSidService
{
    private readonly StoredProcedureService _storedProcedureService;
    private readonly ILogger<DeleteSidService> _logger;

    public DeleteSidService(StoredProcedureService storedProcedureService, ILogger<DeleteSidService> logger)
    {
        _storedProcedureService = storedProcedureService ?? throw new ArgumentNullException(nameof(storedProcedureService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<object> DeleteSid(long sidId)
    {
        _logger.LogInformation("Deleting SID via secure DAL architecture");

        var parameters = new Dictionary<string, object>
        {
            { "@sidrecordid", sidId }
        };

        try
        {
            // Route through StoredProcedureService -> AUTHORISER DAL service with complete credential isolation
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("authorising.usp_DEL_sid", parameters);
            
            _logger.LogInformation("SID deletion completed successfully via DAL service");

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
            _logger.LogError(ex, "An error occurred while deleting SID via DAL service");
            throw;
        }
    }
}
