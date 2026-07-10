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
    using System.Data.SqlClient;
    using System.Collections.Generic;
    using System.Linq;

    [Route("api/list-users")]
    [ApiController]
    public class SidListController : BaseStoredProcedureController
    {
        public SidListController(StoredProcedureService storedProcedureService, ILogger<SidListController> logger)
            : base(storedProcedureService, logger, null)
        {
        }

        [HttpGet]
        public async Task<IActionResult> GetAllSidList()
        {
            try
            {
                var result = await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_SEL_all_sid_list", new Dictionary<string, object>());
                var sidList = result.ResultSets[0].Select(row => row.ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value?.ToString() // Convert all values to string
            )).ToList();

                var transactionMessage = result.OutputParameters["@message"]?.ToString();
                var transactionStatus = result.OutputParameters["@transaction_status"]?.ToString();
                var numberOfRows = result.OutputParameters["@numrows"]?.ToString();

                var response = new
                {
                    sidList,
                    transactionMessage,
                    transactionStatus,
                    numberOfRows
                };

                return Ok(response);
            }
            catch (SqlException ex)
            {
                _logger.LogError(ex, "A SQL exception occurred while retrieving the SID list.");
                // Handle SQL exceptions
                return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An exception occurred while retrieving the SID list.");
                // Handle other exceptions
                return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
            }
        }
    }
