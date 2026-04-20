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

// Selects file data for a given transaction group id.  
// Note that if no records are retrieved that the Message will be a cursor position 1.
// Does not apply a filter group. 

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/files/transaction-group")]
[ApiController]
public class ReadFilesByTransactionGroup : BaseStoredProcedureController
{
    public ReadFilesByTransactionGroup(StoredProcedureService storedProcedureService, ILogger<ReadFilesByTransactionGroup> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long transactionGroupId, [FromQuery] long? formId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            $"retrieving files for transaction group ID {transactionGroupId}",
            async () =>
            {
                var inputParameters = new Dictionary<string, object>
                {
                    { "@transactiongroup", transactionGroupId },
                    { "@formid", formId ?? (object)DBNull.Value }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_files_by_trans_group", inputParameters);
            },
            result =>
            {
                var fileData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var tooltips = ExtractTooltips(fileData);
                var transformedData = TransformFilesData(fileData);

                var response = new
                {
                    fileData = transformedData,
                    transactionMessage,
                    transactionStatus,
                    tooltips
                };

                return Ok(response);
            });
    }
}
