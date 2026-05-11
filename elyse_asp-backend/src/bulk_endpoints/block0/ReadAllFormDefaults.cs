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

// Returns all of the defaults for a given form.
// If no form ID is supplied then the default will be used.

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using AutoMapper;

namespace elyse_asp_backend.Controllers
{
    [ApiController]
    public class ReadAllFormDefaults : BaseStoredProcedureController
    {
        public ReadAllFormDefaults(
            StoredProcedureService storedProcedureService,
            ILogger<ReadAllFormDefaults> logger,
            IMapper? mapper = null) : base(storedProcedureService, logger, mapper)
        {
        }

        [HttpGet]
        [Route("/api/form/default/read")]
        public async Task<IActionResult> Read([FromQuery] long? formId = null)
        {
            return await ExecuteWithErrorHandlingAsync(
                "reading form defaults",
                async () =>
                {
             var inputParameters = new Dictionary<string, object>
            {
                { "@formid", formId }
            };

                    var result = await _storedProcedureService.ExecuteStoredProcedureAsync(
                        "reading.usp_SEL_all_form_defaults",
                        inputParameters
                    );

                    var formDefaults = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                    var transactionMessage = GetOutputParameterValue(result, "@message");
                    var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                    var numRows = GetOutputParameterValue(result, "@numrows");

                    return new
                    {
                        formDefaults,
                        transactionMessage,
                        transactionStatus,
                        numRows
                    };
                },
                result => Ok(result)
            );
        }
    }
}
