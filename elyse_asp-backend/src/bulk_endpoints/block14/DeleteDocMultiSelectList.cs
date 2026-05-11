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

// Deletes a document multi-select list name record.
[Route("api/document/multi-select/list")]
[ApiController]
public class DeleteDocMultiSelectList : BaseStoredProcedureController
{
    public DeleteDocMultiSelectList(StoredProcedureService storedProcedureService, ILogger<DeleteDocMultiSelectList> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("delete")]
    public async Task<IActionResult> Delete([FromBody] DeleteDocMultiSelectListRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "deleting document multi-select list",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@id_to_delete", request.docMultiSelectListId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_DEL_doc_ms_list", parameters);
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

public class DeleteDocMultiSelectListRequest
{
    public long? docMultiSelectListId { get; set; }
}
