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

// Lists all the file real number field names.

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/file/real-number/names")]
[ApiController]
public class ReadAllFileRealFields : BaseStoredProcedureController
{
    public ReadAllFileRealFields(StoredProcedureService storedProcedureService, ILogger<ReadAllFileRealFields> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read()
    {
        return await ExecuteWithErrorHandlingAsync(
            "retrieving all file real number fields",
            async () =>
            {
                var inputParameters = new Dictionary<string, object>();
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_all_file_real_fields", inputParameters);
            },
            result =>
            {
                var fieldsData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                // Ensure List Position is always a number
                foreach (var item in fieldsData)
                {
                    if (item.ContainsKey("List Position") && (item["List Position"] == DBNull.Value || item["List Position"] == null))
                    {
                        item["List Position"] = 0;
                    }
                }

                var response = new
                {
                    fieldsData,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}
