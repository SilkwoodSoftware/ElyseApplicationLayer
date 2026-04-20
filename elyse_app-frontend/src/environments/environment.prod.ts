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

// Production environment configuration
// Backend URL is loaded from /assets/config.json at runtime

import { ConfigService } from '../app/config.service';

export const environment = {
    production: true,
    appName: 'Elyse® Application Frontend',
    version: '0.0.0',
    buildId: '20260421003316',
    license: 'Apache-2.0',
    get dotNetBaseUrl(): string {
        const configService = ConfigService.getInstance();
        if (!configService) {
            throw new Error('ConfigService not initialized');
        }
        return configService.getApiUrl();
    }
};