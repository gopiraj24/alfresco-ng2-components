/*!
 * @license
 * Copyright 2016 Alfresco Software, Ltd.
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

import { Injectable } from '@angular/core';
import { AlfrescoApiService, AppConfigService, LogService } from '@alfresco/adf-core';
import { TaskQueryCloudRequestModel } from '../models/filter-cloud.model';
import { Observable, from, throwError } from 'rxjs';

@Injectable()
export class TaskListCloudService {

    constructor(private apiService: AlfrescoApiService,
                private appConfigService: AppConfigService,
                private logService: LogService) {
    }

    contentTypes = ['application/json'];
    accepts = ['application/json'];

    getTaskByRequest(requestNode: TaskQueryCloudRequestModel): Observable<any> {
        if (requestNode.appName) {
            let queryUrl = this.buildQueryUrl(requestNode);
            let queryParams = this.buildQueryParams(requestNode);
            return from(this.apiService.getInstance()
                .oauth2Auth.callCustomApi(queryUrl, 'GET',
                    null, queryParams, null,
                    null, null, null, ['application/json'],
                    ['application/json'], Object, null, null)
            );
        } else {
            this.logService.error('Appname is mandatory for querying task');
            return throwError('Appname not configured');
        }
    }

    private buildQueryUrl(requestNode: TaskQueryCloudRequestModel) {
        return `${this.appConfigService.get('backend')}/${requestNode.appName}-query/v1/tasks`;
    }

    private buildQueryParams(requestNode: TaskQueryCloudRequestModel) {
        let queryParam = {};
        for (let property in requestNode) {
            if (requestNode.hasOwnProperty(property) && property !== 'appName' &&
                (requestNode[property] !== null || requestNode[property] !== undefined) ) {
                queryParam[property] = requestNode[property];
            }
        }
        return queryParam;
    }
}
