# Apache License 2.0 Developer Guide

This guide explains the Apache License 2.0 implementation in this project and provides guidance for developers contributing to or maintaining the codebase.

## Project License Overview

This project is licensed under Apache License 2.0. The main license file is located at [`LICENSE`](LICENSE) in the project root.

## Project Components

The project consists of multiple licensed components:
- **Frontend**: Angular application (`elyse_app-frontend/`) - Licensed under Apache 2.0
- **Backend**: ASP.NET Core application (`elyse_asp-backend/`) - Licensed under Apache 2.0
- **DAL**: Data Access Layer service (`elyse_asp-backend/DAL/`) - Licensed under Apache 2.0
- **Tests**: PowerShell test scripts (`test-backend/ps-tests/`) - Licensed under Apache 2.0

## License Headers

### When to Add License Headers

**DO add license headers to:**
- All new C# source files (`.cs`)
- All new TypeScript files (`.ts`)
- All new JavaScript files (`.js`)
- All new HTML template files (`.html`)
- All new PowerShell scripts (`.ps1`)
- All new CSS/SCSS files (`.css`, `.scss`)

**DO NOT add license headers to:**
- Configuration files (`package.json`, `*.csproj`, `tsconfig.json`, etc.)
- Generated files (anything in `bin/`, `obj/`, `node_modules/`, `.angular/`)
- Documentation files (`*.md`)
- Binary files
- Third-party code

### License Header Templates

License header templates are available in the [`license-templates/`](license-templates/) directory:

**For C# and TypeScript files:**
```csharp
/*
 * Copyright [YEAR] [YOUR ORGANIZATION NAME]
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
```

**For PowerShell files:**
```powershell
# Copyright [YEAR] [YOUR ORGANIZATION NAME]
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
```

**For HTML/XML files:**
```html
<!--
  Copyright [YEAR] [YOUR ORGANIZATION NAME]

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->
```

## For Contributors

### Contributing Code

- By contributing code to this project, you agree that your contributions will be licensed under Apache 2.0
- All new source files must include the appropriate license header
- Ensure your IDE doesn't strip license headers when formatting code
- When modifying existing files with license headers, preserve the headers

### Third-Party Dependencies

Before adding new dependencies:

1. **Check the dependency's license** to ensure Apache 2.0 compatibility
2. **Compatible licenses include**: MIT, BSD, Apache 2.0, ISC
3. **Incompatible licenses include**: GPL, LGPL (without linking exception), proprietary licenses
4. **When in doubt**, consult with project maintainers

### Package Configuration Files

The project's license is declared in:
- [`elyse_app-frontend/package.json`](elyse_app-frontend/package.json): `"license": "Apache-2.0"`
- [`elyse_asp-backend/elyse_asp-backend.csproj`](elyse_asp-backend/elyse_asp-backend.csproj): `<PackageLicenseExpression>Apache-2.0</PackageLicenseExpression>`
- [`elyse_asp-backend/DAL/DAL.csproj`](elyse_asp-backend/DAL/DAL.csproj): `<PackageLicenseExpression>Apache-2.0</PackageLicenseExpression>`

Do not modify these license declarations without approval from project maintainers.

## What Apache 2.0 License Means

### For Users
- Can use the software for any purpose
- Can modify the software
- Can distribute the software
- Can distribute modified versions
- Must include license and copyright notice
- Must state changes if modifying the software

### For Developers
- Must preserve copyright notices
- Must include license text in distributions
- Can combine with other Apache 2.0 or compatible licensed code
- Cannot use project's trademarks without permission

## Legal Notices

### Copyright
Copyright is held by the organization specified in the license headers and project configuration files.

### Trademark Notice
Any trademarks mentioned in this project are the property of their respective owners.

### Warranty Disclaimer
This software is provided "AS IS" without warranty of any kind. See the full license text for details.

## Maintenance Tasks

### Annual Updates
- Update copyright year in license headers as needed
- Review and audit third-party dependency licenses
- Update this guide if licensing practices change

### When Adding New Components
- Ensure new project files include appropriate license configuration
- Add license headers to all new source files using the templates provided
- Update build processes to preserve license information

## Questions?

For license-related questions, contact the project maintainers or refer to the official Apache License 2.0 documentation at https://www.apache.org/licenses/LICENSE-2.0.

---

*This guide provides general guidance for maintaining Apache 2.0 license compliance in this project.*