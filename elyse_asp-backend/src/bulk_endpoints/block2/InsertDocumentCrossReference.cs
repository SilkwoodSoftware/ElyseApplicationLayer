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

// Inserts a document cross reference link.
// Both controller and editor are authenticated.
[Route("api/document/cross-reference")]
[ApiController]
public class InsertDocumentCrossReference : BaseStoredProcedureController
{
    public InsertDocumentCrossReference(StoredProcedureService storedProcedureService, ILogger<InsertDocumentCrossReference> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] InsertDocumentCrossReferenceRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "inserting document cross reference",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@source_docid", request.sourceDocId ?? (object)DBNull.Value },
                    { "@xref_docid", request.crossReferenceDocId ?? (object)DBNull.Value },
                    { "@xref_typeid", request.crossReferenceTypeId ?? (object)DBNull.Value },
                    { "@input_notes", request.inputNotes ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_INS_doc_xref", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}

public class InsertDocumentCrossReferenceRequest
{
    public string? sourceDocId { get; set; }
    public string? crossReferenceDocId { get; set; }
    public long? crossReferenceTypeId { get; set; }
    public string? inputNotes { get; set; }
}
