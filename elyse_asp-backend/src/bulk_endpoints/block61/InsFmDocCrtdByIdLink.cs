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

// Creates a link between a form and the doc-created-by-id field.
[Route("api/fm-doc-crtd-by-id-link")]
[ApiController]
public class InsFmDocCrtdByIdLink : BaseStoredProcedureController
{
    public InsFmDocCrtdByIdLink(StoredProcedureService storedProcedureService, ILogger<InsFmDocCrtdByIdLink> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> InsertFmDocCrtdByIdLink([FromBody] InsFmDocCrtdByIdLinkDto dto)
    {
        return await ExecuteWithErrorHandlingAsync(
            "inserting form document created by id link",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@formid", dto.formId ?? (object)DBNull.Value },
                    { "@fieldlength", dto.fieldlength ?? (object)DBNull.Value },
                    { "@formposition", dto.formposition ?? (object)DBNull.Value },
                    { "@attribute1", dto.attribute1 ?? (object)DBNull.Value },
                    { "@attribute2", dto.attribute2 ?? (object)DBNull.Value },
                    { "@attribute3", dto.attribute3 ?? (object)DBNull.Value }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_INS_fm_doc_crtd_by_id_link", parameters);
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

    public class InsFmDocCrtdByIdLinkDto
    {
        public long? formId { get; set; }
        public short? fieldlength { get; set; }
        public string? formposition { get; set; }
        public string? attribute1 { get; set; }
        public string? attribute2 { get; set; }
        public string? attribute3 { get; set; }
    }
}
