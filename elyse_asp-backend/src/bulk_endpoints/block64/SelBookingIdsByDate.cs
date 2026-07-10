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
using System.Threading.Tasks;

// Selects booking IDs by date range.
[Route("api/booking/by-date")]
[ApiController]
public class SelBookingIdsByDate : BaseStoredProcedureController
{
    public SelBookingIdsByDate(StoredProcedureService storedProcedureService, ILogger<SelBookingIdsByDate> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] DateTime? earlierDate = null, [FromQuery] DateTime? laterDate = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading booking IDs by date",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@earlier_date", earlierDate ?? (object)DBNull.Value },
                    { "@later_date", laterDate ?? (object)DBNull.Value }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_SEL_booking_ids_by_date", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var bookingData = result.ResultSets.Count > 0 ? result.ResultSets[0] : new List<Dictionary<string, object>>();

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    bookingData
                };

                return Ok(response);
            });
    }
}
