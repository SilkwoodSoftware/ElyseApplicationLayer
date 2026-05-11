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

// Updates a file to document link.
[Route("api/file/document/link")]
[ApiController]
public class UpdateFileDocumentLink : BaseStoredProcedureController
{
    public UpdateFileDocumentLink(StoredProcedureService storedProcedureService, ILogger<UpdateFileDocumentLink> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateFileDocumentLinkRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating file document link",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@documentid", request.documentId ?? (object)DBNull.Value },
                    { "@newdocumentid", request.newDocumentId ?? (object)DBNull.Value },
                    { "@fileid", request.fileId ?? (object)DBNull.Value },
                    { "@newfileid", request.newFileId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_UPD_file_doc_link", parameters);
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

public class UpdateFileDocumentLinkRequest
{
    public string documentId { get; set; }
    public string newDocumentId { get; set; }
    public long? fileId { get; set; }
    public long? newFileId { get; set; }
}
