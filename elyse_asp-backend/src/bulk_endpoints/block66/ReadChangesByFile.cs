/*
 * Copyright 2026 Silkwood Software Pty. Ltd.
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

// Lists records in the file-document change log for a given file ID.
// Filters out document IDs which the connected user does not have viewing rights for.
[Route("api/file-document-changes/by-file")]
[ApiController]
public class ReadChangesByFile : BaseStoredProcedureController
{
    public ReadChangesByFile(StoredProcedureService storedProcedureService, ILogger<ReadChangesByFile> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long? fileId)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading file document changes by file",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@fileid", fileId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_SEL_changes_by_file", parameters);
            },
            result =>
            {
                var data = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var tooltips = ExtractTooltips(data);

                var response = new
                {
                    data,
                    transactionMessage,
                    transactionStatus,
                    tooltips
                };

                return Ok(response);
            });
    }
}
