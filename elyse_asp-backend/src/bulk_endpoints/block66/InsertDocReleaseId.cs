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

// Creates a new release identifier for a given document ID.
[Route("api/document-release-id")]
[ApiController]
public class InsertDocReleaseId : BaseStoredProcedureController
{
    public InsertDocReleaseId(StoredProcedureService storedProcedureService, ILogger<InsertDocReleaseId> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] InsertDocReleaseIdRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "creating document release id",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@documentid", request.documentId ?? (object)DBNull.Value },
                    { "@release_identifier", request.releaseIdentifier ?? (object)DBNull.Value },
                    { "@release_type_id", request.releaseTypeId ?? (object)DBNull.Value },
                    { "@listposition", request.listPosition ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_INS_doc_release_id", parameters);
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

public class InsertDocReleaseIdRequest
{
    public string? documentId { get; set; }
    public string? releaseIdentifier { get; set; }
    public long? releaseTypeId { get; set; }
    public int? listPosition { get; set; }
}
