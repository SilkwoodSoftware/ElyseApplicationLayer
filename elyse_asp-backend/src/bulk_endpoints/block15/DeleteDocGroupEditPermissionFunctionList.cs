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

// Deletes a record from a document group edit permission for function lists.
[Route("api/document-group/edit-permission/function-list")]
[ApiController]
public class DeleteDocGroupEditPermissionFunctionList : BaseStoredProcedureController
{
    public DeleteDocGroupEditPermissionFunctionList(StoredProcedureService storedProcedureService, ILogger<DeleteDocGroupEditPermissionFunctionList> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("delete")]
    public async Task<IActionResult> Delete([FromBody] DeleteDocGroupEditPermissionFunctionListRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "deleting document group edit permission function list",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@docgroupid", request.docGroupId ?? (object)DBNull.Value },
                    { "@functionlistid", request.functionListId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_DEL_doc_gp_ed_perm_funct", parameters);
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

public class DeleteDocGroupEditPermissionFunctionListRequest
{
    public long? docGroupId { get; set; }
    public long? functionListId { get; set; }
}
