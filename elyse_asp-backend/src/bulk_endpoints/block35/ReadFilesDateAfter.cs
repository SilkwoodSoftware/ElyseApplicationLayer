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
using System;

// Returns metadata for files where a date record is after a given date.
// Applies a filter group.
[Route("api/files/date/after")]
[ApiController]
public class ReadFilesDateAfter : BaseStoredProcedureController
{
    public ReadFilesDateAfter(StoredProcedureService storedProcedureService, ILogger<ReadFilesDateAfter> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long? fileDateNameId = null, [FromQuery] string dateValue = null, [FromQuery] long? filterGroupId = null, [FromQuery] long? formId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading files date after",
            async () =>
            {
                // Parse date string to DateTime without timezone conversion
                DateTime? parsedDate = null;
                if (!string.IsNullOrEmpty(dateValue))
                {
                    if (DateTime.TryParse(dateValue, out DateTime tempDate))
                    {
                        // Use only the date part to avoid timezone issues
                        parsedDate = tempDate.Date;
                    }
                }

                var parameters = new Dictionary<string, object>
                {
                    { "@filedatenameid", fileDateNameId ?? (object)DBNull.Value },
                    { "@datevalue", parsedDate ?? (object)DBNull.Value },
                    { "@filtergroupid", filterGroupId ?? (object)DBNull.Value },
                    { "@formid", formId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_files_date_after", parameters);
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
