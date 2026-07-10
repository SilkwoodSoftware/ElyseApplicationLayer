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

// Returns metadata for files linked to a given user field name.
// No filter group is applied.
[Route("api/all-files/user-field-name")]
[ApiController]
public class ReadAllFilesByUserFgn : BaseStoredProcedureController
{
    public ReadAllFilesByUserFgn(StoredProcedureService storedProcedureService, ILogger<ReadAllFilesByUserFgn> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long? generalFieldNameId, [FromQuery] long? formId)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading all files by user field name",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@genfield_nameid", generalFieldNameId ?? (object)DBNull.Value },
                    { "@formid", formId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_all_fl_by_user_fgn", parameters);
            },
            result =>
            {
                var fileData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numRows = GetOutputParameterValue(result, "@numrows");
                var numRecords = GetOutputParameterValue(result, "@numrecords");
                var numDocs = GetOutputParameterValue(result, "@numdocs");
                var outputFormId = GetOutputParameterValue(result, "@outputformid");
                var formName = GetOutputParameterValue(result, "@formname");

                var tooltips = ExtractTooltips(fileData);
                var transformedData = TransformFilesData(fileData);

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    numRows,
                    numRecords,
                    numDocs,
                    outputFormId,
                    formName,
                    tooltips,
                    fileData = transformedData
                };

                return Ok(response);
            });
    }
}
