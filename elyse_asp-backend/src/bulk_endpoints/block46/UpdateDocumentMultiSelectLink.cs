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

// Updates a document multi-select link record.
[Route("api/document/multi-select/link")]
[ApiController]
public class UpdateDocumentMultiSelectLink : BaseStoredProcedureController
{
    public UpdateDocumentMultiSelectLink(StoredProcedureService storedProcedureService, ILogger<UpdateDocumentMultiSelectLink> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateDocumentMultiSelectLinkRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating document multi-select link",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@documentid", request.documentId ?? (object)DBNull.Value },
                    { "@docmslistid", request.docMultiSelectListId ?? (object)DBNull.Value },
                    { "@docmsattrid", request.docMultiSelectAttributeId ?? (object)DBNull.Value },
                    { "@newdocmsattrid", request.newDocMultiSelectAttributeId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_UPD_doc_multi_select_link", parameters);
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

public class UpdateDocumentMultiSelectLinkRequest
{
    public string documentId { get; set; }
    public long? docMultiSelectListId { get; set; }
    public long?docMultiSelectAttributeId { get; set; }
    public long? newDocMultiSelectAttributeId { get; set; }
}
