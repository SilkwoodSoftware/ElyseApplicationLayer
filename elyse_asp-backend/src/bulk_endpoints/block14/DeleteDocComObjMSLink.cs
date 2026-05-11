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

// Deletes a document to common object link via a multi-select list.
[Route("api/document/common-object/multi-select")]
[ApiController]
public class DeleteDocComObjMSLink : BaseStoredProcedureController
{
    public DeleteDocComObjMSLink(StoredProcedureService storedProcedureService, ILogger<DeleteDocComObjMSLink> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("delete")]
    public async Task<IActionResult> Delete([FromBody] DeleteDocComObjMSLinkRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "deleting document common object multi-select link",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@documentid", request.documentId ?? (object)DBNull.Value },
                    { "@commonobjlistid", request.commonObjectListId ?? (object)DBNull.Value },
                    { "@commonobjectid", request.commonObjectId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_DEL_doc_to_com_obj_ms_link", parameters);
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

public class DeleteDocComObjMSLinkRequest
{
    public string? documentId { get; set; }
    public long? commonObjectListId { get; set; }
    public long? commonObjectId { get; set; }
}
