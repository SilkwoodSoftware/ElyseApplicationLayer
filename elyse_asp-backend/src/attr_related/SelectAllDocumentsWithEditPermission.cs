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

[Route("api/document")]
[ApiController]
public class SelectAllDocumentsWithEditPermission : BaseStoredProcedureController
{
    public SelectAllDocumentsWithEditPermission(StoredProcedureService storedProcedureService, ILogger<SelectAllDocumentsWithEditPermission> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("edit-permission")]
    public async Task<IActionResult> GetAllDocumentsWithEditPermission()
    {
        try
        {
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_all_docs_with_ed_perm", new Dictionary<string, object>());
            var documentData = result.ResultSets.Count > 0 ? result.ResultSets[0] : new List<Dictionary<string, object>>();
            var transactionMessage = GetOutputParameterValue(result, "@message");
            var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
            
            var tooltips = ExtractTooltips(documentData);
            var transformedData = TransformDocumentData(documentData);

            var response = new
            {
                documentData = transformedData,
                transactionMessage,
                transactionStatus,
                tooltips
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "A SQL exception occurred while retrieving documents with edit permission.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while retrieving documents with edit permission.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }
}
