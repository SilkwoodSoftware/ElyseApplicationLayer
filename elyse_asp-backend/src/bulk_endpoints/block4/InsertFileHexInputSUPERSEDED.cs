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

// Stores a file. Input is a hex string of the file. Converts this to binary.
// A document id to link the file to can be supplied. Or alternatively, setting the @docIdAutoGen parameter to 'Yes' will trigger the automatic generation of a document id.
// @docIdAutoGen will be ignored if a document id is supplied.
[Route("api/file/hex")]
[ApiController]
public class InsertFileHexInput : BaseStoredProcedureController
{
    public InsertFileHexInput(StoredProcedureService storedProcedureService, ILogger<InsertFileHexInput> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] InsertFileHexInputRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "inserting file from hex",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@file_content_bin", request.FileContentBin ?? (object)DBNull.Value },
                    { "@stored_filename", request.storedFilename ?? (object)DBNull.Value },
                    { "@transactiongroup", request.transactionGroupId ?? (object)DBNull.Value },
                    { "@documentid", request.documentId ?? (object)DBNull.Value },
                    { "@docIdAutoGen", request.docIdAutoGen ?? (object)DBNull.Value },
                    { "@filegroupid", request.fileGroupId ?? (object)DBNull.Value },
                    { "@docgroupid", request.docGroupId ?? (object)DBNull.Value },
                    { "@duplicate_check", request.duplicateCheck ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_INS_file_binary_input", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var fileId = GetOutputParameterValue(result, "@fileid");
                var newDocumentId = GetOutputParameterValue(result, "@newdocumentid");

                var response = new
                {
                    fileId,
                    newDocumentId,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}

public class InsertFileHexInputRequest
{
    public byte[]? FileContentBin { get; set; }
    public string? storedFilename { get; set; }
    public long? transactionGroupId { get; set; }
    public string? documentId { get; set; }
    public string? docIdAutoGen { get; set; }
    public long? fileGroupId { get; set; }
    public long? docGroupId { get; set; }
    public string? duplicateCheck { get; set; }
}
