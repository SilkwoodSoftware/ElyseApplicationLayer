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
using System.IO;

[Route("api/file")]
[ApiController]
public class ReadFileController : BaseStoredProcedureController
{
    public ReadFileController(StoredProcedureService storedProcedureService, ILogger<ReadFileController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("download")]
    public async Task<IActionResult> DownloadFile([FromQuery] long id)
    {
        try
        {
            var inputParameters = new Dictionary<string, object> { { "@fileid", id } };
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_file", inputParameters);

            var fileContent = result.ResultSets[0].FirstOrDefault();
            var fileContentBytes = (byte[])fileContent["File Content"];
            var fileName = GetOutputParameterValue(result, "@filename");
            var message = GetOutputParameterValue(result, "@message");
            var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

            return Ok(new { 
                fileName = fileName, 
                FileContent = Convert.ToBase64String(fileContentBytes),
                Message = message,
                TransactionStatus = transactionStatus
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while retrieving file.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }

     [HttpGet("list-all-files")]
    public async Task<IActionResult> GetAllFilesData([FromQuery] long? formId = null)
    {
        try
        {
            var inputParameters = new Dictionary<string, object> { { "@formid", formId ?? (object)DBNull.Value } };
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_all_files", inputParameters);
            var fileData = result.ResultSets[0];
            var transactionMessage = GetOutputParameterValue(result, "@message");
            var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
            var numberOfRows = GetOutputParameterValue(result, "@numrows");
            var numberOfFiles = GetOutputParameterValue(result, "@numfiles");             
            var outputFormId = GetOutputParameterValue(result, "@outputformid"); 
            var formName = GetOutputParameterValue(result, "@formname"); 

            var transformedFilesData = TransformFilesData(fileData);
            var tooltips = ExtractTooltips(fileData);


             var response = new
             {
                 fileData = transformedFilesData,
                 transactionMessage,
                 transactionStatus,
                 numberOfRows,
                 numberOfFiles,
                 outputFormId,
                 formName,
                 tooltips
             };

            return Ok(response);
        }
        catch (SqlException ex)
        {
             _logger.LogError(ex, "A SQL exception occurred while retrieving all files data for form ID {formId}.", formId);
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while retrieving all files data for form ID {formId}.", formId);
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }
     
}    
