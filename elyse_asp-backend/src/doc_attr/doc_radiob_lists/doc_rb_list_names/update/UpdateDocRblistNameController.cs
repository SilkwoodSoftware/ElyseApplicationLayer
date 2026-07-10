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

[Route("api/doc-attr/doc-rblist-names/update")]
[ApiController]
public class UpdateDocRblistNameController : BaseStoredProcedureController
{
    public UpdateDocRblistNameController(StoredProcedureService storedProcedureService, ILogger<UpdateDocRblistNameController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost]
    public async Task<IActionResult> UpdateDocRblistNames([FromBody] UpdateDocRblistNamesDto updateDocRblistNamesDto)
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
                { "@recordid", updateDocRblistNamesDto.docRadioButtonListId ?? (object)DBNull.Value },
                { "@mnemonic", updateDocRblistNamesDto.mnemonic ?? (object)DBNull.Value },
                { "@attribute_name", updateDocRblistNamesDto.attributeName ?? (object)DBNull.Value },
                { "@description", updateDocRblistNamesDto.description ?? (object)DBNull.Value }
            };
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_UPD_doc_rb_list_text", inputParameters);

            var response = new
            {
                transactionMessage = result.OutputParameters["@message"]?.ToString(),
                transactionStatus = result.OutputParameters["@transaction_status"]?.ToString()                
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "A SQL exception occurred while creating document radio button list name.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while creating document radio button list name.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }
}
