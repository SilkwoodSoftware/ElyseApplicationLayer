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
using System.Linq;
using System.Data.SqlClient;
using System.Web;

[Route("api/doc-attr/doc-text-value")]
[ApiController]
public class CreateDocTextValueController : BaseStoredProcedureController
{
    public CreateDocTextValueController(StoredProcedureService storedProcedureService, ILogger<CreateDocTextValueController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("insert")]
    public async Task<IActionResult> CreateDocTextValue([FromBody] DocTextValueDto docTextValueDto)
    {
        try
        {
            string decodedDocumentId = HttpUtility.UrlDecode(docTextValueDto.documentId);
            var inputParameters = new Dictionary<string, object>
            {
                { "@documentid", decodedDocumentId },
                { "@doctextnameid", docTextValueDto.docTextNameId },
                { "@textvalue", docTextValueDto.docTextValue ?? (object)DBNull.Value }
            };
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_INS_doc_text_value", inputParameters);

            var response = new
            {
                transactionMessage = result.OutputParameters["@message"]?.ToString(),
                transactionStatus = result.OutputParameters["@transaction_status"]?.ToString()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "A SQL exception occurred while creating document text value.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while creating document text value.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }
}
