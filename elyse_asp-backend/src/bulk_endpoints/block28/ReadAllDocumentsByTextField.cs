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

// Selects a list of documents for a given text string and free text field ID.
// Outputs data according to the given form ID.
// If no doc text name or form ID are supplied then the default will be used.
// No filter group is applied.
[Route("api/document/text-string")]
[ApiController]
public class ReadAllDocumentsByTextField : BaseStoredProcedureController
{
    public ReadAllDocumentsByTextField(StoredProcedureService storedProcedureService, ILogger<ReadAllDocumentsByTextField> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long? docTextNameId = null, [FromQuery] string? likeString = null, [FromQuery] long? filterGroupId = null, [FromQuery] long? formId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading all documents by text field",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@doctextnameid", docTextNameId ?? (object)DBNull.Value },
                    { "@likestring", likeString ?? (object)DBNull.Value },                    
                    { "@formid", formId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_all_docs_by_text_field", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numRows = GetOutputParameterValue(result, "@numrows");
                var numDocs = GetOutputParameterValue(result, "@numdocs");
                var outputFormId = GetOutputParameterValue(result, "@outputformid");
                var formName = GetOutputParameterValue(result, "@formname");

                var documentData = result.ResultSets.Count > 0 ? result.ResultSets[0] : new List<Dictionary<string, object>>();
                var tooltips = ExtractTooltips(documentData);
                var transformedData = TransformDocumentData(documentData);

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    numRows,
                    numDocs,
                    outputFormId,
                    formName,
                    tooltips,
                    documentData = transformedData
                };

                return Ok(response);
            });
    }
}
