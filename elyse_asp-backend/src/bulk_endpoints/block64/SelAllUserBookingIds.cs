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

// Selects all user booking IDs.
[Route("api/booking/all-user-booking-ids")]
[ApiController]
public class SelAllUserBookingIds : BaseStoredProcedureController
{
    public SelAllUserBookingIds(StoredProcedureService storedProcedureService, ILogger<SelAllUserBookingIds> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read()
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading all user booking IDs",
            async () =>
            {
                var parameters = new Dictionary<string, object>();
                return await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_SEL_all_user_booking_ids", parameters);
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
