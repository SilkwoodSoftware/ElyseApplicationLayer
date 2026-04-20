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

// Updates a link between a form and a document-created-by-id field.
[Route("api/del-fm-doc-crtd-by-id-link")]
[ApiController]
public class DelFmDocCrtdByIdLink : BaseStoredProcedureController
{
    public DelFmDocCrtdByIdLink(StoredProcedureService storedProcedureService, ILogger<DelFmDocCrtdByIdLink> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("delete")]
    public async Task<IActionResult> DeleteFmDocCrtdByIdLink([FromBody] DeleteFmDocCrtdByIdLinkRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "deleting form document created by id link",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@formid", request.formId ?? (object)DBNull.Value }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_DEL_fm_doc_crtd_by_id_link", parameters);
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

public class DeleteFmDocCrtdByIdLinkRequest
{
    public long? formId { get; set; }
}
