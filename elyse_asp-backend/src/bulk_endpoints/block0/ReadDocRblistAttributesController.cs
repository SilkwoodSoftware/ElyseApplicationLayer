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

[Route("api/doc-attr/doc-rblist-attributes")]
[ApiController]
public class ReadDocRblistAttributesController : BaseStoredProcedureController
{
    public ReadDocRblistAttributesController(StoredProcedureService storedProcedureService, ILogger<ReadDocRblistAttributesController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")] public async Task<IActionResult> GetDocRblistAttributesByListId([FromQuery] long docRadioButtonListId)
    {
        try
        {
            var inputParameters = new Dictionary<string, object> { { "@doc_radioblistid", docRadioButtonListId } };
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_doc_radiob_attr_by_list", inputParameters);

            var dropDownOptions = result.ResultSets[0];

            var response = new
            {
                dropDownOptions,
                transactionMessage = result.OutputParameters["@message"]?.ToString(),
                transactionStatus = result.OutputParameters["@transaction_status"]?.ToString()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "A SQL exception occurred while retrieving document radio button list attributes.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while retrieving document radio button list attributes.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }
}
