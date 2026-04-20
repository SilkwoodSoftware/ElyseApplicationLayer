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
using System.Data.SqlClient;

[Route("api/file")]
[ApiController]
public class ReadNumberOfAllFilesController : BaseStoredProcedureController
{
    public ReadNumberOfAllFilesController(StoredProcedureService storedProcedureService, ILogger<ReadNumberOfAllFilesController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("number-of-all-files")]
    public async Task<IActionResult> GetNumberOfAllFiles()
    {
        try
        {
            var inputParameters = new Dictionary<string, object>();
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_number_of_all_files", inputParameters);
            
            var transactionMessage = GetOutputParameterValue(result, "@message");
            var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
            var numberOfFiles = GetOutputParameterValue(result, "@numfiles");

            var response = new
            {
                transactionMessage,
                transactionStatus,
                numberOfFiles
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "A SQL exception occurred while retrieving the number of all files.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while retrieving the number of all files.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }
}
