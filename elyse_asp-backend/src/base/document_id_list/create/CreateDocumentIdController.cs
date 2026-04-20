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
 /*  */

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using System.Data.SqlClient;
using System.Numerics;
using System.Web;

[Route("api/document-id")]
[ApiController]
public class CreateDocumentIdController : BaseStoredProcedureController
{
    public CreateDocumentIdController(StoredProcedureService storedProcedureService, ILogger<CreateDocumentIdController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> CreateDocumentId([FromBody] CreateDocumentIdDto createDocumentIdDto)
    {
        try
        {

                string decodedDocumentId = createDocumentIdDto.documentId != null
                 ? HttpUtility.UrlDecode(createDocumentIdDto.documentId)
                 : null;

            var inputParameters = new Dictionary<string, object>
            {
                { "@documentid", decodedDocumentId ?? (object)DBNull.Value },
                { "@transactiongroup", createDocumentIdDto.transactionGroupId ?? (object)DBNull.Value },
                { "@idlockstatus", createDocumentIdDto.idLockStatus ?? (object)DBNull.Value }
            };
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_INS_document_id", inputParameters);

            var response = new
            {
                transactionMessage = result.OutputParameters["@message"]?.ToString(),
                transactionStatus = result.OutputParameters["@transaction_status"]?.ToString(),
                newDocId = HttpUtility.UrlEncode(result.OutputParameters["@newdocumentid"]?.ToString())
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "A SQL exception occurred while creating document ID.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while creating document ID.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }
}
