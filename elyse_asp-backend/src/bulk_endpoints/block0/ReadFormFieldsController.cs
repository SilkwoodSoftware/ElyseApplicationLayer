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

[Route("api/forms")]
[ApiController]
public class ReadFormFieldsController : BaseStoredProcedureController
{
    public ReadFormFieldsController(StoredProcedureService storedProcedureService, ILogger<ReadFormFieldsController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("all-form-fields")]
    public async Task<IActionResult> GetAllFormFields([FromQuery] long? formId = null)
    {
        try
        {
            var inputParameters = new Dictionary<string, object> { { "@formid", formId ?? (object)DBNull.Value } };
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_all_form_fields", inputParameters);
            var formFieldsData = result.ResultSets[0];
            var transactionMessage = GetOutputParameterValue(result, "@message");
            var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
            var numberOfRows = GetOutputParameterValue(result, "@numrows");
            var outputFormId = GetOutputParameterValue(result, "@outputformid");
            var formName = GetOutputParameterValue(result, "@formname");

            var response = new
            {
                formFieldsData,
                transactionMessage,
                transactionStatus,
                numberOfRows,
                outputFormId,
                formName
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "A SQL exception occurred while retrieving all form fields for form ID {formId}.", formId);
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while retrieving all form fields for form ID {formId}.", formId);
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }
}
