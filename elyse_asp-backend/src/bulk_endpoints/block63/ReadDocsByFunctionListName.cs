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

// Selects documents by function list name.

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/documents/function-list-name")]
[ApiController]
public class ReadDocsByFunctionListName : BaseStoredProcedureController
{
    public ReadDocsByFunctionListName(StoredProcedureService storedProcedureService, ILogger<ReadDocsByFunctionListName> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long? generalFieldNameId, [FromQuery] long? filterGroupId, [FromQuery] long? formId)
    {
        return await ExecuteWithErrorHandlingAsync(
            "retrieving documents by function list name",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@genfield_nameid", generalFieldNameId ?? (object)DBNull.Value },
                    { "@filtergroupid", filterGroupId ?? (object)DBNull.Value },
                    { "@formid", formId ?? (object)DBNull.Value }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_dc_by_fnct_list_name", parameters);
            },
            result =>
            {
                var documentData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numberOfRows = GetOutputParameterValue(result, "@numrows");
                var numberOfRecords = GetOutputParameterValue(result, "@numrecords");
                var numberOfDocs = GetOutputParameterValue(result, "@numdocs");
                var outputFormId = GetOutputParameterValue(result, "@outputformid");
                var formName = GetOutputParameterValue(result, "@formname");
                var outputFilterGroupId = GetOutputParameterValue(result, "@outputfiltergroupid");
                var filterGroupName = GetOutputParameterValue(result, "@filtergroupname");

                var tooltips = ExtractTooltips(documentData);
                var transformedData = TransformDocumentData(documentData);

                var response = new
                {
                    documentData = transformedData,
                    transactionMessage,
                    transactionStatus,
                    numberOfRows,
                    numberOfRecords,
                    numberOfDocs,
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