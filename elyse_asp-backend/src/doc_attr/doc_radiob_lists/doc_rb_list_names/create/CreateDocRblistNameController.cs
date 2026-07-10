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
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using System.Data.SqlClient;

[Route("api/doc-attr/doc-rblist-names/create")]
[ApiController]
public class CreateDocRblistNameController : BaseStoredProcedureController
{
    public CreateDocRblistNameController(StoredProcedureService storedProcedureService, ILogger<CreateDocRblistNameController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost]
    public async Task<IActionResult> CreateDocRblistNames([FromBody] CreateDocRblistNamesDto createDocRblistNamesDto)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
            _logger.LogError("Validation errors: {Errors}", string.Join(", ", errors));
            return BadRequest(ModelState);
        }

        try
        {
            // Convert 'Restricted'/'Not-Restricted' string to boolean for @restricted parameter
            bool? restrictedBool = null;
            if (!string.IsNullOrEmpty(createDocRblistNamesDto.restricted))
            {
                if (string.Equals(createDocRblistNamesDto.restricted, "Restricted", StringComparison.OrdinalIgnoreCase))
                {
                    restrictedBool = true;
                }
                else if (string.Equals(createDocRblistNamesDto.restricted, "Not-Restricted", StringComparison.OrdinalIgnoreCase))
                {
                    restrictedBool = false;
                }
            }

            var inputParameters = new Dictionary<string, object>
            {
                { "@mnemonic", createDocRblistNamesDto.mnemonic ?? (object)DBNull.Value },
                { "@attribute_name", createDocRblistNamesDto.attributeName ?? (object)DBNull.Value },
                { "@description", createDocRblistNamesDto.description ?? (object)DBNull.Value },
                { "@listposition", createDocRblistNamesDto.listPosition ?? (object)DBNull.Value },
                { "@restricted", restrictedBool ?? (object)DBNull.Value }
            };
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_INS_doc_radiob_list", inputParameters);

            var response = new
            {
                transactionMessage = result.OutputParameters["@message"]?.ToString(),
                transactionStatus = result.OutputParameters["@transaction_status"]?.ToString(),
                newRecordId = result.OutputParameters["@newrecordid"]?.ToString()
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
