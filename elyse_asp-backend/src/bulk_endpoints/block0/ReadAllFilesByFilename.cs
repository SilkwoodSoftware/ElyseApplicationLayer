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

// Selects file record data for files with a filename containing the given string.
// If no form ID is supplied then the default will be used.
// Does not apply a filter group.

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using System.Data.SqlClient;

[Route("api/file")]
[ApiController]
public class ReadFilesByFilenameController : BaseStoredProcedureController
{
    public ReadFilesByFilenameController(StoredProcedureService storedProcedureService, ILogger<ReadFilesByFilenameController> logger)
        : base(storedProcedureService, logger, null)
    {
    }


    [HttpGet("file-name/read")]
    public async Task<IActionResult> ReadFilesByFilename([FromQuery] string? likeString = "", [FromQuery] long? formId = null)
    {
        try
        {
             var inputParameters = new Dictionary<string, object>
            {
                { "@likestring", likeString },
                { "@formid", formId ?? (object)DBNull.Value }
            };
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_all_files_by_filename", inputParameters);
            var fileData = result.ResultSets.Count > 0 ? result.ResultSets[0] : new List<Dictionary<string, object>>();           
            var transactionMessage = GetOutputParameterValue(result, "@message");
            var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
            var numberOfRows = GetOutputParameterValue(result, "@numrows");
            var numberOfFiles = GetOutputParameterValue(result, "@numfiles");
            var tooltips = ExtractTooltips(fileData);     

            var transformedData = TransformFilesData(fileData);       

            var response = new
            {
                fileData = transformedData,
                transactionMessage,
                transactionStatus,
                numberOfRows,
                numberOfFiles,
                tooltips
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "A SQL exception occurred while retrieving files by filename.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while retrieving files by filename.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }  
}
