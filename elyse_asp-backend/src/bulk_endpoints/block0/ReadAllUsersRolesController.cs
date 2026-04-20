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

//Selects all records of user role permissions from the user_role_link table.
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using System.Data.SqlClient;

[Route("api/all-users-roles")]
[ApiController]
public class ReadAllUsersRolesController : BaseStoredProcedureController
{
    public ReadAllUsersRolesController(StoredProcedureService storedProcedureService, ILogger<ReadAllUsersRolesController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet]
    public async Task<IActionResult> GetAllUsersRoles()
    {
        try
        {
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("authorising.usp_SEL_all_user_roles", new Dictionary<string, object>());
            var usersRoles = result.ResultSets[0].Select(row => new {
                roleName = row["Role Name"]?.ToString(),
                userId = row["User ID"]?.ToString(),
                databaseUserName = row["Database Username"]?.ToString(),
                systemUserName = row["System Username"]?.ToString(),
                description = row["Description"]?.ToString()
            }).ToList();

            var response = new
            {
                usersRoles,
                transactionMessage = result.OutputParameters["@message"]?.ToString(),
                transactionStatus = result.OutputParameters["@transaction_status"]?.ToString(),
                numberOfRows = result.OutputParameters["@numrows"]?.ToString()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "A SQL exception occurred while retrieving all users roles.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while retrieving all users roles.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }
}
