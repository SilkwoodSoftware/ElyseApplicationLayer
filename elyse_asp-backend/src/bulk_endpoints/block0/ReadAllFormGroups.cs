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

// Selects all form groups.

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/form/groups")]
[ApiController]
public class ReadAllFormGroups : BaseStoredProcedureController
{
    public ReadAllFormGroups(StoredProcedureService storedProcedureService, ILogger<ReadAllFormGroups> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read()
    {
        return await ExecuteWithErrorHandlingAsync(
            "retrieving all form groups",
            async () =>
            {
                var inputParameters = new Dictionary<string, object>();
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_all_form_groups", inputParameters);
            },
            result =>
            {
                var groupsData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                // Ensure List Position is always a number
                foreach (var item in groupsData)
                {
                    if (item.ContainsKey("List Position") && (item["List Position"] == DBNull.Value || item["List Position"] == null))
                    {
                        item["List Position"] = 0;
                    }
                }

                var response = new
                {
                    groupsData,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}
