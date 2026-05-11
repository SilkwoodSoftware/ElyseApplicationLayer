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
using System.Threading.Tasks;

[Route("api/document/common-object")]
[ApiController]
public class SelectDocCommonObjectMultiSelectLinkByDoc : BaseStoredProcedureController
{
    public SelectDocCommonObjectMultiSelectLinkByDoc(StoredProcedureService storedProcedureService, ILogger<SelectDocCommonObjectMultiSelectLinkByDoc> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("multi-select")]
    public async Task<IActionResult> GetDocCommonObjectMultiSelectLinkByDoc(string documentId)
    {
        try
        {
            var inputParameters = new Dictionary<string, object>
            {
                { "@documentid", documentId }
            };

            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_dc_cm_obj_ms_lnk_by_dc", inputParameters);
            var linksData = result.ResultSets.Count > 0 ? result.ResultSets[0] : new List<Dictionary<string, object>>();
            var transactionMessage = GetOutputParameterValue(result, "@message");
            var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

            var response = new
            {
                linksData,
                transactionMessage,
                transactionStatus
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "A SQL exception occurred while retrieving multi-select links for document ID {documentId}.", documentId);
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while retrieving multi-select links for document ID {documentId}.", documentId);
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }
}
