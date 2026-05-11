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

// Updates a transaction group note
[Route("api/transaction-group")]
[ApiController]
public class UpdateTransactionGroup : BaseStoredProcedureController
{
    public UpdateTransactionGroup(StoredProcedureService storedProcedureService, ILogger<UpdateTransactionGroup> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateTransactionGroupRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating transaction group",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@transactiongroup", request.transactionGroupId ?? (object)DBNull.Value },
                    { "@new_transaction_group_note", request.newTransactionGroupNote ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_UPD_transaction_group", parameters);
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

public class UpdateTransactionGroupRequest
{
    public long? transactionGroupId { get; set; }
    public string newTransactionGroupNote { get; set; }
}
