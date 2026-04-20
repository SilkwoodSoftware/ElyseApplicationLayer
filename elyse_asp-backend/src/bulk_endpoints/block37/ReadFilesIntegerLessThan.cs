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

// Returns metadata for files where a date record is less than a given integer value.
// Applies a filter group.
[Route("api/files/integer/less-than")]
[ApiController]
public class ReadFilesIntegerLessThan : BaseStoredProcedureController
{
    public ReadFilesIntegerLessThan(StoredProcedureService storedProcedureService, ILogger<ReadFilesIntegerLessThan> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] ReadFilesIntegerLessThanRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading files integer less than",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@fileintnameid", request.fileIntNameId ?? (object)DBNull.Value },
                    { "@integervalue", request.integerValue ?? (object)DBNull.Value },
                    { "@filtergroupid", request.filterGroupId ?? (object)DBNull.Value },
                    { "@formid", request.formId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_files_int_less_than", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numRows = GetOutputParameterValue(result, "@numrows");
                var numFiles = GetOutputParameterValue(result, "@numfiles");

                var fileData = result.ResultSets.Count > 0 ? result.ResultSets[0] : new List<Dictionary<string, object>>();
                var tooltips = ExtractTooltips(fileData);
                var transformedData = TransformFilesData(fileData);

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    numRows,
                    numFiles,
                    tooltips,
                    fileData = transformedData
                };

                return Ok(response);
            });
    }
}

public class ReadFilesIntegerLessThanRequest
{
    public long? fileIntNameId { get; set; }
    public long? integerValue { get; set; }
    public long? filterGroupId { get; set; }
    public long? formId { get; set; }
}
