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

// Selects document IDs and metadata where the default document date field has expired.  Typically used for listing documents for which the reivew date has expired.
[Route("api/docs-date-expired")]
[ApiController]
public class SelDocsDateExpired : BaseStoredProcedureController
{
    public SelDocsDateExpired(StoredProcedureService storedProcedureService, ILogger<SelDocsDateExpired> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> GetDocsDateExpired([FromQuery] long? filterGroupId, [FromQuery] long? formId)
    {
        return await ExecuteWithErrorHandlingAsync(
            "retrieving expired documents",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@filtergroupid", filterGroupId ?? (object)DBNull.Value },
                    { "@formid", formId ?? (object)DBNull.Value }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_docs_date_expired", parameters);
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

                var transformedData = TransformDocDataExFiles(documentData);

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
