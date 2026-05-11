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

// Cancels an authoriser pending grant request.
[Route("api/cancel-authoriser-requ")]
[ApiController]
public class UpdCancelAuthoriserRequ : BaseStoredProcedureController
{
    public UpdCancelAuthoriserRequ(StoredProcedureService storedProcedureService, ILogger<UpdCancelAuthoriserRequ> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("cancel")]
    public async Task<IActionResult> UpdateCancelAuthoriserRequ([FromBody] UpdCancelAuthoriserRequDto dto)
    {
        return await ExecuteWithErrorHandlingAsync(
            "cancelling authoriser request",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@request_id", dto.requestId ?? (object)DBNull.Value }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("authorising.usp_UPD_cancel_authoriser_requ", parameters);
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

public class UpdCancelAuthoriserRequDto
{
    public long? requestId { get; set; }
}
