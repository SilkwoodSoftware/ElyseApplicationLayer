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

// Validates the ID of a document.  Returns "Pass" or "Fail". 

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using System.Data.SqlClient;

[Route("api/document")]
[ApiController]
public class ValidateDocumentIdController : BaseStoredProcedureController
{
    public ValidateDocumentIdController(StoredProcedureService storedProcedureService, ILogger<ValidateDocumentIdController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("validate-document-id")]
    public async Task<IActionResult> ValidateDocumentId(string documentId)
    {
        try
        {
             var inputParameters = new Dictionary<string, object>
            {
                { "@documentid", documentId }
            };
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_VALIDATE_document_id", inputParameters);
            var transactionMessage = GetOutputParameterValue(result, "@message");
            var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
            var validationResult = GetOutputParameterValue(result, "@validation_result");  

            var response = new
            {
                transactionMessage,
                transactionStatus,
                validationResult
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "A SQL exception occurred while validating document ID {documentId}.", documentId);
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while validating document ID {documentId}.", documentId);
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }
}
