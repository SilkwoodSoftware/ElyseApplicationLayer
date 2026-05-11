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

[Route("api/file-attr/")]
[ApiController]
public class FileMultiSelectLinkController : BaseStoredProcedureController
{
    public FileMultiSelectLinkController(StoredProcedureService storedProcedureService, ILogger<FileMultiSelectLinkController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

//Inserts a file to multi-select attribute link.

    [HttpPost("file-multi-select-link/insert")]
    public async Task<IActionResult> InsertFileMultiSelectLink([FromBody] FileMultiSelectLinkDto fileMultiSelectLinkDto)
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
                { "@fileid", fileMultiSelectLinkDto.fileId },
                { "@filemslistid", fileMultiSelectLinkDto.fileMultiSelectListId },
                { "@filemsattrid", fileMultiSelectLinkDto.fileMultiSelectAttributeId }
            };
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_INS_file_multi_select_link", inputParameters);

            var response = new
            {
                transactionMessage = result.OutputParameters["@message"]?.ToString(),
                transactionStatus = result.OutputParameters["@transaction_status"]?.ToString()
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while inserting file multi-select link.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }


//Deletes a file to multi-select attribute link.

    [HttpPost("file-multi-select-link/delete")]
    public async Task<IActionResult> DeleteFileMultiSelectLink([FromBody] DeleteFileMultiSelectLinkDto dto)
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
                { "@fileid", dto.fileId },
                { "@filemslistid", dto.fileMultiSelectListId },
                { "@filemsattrid", dto.fileMultiSelectAttributeId }
            };
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_DEL_file_multi_select_link", inputParameters);

            var response = new
            {
                transactionMessage = result.OutputParameters["@message"]?.ToString(),
                transactionStatus = result.OutputParameters["@transaction_status"]?.ToString()
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while deleting file multi-select link.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }
}

//   
//    [HttpGet("read-by-list")]
//    public async Task<IActionResult> ReadFileMultiSelectAttributes([FromQuery] long fileMultiSelectListId)
//    {
//        try
//        {
//            var inputParameters = new Dictionary<string, object>
//            {
//                { "@file_mslistid", fileMultiSelectListId }
//            };
//            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_file_ms_attr_by_list", inputParameters);

//            var fileMultiSelectAttributes = result.ResultSets[0];

//            var response = new
//            {
//                fileMultiSelectAttributes,
//                transactionMessage = result.OutputParameters["@message"]?.ToString(),
//                transactionStatus = result.OutputParameters["@transaction_status"]?.ToString()
//            };

//            return Ok(response);
//        }
//        catch (Exception ex)
//        {
//            _logger.LogError(ex, "An exception occurred while reading file multi-select attributes.");
//            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
//        }
//    }
//}

public class DeleteFileMultiSelectLinkDto
{
    public long fileId { get; set; }
    public long fileMultiSelectListId { get; set; }
    public long fileMultiSelectAttributeId { get; set; }
}
