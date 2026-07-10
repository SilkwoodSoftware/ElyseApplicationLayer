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
    // Lists all common objects for a given list.
    [Route("api/com-obj/read-by-list")]
    [ApiController]
    public class ReadComObjByListController : BaseStoredProcedureController
    {
        public ReadComObjByListController(StoredProcedureService storedProcedureService, ILogger<ReadComObjByListController> logger)
            : base(storedProcedureService, logger, null)
        {
        }

        [HttpGet]
        public async Task<IActionResult> ReadComObjByList([FromQuery] long commonObjectListId)
        {
            try
            {
                var inputParameters = new Dictionary<string, object>
                {
                    { "@commonobjlistid", commonObjectListId }
                };
                var result = await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_com_obj_by_list", inputParameters);

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
                _logger.LogError(ex, "A SQL exception occurred while reading common objects by list.");
                return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An exception occurred while reading common objects by list.");
                return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
            }
        }
    }
}
    
