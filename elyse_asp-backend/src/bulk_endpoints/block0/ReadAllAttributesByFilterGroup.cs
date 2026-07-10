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

// Selects all the attributes linked to a given filter group id.
// If no filter group ID is supplied then the default will be used.

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using AutoMapper;

namespace elyse_asp_backend.Controllers
{
    [ApiController]
    public class ReadAllFilterGroupAttr : BaseStoredProcedureController
    {
        public ReadAllFilterGroupAttr(
            StoredProcedureService storedProcedureService,
            ILogger<ReadAllFilterGroupAttr> logger,
            IMapper? mapper = null) : base(storedProcedureService, logger, mapper)
        {
        }

        [HttpGet]
        [Route("/api/filter-group/attribute/read")]
        public async Task<IActionResult> Read([FromQuery] long? filterGroupId = null)
        {
            return await ExecuteWithErrorHandlingAsync(
                "reading filter group attributes",
                async () =>
                {
                    var inputParameters = new Dictionary<string, object>();
                    if (filterGroupId.HasValue)
                    {
                        inputParameters.Add("@filtergroupid", filterGroupId.Value);
                    }

                    var result = await _storedProcedureService.ExecuteStoredProcedureAsync(
                        "reading.usp_SEL_all_filter_group_attr",
                        inputParameters
                    );

                    var filterGroupAttributes = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                    var transactionMessage = GetOutputParameterValue(result, "@message");
                    var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                    var numRows = GetOutputParameterValue(result, "@numrows");
                    var outputFilterGroupId = GetOutputParameterValue(result, "@outputfiltergroupid");
                    var filterGroupName = GetOutputParameterValue(result, "@filtergroupname");                    

                    return new
                    {
                        filterGroupAttributes,
                        transactionMessage,
                        transactionStatus,
                        outputFilterGroupId,
                        filterGroupName,                        
                        numRows
                    };
                },
                result => Ok(result)
            );
        }
    }
}
