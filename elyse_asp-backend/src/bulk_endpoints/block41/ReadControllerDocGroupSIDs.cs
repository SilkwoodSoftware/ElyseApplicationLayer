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

// Lists all of the users for a given controller level document group.
[Route("api/user/controller/document-group/sid")]
[ApiController]
public class ReadControllerDocGroupSIDs : BaseStoredProcedureController
{
    public ReadControllerDocGroupSIDs(StoredProcedureService storedProcedureService, ILogger<ReadControllerDocGroupSIDs> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long? controllerDocEditGroupNameId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading controller document group SIDs",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@contr_doc_ed_grp_name_id", controllerDocEditGroupNameId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("authorising.usp_SEL_contr_doc_group_sids", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numRecords = GetOutputParameterValue(result, "@numrecords");

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    numRecords,
                    resultSets = result.ResultSets
                };

                return Ok(response);
            });
    }
}
