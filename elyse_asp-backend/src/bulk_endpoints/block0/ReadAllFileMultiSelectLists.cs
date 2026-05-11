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

// Selects all file multi-select list names.

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Threading.Tasks;

[Route("api/file/multi-select/list")]
[ApiController]
public class ReadAllFileMultiSelectLists : BaseStoredProcedureController
{
    public ReadAllFileMultiSelectLists(StoredProcedureService storedProcedureService, ILogger<ReadAllFileMultiSelectLists> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read()
    {
        return await ExecuteWithErrorHandlingAsync(
            "retrieving file multi-select lists",
            async () => await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_all_file_ms_lists", new Dictionary<string, object>()),
            result =>
            {
                var listsData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    listsData,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}
