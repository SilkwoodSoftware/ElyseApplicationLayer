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

// Updates a form to document common object radio button link.
[Route("api/form/doc/common-object/radio-button/link")]
[ApiController]
public class UpdateFormDocCommonObjectRadioButtonLink : BaseStoredProcedureController
{
    public UpdateFormDocCommonObjectRadioButtonLink(StoredProcedureService storedProcedureService, ILogger<UpdateFormDocCommonObjectRadioButtonLink> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateFormDocCommonObjectRadioButtonLinkRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating form document common object radio button link",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@formid", request.formId ?? (object)DBNull.Value },
                    { "@commonobjlistid", request.commonObjectListId ?? (object)DBNull.Value },
                    { "@ismandatory", request.isMandatory ?? (object)DBNull.Value },
                    { "@fieldlength", request.fieldLength ?? (object)DBNull.Value },
                    { "@formposition", request.formPosition ?? (object)DBNull.Value },
                    { "@attribute1", request.attribute1 ?? (object)DBNull.Value },
                    { "@attribute2", request.attribute2 ?? (object)DBNull.Value },
                    { "@attribute3", request.attribute3 ?? (object)DBNull.Value },
                    { "@defcommonobjid", request.defCommonObjId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_UPD_fm_dc_c_ob_rb_lnk", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}

public class UpdateFormDocCommonObjectRadioButtonLinkRequest
{
    public long? formId { get; set; }
    public long? commonObjectListId { get; set; }
    public string isMandatory { get; set; }
    public short? fieldLength { get; set; }
    public string formPosition { get; set; }
    public string attribute1 { get; set; }
    public string attribute2 { get; set; }
    public string attribute3 { get; set; }
    public long? defCommonObjId { get; set; }

}
