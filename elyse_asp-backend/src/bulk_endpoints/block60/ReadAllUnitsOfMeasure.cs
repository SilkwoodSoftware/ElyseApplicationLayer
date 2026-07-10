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

// Lists all units of measure.

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/units-of-measure")]
[ApiController]
public class ReadUnitsOfMeasure : BaseStoredProcedureController
{
    public ReadUnitsOfMeasure(StoredProcedureService storedProcedureService, ILogger<ReadUnitsOfMeasure> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read()
    {
        return await ExecuteWithErrorHandlingAsync(
            "retrieving all units of measure",
            async () =>
            {
                var inputParameters = new Dictionary<string, object>();
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_all_units_of_measure", inputParameters);
            },
            result =>
            {
                var resultSets = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    resultSets,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}
