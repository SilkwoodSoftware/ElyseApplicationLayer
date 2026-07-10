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
using System.Collections.Generic;
using System.Threading.Tasks;

// Lists all of the controller level document groups that the connected user has rights to.
[Route("api/user/controller/document-group/restricted")]
[ApiController]
public class ReadControllerDocGroupsRestricted : BaseStoredProcedureController
{
    public ReadControllerDocGroupsRestricted(StoredProcedureService storedProcedureService, ILogger<ReadControllerDocGroupsRestricted> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read()
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading controller document groups restricted",
            async () =>
            {
                var parameters = new Dictionary<string, object>();

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_SEL_contr_doc_groups_restr", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numRows = GetOutputParameterValue(result, "@numrows");

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    numRows,
                    resultSets = result.ResultSets
                };

                return Ok(response);
            });
    }
}
