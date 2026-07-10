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

// Reads all common object records and associated attribute.

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Threading.Tasks;

[Route("api/common-objects")]
[ApiController]
public class ReadAllCommonObjects : BaseStoredProcedureController
{
    public ReadAllCommonObjects(StoredProcedureService storedProcedureService, ILogger<ReadAllCommonObjects> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read()
    {
        return await ExecuteWithErrorHandlingAsync(
            "retrieving all common objects",
            async () => await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_all_common_objects", new Dictionary<string, object>()),
            result =>
            {
                var objectsData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    objectsData,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}
