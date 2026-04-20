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

// Updates the notes for a user sid for a controller level document group link.
[Route("api/user/controller/document-group/sid")]
[ApiController]
public class UpdateControllerDocGroupSID : BaseStoredProcedureController
{
    public UpdateControllerDocGroupSID(StoredProcedureService storedProcedureService, ILogger<UpdateControllerDocGroupSID> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateControllerDocGroupSIDRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating controller document group SID",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@contr_doc_ed_grp_name_id", request.controllerDocEditGroupNameId ?? (object)DBNull.Value },
                    { "@user_sid_id", request.userId ?? (object)DBNull.Value },
                    { "@inputnotes", request.inputNotes ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("authorising.usp_UPD_contr_doc_group_sid", parameters);
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

public class UpdateControllerDocGroupSIDRequest
{
    public long? controllerDocEditGroupNameId { get; set; }
    public long? userId { get; set; }
    public string inputNotes { get; set; }
}
