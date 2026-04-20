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

// Deletes a duty function list element record.
[Route("api/function-list")]
[ApiController]
public class DeleteFunctionList : BaseStoredProcedureController
{
    public DeleteFunctionList(StoredProcedureService storedProcedureService, ILogger<DeleteFunctionList> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("delete")]
    public async Task<IActionResult> Delete([FromBody] DeleteFunctionListRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "deleting function list",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@functionlistid", request.functionListId ?? (object)DBNull.Value },
                    { "@functionid", request.functionId ?? (object)DBNull.Value }                    
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_DEL_function_list", parameters);
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

public class DeleteFunctionListRequest
{
    public long? functionId { get; set; }

    public long? functionListId { get; set; }
}
