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

// Updates a document date field value.
[Route("api/doc-attr/doc-date-value/update")]
[ApiController]
public class UpdateDocDateValueController : BaseStoredProcedureController
{
    public UpdateDocDateValueController(StoredProcedureService storedProcedureService, ILogger<UpdateDocDateValueController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost]
    public async Task<IActionResult> UpdateDocDateValue([FromBody] DocDateValueDto docDateValueDto)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
            _logger.LogError("Validation errors: {Errors}", string.Join(", ", errors));
            return BadRequest(ModelState);
        }

        try
        {
            var inputParameters = new Dictionary<string, object>
            {
                { "@documentid", docDateValueDto.documentId },
                { "@docdatenameid", docDateValueDto.docDateNameId },
                { "@datevalue", docDateValueDto.docDateValue }
            };
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_UPD_doc_date_value", inputParameters);

            var response = new
            {
                transactionMessage = result.OutputParameters["@message"]?.ToString(),
                transactionStatus = result.OutputParameters["@transaction_status"]?.ToString()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "A SQL exception occurred while updating document date value.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while updating document date value.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }
}
