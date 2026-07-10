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

// Deletes a link between a form and the document created date field.
[Route("api/form/doc-created")]
[ApiController]
public class DeleteFormDocCreatedLink : BaseStoredProcedureController
{
    public DeleteFormDocCreatedLink(StoredProcedureService storedProcedureService, ILogger<DeleteFormDocCreatedLink> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("delete")]
    public async Task<IActionResult> Delete([FromBody] DeleteFormDocCreatedLinkRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "deleting form document created link",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@formid", request.formId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_DEL_form_doc_created_link", parameters);
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

public class DeleteFormDocCreatedLinkRequest
{
    public long? formId { get; set; }
}
