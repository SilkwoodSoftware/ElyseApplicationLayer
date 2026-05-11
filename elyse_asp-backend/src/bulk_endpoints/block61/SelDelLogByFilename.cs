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

// Selects records from the file delete log where the filename includes the given string.  Only returns files for which the connected user has viewing rights to.  Note however that this will include the data for any deleted files.
[Route("api/del-log-by-filename")]
[ApiController]
public class SelDelLogByFilename : BaseStoredProcedureController
{
    public SelDelLogByFilename(StoredProcedureService storedProcedureService, ILogger<SelDelLogByFilename> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> GetDelLogByFilename([FromQuery] string  likeString)
    {
        return await ExecuteWithErrorHandlingAsync(
            "retrieving delete log by filename",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@likestring",  likeString ?? (object)DBNull.Value }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_SEL_del_log_by_filename", parameters);
            },
            result =>
            {
                var data = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numberOfRows = GetOutputParameterValue(result, "@numrows");
                var tooltips = ExtractTooltips(data);

                var response = new
                {
                    data,
                    transactionMessage,
                    transactionStatus,
                    numberOfRows,
                    tooltips
                };

                return Ok(response);
            });
    }
}
