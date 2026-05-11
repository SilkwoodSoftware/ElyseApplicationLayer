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

// Inserts a document group edit permission to function list record.
[Route("api/document-group/edit-permission/function-list")]
[ApiController]
public class InsertDocGroupEditPermissionForFunction : BaseStoredProcedureController
{
    public InsertDocGroupEditPermissionForFunction(StoredProcedureService storedProcedureService, ILogger<InsertDocGroupEditPermissionForFunction> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] InsertDocGroupEditPermissionForFunctionRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "inserting document group edit permission for function",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@docgroupid", request.docGroupId ?? (object)DBNull.Value },
                    { "@functionlistid", request.functionListId ?? (object)DBNull.Value },
                    { "@inputnotes", request.inputNotes ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_INS_doc_gp_ed_perm_funct", parameters);
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

public class InsertDocGroupEditPermissionForFunctionRequest
{
    public long? docGroupId { get; set; }
    public long? functionListId { get; set; }
    public string? inputNotes { get; set; }
}
