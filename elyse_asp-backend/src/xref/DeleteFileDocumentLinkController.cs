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
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Data.SqlClient;

[Route("api/xref")]
[ApiController]
public class DeleteFileDocumentLinkController : BaseStoredProcedureController
{
    public DeleteFileDocumentLinkController(StoredProcedureService storedProcedureService, ILogger<DeleteFileDocumentLinkController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("file-doc-links")]
    public async Task<IActionResult> DeleteFileDocumentLink([FromBody] DeleteFileDocumentLinkDto deleteFileDocumentLinkDto)
    {
        try
        {
            var inputParameters = new Dictionary<string, object>
            {
                { "@documentid", deleteFileDocumentLinkDto.documentId },
                { "@fileid", deleteFileDocumentLinkDto.fileId }
            };
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_DEL_file_doc_link", inputParameters);

            var transactionMessage = GetOutputParameterValue(result, "@message");
            var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

            var response = new
            {
                transactionMessage,
                transactionStatus
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
                        _logger.LogError(ex, "A SQL exception occurred while deleting file-document link.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while deleting file-document link.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }
}

public class DeleteFileDocumentLinkDto
{
    public string? documentId { get; set; }
    public long fileId { get; set; }
}

