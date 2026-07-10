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

// Sets the transaction ID of a document to NULL
[Route("api/document/transaction-group")]
[ApiController]
public class DeleteDocumentTransactionGroup : BaseStoredProcedureController
{
    public DeleteDocumentTransactionGroup(StoredProcedureService storedProcedureService, ILogger<DeleteDocumentTransactionGroup> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("delete")]
    public async Task<IActionResult> Delete([FromBody] DeleteDocumentTransactionGroupRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "deleting document transaction group",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@documentid", request.documentId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_DEL_doc_transaction_group", parameters);
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

public class DeleteDocumentTransactionGroupRequest
{
    public string? documentId { get; set; }
}
