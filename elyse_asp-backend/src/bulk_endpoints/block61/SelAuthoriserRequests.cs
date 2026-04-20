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
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

// Selects all authoriser grant and revoke requests.
[Route("api/authoriser-requests")]
[ApiController]
public class SelAuthoriserRequests : BaseStoredProcedureController
{
    public SelAuthoriserRequests(StoredProcedureService storedProcedureService, ILogger<SelAuthoriserRequests> logger, IdFieldTypesProvider idFieldTypesProvider)
        : base(storedProcedureService, logger, null, idFieldTypesProvider)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> GetAuthoriserRequests()
    {
        return await ExecuteWithErrorHandlingAsync(
            "retrieving authoriser requests",
            async () =>
            {
                var parameters = new Dictionary<string, object>();
                return await _storedProcedureService.ExecuteStoredProcedureAsync("authorising.usp_SEL_authoriser_requests", parameters);
            },
            result =>
            {
                var data = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                data = ConvertIdFieldsToNumbers(data);
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var tooltips = ExtractTooltips(data);

                var response = new
                {
                    data,
                    transactionMessage,
                    transactionStatus,
                    tooltips
                };

                return Ok(response);
            });
    }
}
