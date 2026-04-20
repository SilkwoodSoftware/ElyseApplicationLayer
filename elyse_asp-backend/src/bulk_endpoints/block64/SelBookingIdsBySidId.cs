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

// Selects booking IDs by SID ID.
[Route("api/booking/by-sidid")]
[ApiController]
public class SelBookingIdsBySidId : BaseStoredProcedureController
{
    public SelBookingIdsBySidId(StoredProcedureService storedProcedureService, ILogger<SelBookingIdsBySidId> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long? userId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading booking IDs by SID ID",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@user_sid_id", userId ?? (object)DBNull.Value }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_SEL_booking_ids_by_sidid", parameters);
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
