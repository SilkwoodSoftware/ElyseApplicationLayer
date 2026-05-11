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

// Updates a radio button attribute linked to a file.
[Route("api/file-attr/file-radiob-link/update")]
[ApiController]
public class UpdateFileRadiobLinkController : BaseStoredProcedureController
{
    public UpdateFileRadiobLinkController(StoredProcedureService storedProcedureService, ILogger<UpdateFileRadiobLinkController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost]
    public async Task<IActionResult> UpdateFileRadiobLink([FromBody] FileRadiobLinkDto fileRadiobLinkDto)
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
                { "@fileid", fileRadiobLinkDto.fileId },
                { "@file_radioblistid", fileRadiobLinkDto.fileRadioButtonListId },
                { "@file_radiobattrid", fileRadiobLinkDto.fileRadioButtonAttributeId }
            };
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_UPD_file_radiob_link", inputParameters);

            var response = new
            {
                transactionMessage = result.OutputParameters["@message"]?.ToString(),
                transactionStatus = result.OutputParameters["@transaction_status"]?.ToString()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "A SQL exception occurred while updating file radio button link.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while updating file radio button link.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }
}
