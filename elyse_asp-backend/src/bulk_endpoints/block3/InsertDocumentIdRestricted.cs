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

// Creates a new document ID record.
// The document group name is mandatory and must be a document group which the user already has edit permission for.
// This allows the user to then add metadata to the document.
[Route("api/document/restricted")]
[ApiController]
public class InsertDocumentIdRestricted : BaseStoredProcedureController
{
    public InsertDocumentIdRestricted(StoredProcedureService storedProcedureService, ILogger<InsertDocumentIdRestricted> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] InsertDocumentIdRestrictedRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "inserting restricted document ID",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@documentid", request.documentId ?? (object)DBNull.Value },
                    { "@docgroupid", request.docGroupId ?? (object)DBNull.Value },
                    { "@transactiongroup", request.transactionGroupId ?? (object)DBNull.Value },
                    { "@idlockstatus", request.idLockStatus ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_INS_document_id_restr", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var newDocId = GetOutputParameterValue(result, "@newdocumentid");

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    newDocId
                };

                return Ok(response);
            });
    }
}

public class InsertDocumentIdRestrictedRequest
{
    public string? documentId { get; set; }
    public long? docGroupId { get; set; }
    public long? transactionGroupId { get; set; }
    public string? idLockStatus { get; set; }
}
