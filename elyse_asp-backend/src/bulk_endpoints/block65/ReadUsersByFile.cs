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

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

// Lists all of the users linked to a given file ID.
[Route("api/users/file")]
[ApiController]
public class ReadUsersByFile : BaseStoredProcedureController
{
    public ReadUsersByFile(StoredProcedureService storedProcedureService, ILogger<ReadUsersByFile> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long? fileId)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading users by file",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@fileid", fileId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_users_by_file", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    data = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>()
                };

                return Ok(response);
            });
    }
}
