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

// Selects file metadata for files which contain the given text using the CONTAINSTABLE function, with filter group applied.
[Route("api/files-containstabl")]
[ApiController]
public class SelFilesContainstablWithDocs : BaseStoredProcedureController
{
    public SelFilesContainstablWithDocs(StoredProcedureService storedProcedureService, ILogger<SelFilesContainstablWithDocs> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read-with-docs")]
    public async Task<IActionResult> GetFilesContainstablWithDocs([FromQuery] string containsString, [FromQuery] long? filterGroupId, [FromQuery] long? formId)
    {
        return await ExecuteWithErrorHandlingAsync(
            "retrieving files using containstable search",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@containsstring", containsString ?? (object)DBNull.Value },
                    { "@filtergroupid", filterGroupId ?? (object)DBNull.Value },
                    { "@formid", formId ?? (object)DBNull.Value }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_files_containstable", parameters);
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
                var outputFilterGroupId = GetOutputParameterValue(result, "@outputfiltergroupid");
                var filterGroupName = GetOutputParameterValue(result, "@filtergroupname");
                var tooltips = ExtractTooltips(fileData);

                var transformedData = TransformDocumentData(fileData);

                var response = new
                {
                    fileData = transformedData,
                    transactionMessage,
                    transactionStatus,
                    numberOfRows,
                    numberOfFiles,
                    outputFormId,
                    formName,
                    outputFilterGroupId,
                    filterGroupName,
                    tooltips
                };

                return Ok(response);
            });
    }
}