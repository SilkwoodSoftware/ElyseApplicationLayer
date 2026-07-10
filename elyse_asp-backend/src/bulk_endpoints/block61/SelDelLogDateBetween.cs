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
using System;

// Selects records from the file delete log where the delete date is between given dates.
[Route("api/del-log-date-between")]
[ApiController]
public class SelDelLogDateBetween : BaseStoredProcedureController
{
    public SelDelLogDateBetween(StoredProcedureService storedProcedureService, ILogger<SelDelLogDateBetween> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> GetDelLogDateBetween([FromQuery] string earlierDate, [FromQuery] string laterDate)
    {
        return await ExecuteWithErrorHandlingAsync(
            "retrieving delete log by date range",
            async () =>
            {
                // Parse date strings to DateTime without timezone conversion
                DateTime? parsedEarlierDate = null;
                if (!string.IsNullOrEmpty(earlierDate))
                {
                    if (DateTime.TryParse(earlierDate, out DateTime tempDate))
                    {
                        // Use only the date part to avoid timezone issues
                        parsedEarlierDate = tempDate.Date;
                    }
                }

                DateTime? parsedLaterDate = null;
                if (!string.IsNullOrEmpty(laterDate))
                {
                    if (DateTime.TryParse(laterDate, out DateTime tempDate))
                    {
                        // Use only the date part to avoid timezone issues
                        parsedLaterDate = tempDate.Date;
                    }
                }

                var parameters = new Dictionary<string, object>
                {
                    { "@earlier_date", parsedEarlierDate ?? (object)DBNull.Value },
                    { "@later_date", parsedLaterDate ?? (object)DBNull.Value }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_SEL_del_log_date_between", parameters);
            },
            result =>
            {
                var data = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numberOfRows = GetOutputParameterValue(result, "@numrows");
                var tooltips = ExtractTooltips(data);

                var response = new
                {
                    data,
                    transactionMessage,
                    transactionStatus,
                    numberOfRows,
                    tooltips
                };

                return Ok(response);
            });
    }
}
