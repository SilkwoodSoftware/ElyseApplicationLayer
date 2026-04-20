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
using System.Collections.Generic;
using System.Linq;
using System.Data.SqlClient;

[Route("api/user-roles")]
[ApiController]
public class UserRolesController : BaseStoredProcedureController
{
    public UserRolesController(StoredProcedureService storedProcedureService, ILogger<UserRolesController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet]
    public async Task<IActionResult> GetUserRoles()
    {
        try
        {
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_user_roles", new Dictionary<string, object>());
            var userRoles = result.ResultSets[0].Select(row => row.ToDictionary(
                kvp => kvp.Key,
                kvp => kvp.Value?.ToString() // Convert all values to string
            )).ToList();

            var response = new
            {
                userRoles,
                transactionMessage = result.OutputParameters["@message"]?.ToString(),
                transactionStatus = result.OutputParameters["@transaction_status"]?.ToString()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "A SQL exception occurred while retrieving user roles.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while retrieving user roles.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }
}
