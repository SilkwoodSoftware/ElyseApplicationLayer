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

// Links a document to a controller level document group.
[Route("api/user/controller/document-group")]
[ApiController]
public class InsertControllerDocumentGroupLink : BaseStoredProcedureController
{
    public InsertControllerDocumentGroupLink(StoredProcedureService storedProcedureService, ILogger<InsertControllerDocumentGroupLink> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] InsertControllerDocumentGroupLinkRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "creating controller document group link",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@documentid", request.documentId ?? (object)DBNull.Value },
                    { "@contr_doc_ed_grp_name_id", request.controllerDocEditGroupNameId ?? (object)DBNull.Value },
                    { "@inputnotes", request.inputNotes ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_INS_contr_doc_group_link", parameters);
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

public class InsertControllerDocumentGroupLinkRequest
{
    public string? documentId { get; set; }
    public long? controllerDocEditGroupNameId { get; set; }
    public string? inputNotes { get; set; }
}
