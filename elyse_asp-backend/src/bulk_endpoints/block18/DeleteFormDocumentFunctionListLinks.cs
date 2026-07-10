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

// Deletes a form to document duty function link.
[Route("api/form/document/duty-function/list/link")]
[ApiController]
public class DeleteFormDocumentFunctionListLinks : BaseStoredProcedureController
{
    public DeleteFormDocumentFunctionListLinks(StoredProcedureService storedProcedureService, ILogger<DeleteFormDocumentFunctionListLinks> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("delete")]
    public async Task<IActionResult> Delete([FromBody] DeleteFormDocumentFunctionListLinksRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "deleting form document function list links",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@formid", request.formId ?? (object)DBNull.Value },
                    { "@genfield_nameid", request.generalFieldNameId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_DEL_fm_doc_funct_lst_links", parameters);
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

public class DeleteFormDocumentFunctionListLinksRequest
{
    public long? formId { get; set; }
    public long? generalFieldNameId { get; set; }
}
