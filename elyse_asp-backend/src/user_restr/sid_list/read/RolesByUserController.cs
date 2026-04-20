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

[Route("api/roles-by-user")]
[ApiController]
public class RolesByUserController : BaseStoredProcedureController
{
    public RolesByUserController(StoredProcedureService storedProcedureService, ILogger<RolesByUserController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet]
    public async Task<IActionResult> GetRolesByUser([FromQuery] long userId)
    {
        try
        {
            var inputParameters = new Dictionary<string, object> { { "@userid", userId } };
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("authorising.usp_SEL_roles_by_user", inputParameters);
            
            // Keep roles as string array for backward compatibility with existing ManageUserRolesComponent
            var roles = result.ResultSets[0].Select(row => row["Role Name"]?.ToString()).ToList();
            
            // Add rolesData as proper table structure for read-routes.csv table rendering
            var rolesData = result.ResultSets[0];

            var response = new
            {
                roles,           // String array - used by existing ManageUserRolesComponent
                rolesData,       // Object array - for table rendering via read-routes.csv
                transactionMessage = result.OutputParameters["@message"]?.ToString(),
                transactionStatus = result.OutputParameters["@transaction_status"]?.ToString()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "A SQL exception occurred while retrieving roles by user.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while retrieving roles by user.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }
}
