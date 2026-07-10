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
using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

// Deletes a document to integer field link.
[Route("api/doc-attr/doc-int-value/delete")]
[ApiController]
public class DeleteDocIntValueController : BaseStoredProcedureController
{
    public DeleteDocIntValueController(StoredProcedureService storedProcedureService, ILogger<DeleteDocIntValueController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost]
    public async Task<IActionResult> DeleteDocIntValue([FromBody] DeleteDocIntValueDto dto)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
            _logger.LogError("Validation errors: {Errors}", string.Join(", ", errors));
            return BadRequest(ModelState);
        }

        try
        {
            string decodedDocumentId = HttpUtility.UrlDecode(dto.documentId);
            var inputParameters = new Dictionary<string, object>
            {
                { "@documentid", decodedDocumentId },
                { "@docintnameid", dto.docIntNameId }
            };
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_DEL_doc_int_value", inputParameters);

            var response = new
            {
                transactionMessage = result.OutputParameters["@message"]?.ToString(),
                transactionStatus = result.OutputParameters["@transaction_status"]?.ToString()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "A SQL exception occurred while deleting document integer value.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while deleting document integer value.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }
}

public class DeleteDocIntValueDto
{
    public string? documentId { get; set; }
    public long docIntNameId { get; set; }
}
