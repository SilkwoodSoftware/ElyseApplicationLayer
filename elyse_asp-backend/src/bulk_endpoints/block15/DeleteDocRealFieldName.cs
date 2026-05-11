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

// Deletes a document real number field.
[Route("api/document/real-field/name")]
[ApiController]
public class DeleteDocRealFieldName : BaseStoredProcedureController
{
    public DeleteDocRealFieldName(StoredProcedureService storedProcedureService, ILogger<DeleteDocRealFieldName> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("delete")]
    public async Task<IActionResult> Delete([FromBody] DeleteDocRealFieldNameRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "deleting document real field name",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@id_to_delete", request.docRealNameId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_DEL_doc_real_field_name", parameters);
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

public class DeleteDocRealFieldNameRequest
{
    public long? docRealNameId { get; set; }
}
