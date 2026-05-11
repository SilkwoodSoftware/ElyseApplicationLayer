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

// Deletes a document to document group record.
// Only applies to documents and document groups for which the user has rights.
[Route("api/document-group/link/restricted")]
[ApiController]
public class DeleteDocumentGroupLinkRestricted : BaseStoredProcedureController
{
    public DeleteDocumentGroupLinkRestricted(StoredProcedureService storedProcedureService, ILogger<DeleteDocumentGroupLinkRestricted> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("delete")]
    public async Task<IActionResult> Delete([FromBody] DeleteDocumentGroupLinkRestrictedRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "deleting document group link restricted",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@documentid", System.Web.HttpUtility.UrlDecode(request.documentId) ?? (object)DBNull.Value },
                    { "@docgroupid", request.docGroupId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_DEL_doc_group_link_restr", parameters);
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

public class DeleteDocumentGroupLinkRestrictedRequest
{
    public string? documentId { get; set; }
    public long? docGroupId { get; set; }
}
