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

// Selects forms by form group.

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/forms/form-group")]
[ApiController]
public class ReadFormsByFormGroup : BaseStoredProcedureController
{
    public ReadFormsByFormGroup(StoredProcedureService storedProcedureService, ILogger<ReadFormsByFormGroup> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long? formGroupId)
    {
        return await ExecuteWithErrorHandlingAsync(
            "retrieving forms by form group",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@formgroupid", formGroupId ?? (object)DBNull.Value }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_forms_by_form_group", parameters);
            },
            result =>
            {
                var resultSets = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numberOfRows = GetOutputParameterValue(result, "@numrows");

                var response = new
                {
                    resultSets,
                    transactionMessage,
                    transactionStatus,
                    numberOfRows
                };

                return Ok(response);
            });
    }
}
