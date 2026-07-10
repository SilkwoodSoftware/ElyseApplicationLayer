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

// Updates the notes for a document cross reference link.
[Route("api/document/cross-reference")]
[ApiController]
public class UpdateDocumentCrossReferenceText : BaseStoredProcedureController
{
    public UpdateDocumentCrossReferenceText(StoredProcedureService storedProcedureService, ILogger<UpdateDocumentCrossReferenceText> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateDocumentCrossReferenceTextRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating document cross reference text",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@source_docid", request.sourceDocId ?? (object)DBNull.Value },
                    { "@xref_docid", request.crossReferenceDocId ?? (object)DBNull.Value },
                    { "@input_notes", request.inputNotes ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_UPD_doc_xref_text", parameters);
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

public class UpdateDocumentCrossReferenceTextRequest
{
    public string sourceDocId { get; set; }
    public string crossReferenceDocId { get; set; }
    public string inputNotes { get; set; }
}
