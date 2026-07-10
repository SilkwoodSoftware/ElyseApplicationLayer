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

// Updates the notes for a document viewer group permission record.
[Route("api/document-groups/view-group/notes")]
[ApiController]
public class UpdateDocGroupViewNotes : BaseStoredProcedureController
{
    public UpdateDocGroupViewNotes(StoredProcedureService storedProcedureService, ILogger<UpdateDocGroupViewNotes> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateDocGroupViewNotesRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating document group view notes",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@docgroupid", request.docGroupId ?? (object)DBNull.Value },
                    { "@user_sid_id", request.userId ?? (object)DBNull.Value },
                    { "@inputnotes", request.inputNotes ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("authorising.usp_UPD_doc_grp_viewer_notes", parameters);
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

public class UpdateDocGroupViewNotesRequest
{
    public long? docGroupId { get; set; }
    public long? userId { get; set; }
    public string inputNotes { get; set; }
}
