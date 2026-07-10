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

// Updates a unit of measure record.
[Route("api/unit-of-measure")]
[ApiController]
public class UpdateUnitOfMeasure : BaseStoredProcedureController
{
    public UpdateUnitOfMeasure(StoredProcedureService storedProcedureService, ILogger<UpdateUnitOfMeasure> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateUnitOfMeasureRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating unit of measure",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@recordid", request.unitsId ?? (object)DBNull.Value },
                    { "@unitofmeasure", request.unitOfMeasure ?? (object)DBNull.Value },
                    { "@description", request.description ?? (object)DBNull.Value },
                    { "@listposition", request.listPosition ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_UPD_unit_of_measure", parameters);
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

public class UpdateUnitOfMeasureRequest
{
    public long? unitsId { get; set; }
    public string unitOfMeasure { get; set; }
    public string description { get; set; }
    public int? listPosition { get; set; }
}
