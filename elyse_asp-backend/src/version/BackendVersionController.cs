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
using System.Reflection;

namespace elyse_asp_backend.Version
{
    [Route("api/backend-version")]
    [ApiController]
    public class BackendVersionController : ControllerBase
    {
        [HttpGet("read")]
        public IActionResult GetVersion()
        {
            var assembly = Assembly.GetExecutingAssembly();
            var metadata = assembly.GetCustomAttributes<AssemblyMetadataAttribute>();
            
            // Get version from assembly metadata
            var version = metadata.FirstOrDefault(a => a.Key == "Version")?.Value ?? "0.0.0";
            
            // Get build ID from assembly metadata
            var buildId = metadata.FirstOrDefault(a => a.Key == "BuildId")?.Value ?? "PLACEHOLDER_BUILD_ID";
            
            // Get license from assembly metadata
            var license = metadata.FirstOrDefault(a => a.Key == "License")?.Value ?? "Apache-2.0";
            
            // Return data in table format with Name and Value columns
            var response = new[]
            {
                new { Name = "Product", Value = "Elyse® Application Backend" },
                new { Name = "Version", Value = version },
                new { Name = "Build ID", Value = buildId },
                new { Name = "License", Value = license }
            };

            return Ok(response);
        }
    }
}
