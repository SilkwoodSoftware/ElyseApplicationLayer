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

// Selects file metadata for all the files which contain the given text using the CONTAINSTABLE function as applied to the stored plain text content of the file.    No filter group is applied.
[Route("api/all-files-containstabl")]
[ApiController]
public class SelAllFilesContainstabl : BaseStoredProcedureController
{
    public SelAllFilesContainstabl(StoredProcedureService storedProcedureService, ILogger<SelAllFilesContainstabl> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> GetAllFilesContainstabl([FromQuery] string containsString,  [FromQuery] long? formId)
    {
        return await ExecuteWithErrorHandlingAsync(
            "retrieving all files using containstable search",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@containsstring", containsString ?? (object)DBNull.Value },
                    { "@formid", formId ?? (object)DBNull.Value }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_all_files_containstabl", parameters);
            },
            result =>
            {
                var fileData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numberOfRows = GetOutputParameterValue(result, "@numrows");
                var numberOfFiles = GetOutputParameterValue(result, "@numfiles");
                var outputFormId = GetOutputParameterValue(result, "@outputformid");
                var formName = GetOutputParameterValue(result, "@formname");
                var tooltips = ExtractTooltips(fileData);

                var transformedData = TransformFilesData(fileData);

                var response = new
                {
                    fileData = transformedData,
                    transactionMessage,
                    transactionStatus,
                    numberOfRows,
                    numberOfFiles,
                    outputFormId,
                    formName,
                    tooltips
                };

                return Ok(response);
            });
    }
}
