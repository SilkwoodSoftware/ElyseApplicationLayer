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

// Updates the notes for a document to document group link.
[Route("api/document-group/link/notes/restricted")]
[ApiController]
public class UpdateDocGroupLinkNotesRestricted : BaseStoredProcedureController
{
    public UpdateDocGroupLinkNotesRestricted(StoredProcedureService storedProcedureService, ILogger<UpdateDocGroupLinkNotesRestricted> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateDocGroupLinkNotesRestrictedRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating document group link notes restricted",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@documentid", request.documentId ?? (object)DBNull.Value },
                    { "@docgroupid", request.docGroupId ?? (object)DBNull.Value },
                    { "@inputnotes", request.inputNotes ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_UPD_doc_grp_lnk_notes_rstr", parameters);
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

public class UpdateDocGroupLinkNotesRestrictedRequest
{
    public string documentId { get; set; }
    public long? docGroupId { get; set; }
    public string inputNotes { get; set; }
}
