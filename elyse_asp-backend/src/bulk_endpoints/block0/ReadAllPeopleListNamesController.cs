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

namespace Reading
{
    // Lists all people list name records.
    [Route("api/people-list-names/read-all")]
    [ApiController]
    public class ReadAllPeopleListNamesController : BaseStoredProcedureController
    {
        public ReadAllPeopleListNamesController(StoredProcedureService storedProcedureService, ILogger<ReadAllPeopleListNamesController> logger)
            : base(storedProcedureService, logger, null)
        {
        }

        [HttpGet]
        public async Task<IActionResult> ReadAllPeopleListNames()
        {
            try
            {
                var result = await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_SEL_all_people_list_names", new Dictionary<string, object>());

                var response = new
                {
                    dropDownOptions = result.ResultSets[0],
                    transactionMessage = result.OutputParameters["@message"]?.ToString(),
                    transactionStatus = result.OutputParameters["@transaction_status"]?.ToString()
                };

                return Ok(response);
            }
            catch (SqlException ex)
            {
                _logger.LogError(ex, "A SQL exception occurred while reading all people list names.");
                return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An exception occurred while reading all people list names.");
                return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
            }
        }
    }
}
    
