/*
 * Copyright 2026 Silkwood Software Pty. Ltd.
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

// Inserts a new release type (e.g. 'Revision', 'Version' etc).
[Route("api/release-id-type")]
[ApiController]
public class InsertReleaseIdType : BaseStoredProcedureController
{
    public InsertReleaseIdType(StoredProcedureService storedProcedureService, ILogger<InsertReleaseIdType> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] InsertReleaseIdTypeRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "creating release id type",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@release_type", request.releaseType ?? (object)DBNull.Value },
                    { "@description", request.description ?? (object)DBNull.Value },
                    { "@mnemonic", request.mnemonic ?? (object)DBNull.Value },                    
                    { "@listposition", request.listPosition ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_INS_release_id_type", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var newRecordId = GetOutputParameterValue(result, "@newrecordid");

                var response = new
                {
                    newRecordId,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}

public class InsertReleaseIdTypeRequest
{
    public string? releaseType { get; set; }
    public string? description { get; set; }
    public string? mnemonic { get; set; }    
    public int? listPosition { get; set; }
}
