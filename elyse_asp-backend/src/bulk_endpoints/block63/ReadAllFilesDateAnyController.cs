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

// Reads all files with any date value for a given field

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

[Route("api/files/date/any")]
[ApiController]
public class ReadAllFilesDateAnyController : BaseStoredProcedureController
{
    public ReadAllFilesDateAnyController(StoredProcedureService storedProcedureService, ILogger<ReadAllFilesDateAnyController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long? fileDateNameId, [FromQuery] long? formId)
    {
        return await ExecuteWithErrorHandlingAsync(
            "retrieving all files with date value",
            async () =>
            {
                var inputParameters = new Dictionary<string, object>
                {
                    { "@filedatenameid", fileDateNameId ?? (object)DBNull.Value },
                    { "@formid", formId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_all_files_date_any", inputParameters);
            },
            result =>
            {
                var fileData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numRows = GetOutputParameterValue(result, "@numrows");
                var numFiles = GetOutputParameterValue(result, "@numfiles");
                var tooltips = ExtractTooltips(fileData);

                var transformedData = TransformDocumentData(fileData);

                var response = new
                {
                    fileData = transformedData,
                    transactionMessage,
                    transactionStatus,
                    numRows,
                    numFiles,
                    tooltips
                };

                return Ok(response);
            });
    }
}
