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

// Returns document data linked to a given tag.
// Tag descendants are applied if @tag_descendants =  'ON'.  Defaults to ON.
// If no tag tree ID is supplied then the default is retrieved from global settings.
// A filter group is applied.

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/documents/tag")]
[ApiController]
public class ReadDocumentsByTag : BaseStoredProcedureController
{
    public ReadDocumentsByTag(StoredProcedureService storedProcedureService, ILogger<ReadDocumentsByTag> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long tagId, [FromQuery] long? tagTreeId = null, [FromQuery] string tagDescendants = "ON", [FromQuery] long? filterGroupId = null, [FromQuery] long? formId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            $"retrieving documents for tag ID {tagId}",
            async () =>
            {
                var inputParameters = new Dictionary<string, object>
                {
                    { "@tag_id", tagId },
                    { "@tag_treeid", tagTreeId ?? (object)DBNull.Value },
                    { "@tag_descendants", tagDescendants },
                    { "@filtergroupid", filterGroupId ?? (object)DBNull.Value },
                    { "@formid", formId ?? (object)DBNull.Value }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_docs_by_tag", inputParameters);
            },
            result =>
            {
                var documentData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numberOfRows = GetOutputParameterValue(result, "@numrows");
                var numberOfRecords = GetOutputParameterValue(result, "@numrecords");
                var numberOfDocs = GetOutputParameterValue(result, "@numdocs");

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
                    tooltips
                };

                return Ok(response);
            });
    }
}
