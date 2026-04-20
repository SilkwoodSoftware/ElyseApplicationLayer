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

// Adds the connected user's security identifier to the SID list to self-onboard the user.
[Route("api/user")]
[ApiController]
public class SelfOnboardSid : BaseStoredProcedureController
{
    public SelfOnboardSid(StoredProcedureService storedProcedureService, ILogger<SelfOnboardSid> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("self-onboard")]
    public async Task<IActionResult> OnboardSelf()
    {
        return await ExecuteWithErrorHandlingAsync(
            "self-onboarding user",
            async () =>
            {
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_INS_self_onboard_sid", new Dictionary<string, object>());
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
