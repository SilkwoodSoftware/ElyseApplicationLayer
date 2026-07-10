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

// Updates a document to tag link. Both IDs must be re-sent.
[Route("api/tag/document/link")]
[ApiController]
public class UpdateTagToDocumentLink : BaseStoredProcedureController
{
    public UpdateTagToDocumentLink(StoredProcedureService storedProcedureService, ILogger<UpdateTagToDocumentLink> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateTagToDocumentLinkRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating tag to document link",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@tag_id", request.tagId ?? (object)DBNull.Value },
                    { "@documentid", request.documentId ?? (object)DBNull.Value },
                    { "@newtag_id", request.newTagId ?? (object)DBNull.Value },
                    { "@newdocumentid", request.newDocumentId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_UPD_tag_doc_link", parameters);
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

public class UpdateTagToDocumentLinkRequest
{
    public long? tagId { get; set; }
    public string documentId { get; set; }
    public long? newTagId { get; set; }
    public string newDocumentId { get; set; }
}
