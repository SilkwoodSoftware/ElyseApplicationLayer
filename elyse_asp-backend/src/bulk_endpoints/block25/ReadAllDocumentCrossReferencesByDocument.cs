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

// Returns metadata for documents for a given document and cross reference type.
[Route("api/document/cross-references")]
[ApiController]
public class ReadAllDocumentCrossReferencesByDocument : BaseStoredProcedureController
{
    public ReadAllDocumentCrossReferencesByDocument(StoredProcedureService storedProcedureService, ILogger<ReadAllDocumentCrossReferencesByDocument> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] string? documentId = null, [FromQuery] long? crossReferenceTypeId = null, [FromQuery] long? formId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading all document cross references by document",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@documentid", documentId ?? (object)DBNull.Value },
                    { "@xref_typeid", crossReferenceTypeId ?? (object)DBNull.Value },
                    { "@formid", formId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_all_doc_xrefs_by_doc", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numRows = GetOutputParameterValue(result, "@numrows");
                var numDocs = GetOutputParameterValue(result, "@numdocs");

                var documentData = result.ResultSets.Count > 0 ? result.ResultSets[0] : new List<Dictionary<string, object>>();
                var tooltips = ExtractTooltips(documentData);
                var transformedData = TransformDocumentData(documentData);

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    numRows,
                    numDocs,
                    tooltips,
                    documentData = transformedData
                };

                return Ok(response);
            });
    }

    private object ExtractTooltips(List<List<Dictionary<string, object>>> resultSets)
    {
        throw new NotImplementedException();
    }
}
