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
import { Observable, from, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { IdentityUserModel } from '../models/identity-user.model';
import { JwtHelperService } from '../../services/jwt-helper.service';
import { AppConfigService } from '../../app-config/app-config.service';
import { AlfrescoApiService } from '../../services/alfresco-api.service';
import { IdentityRoleModel } from '../models/identity-role.model';

@Injectable({
    providedIn: 'root'
})
export class IdentityUserService {

    static USER_NAME = 'name';
    static FAMILY_NAME = 'family_name';
    static GIVEN_NAME = 'given_name';
    static USER_EMAIL = 'email';
    static USER_ACCESS_TOKEN = 'access_token';
    static USER_PREFERRED_USERNAME = 'preferred_username';

    constructor(
        private helper: JwtHelperService,
        private apiService: AlfrescoApiService,
        private appConfigService: AppConfigService) {}

    getCurrentUserInfo(): IdentityUserModel {
        const familyName = this.getValueFromToken<string>(IdentityUserService.FAMILY_NAME);
        const givenName = this.getValueFromToken<string>(IdentityUserService.GIVEN_NAME);
        const email = this.getValueFromToken<string>(IdentityUserService.USER_EMAIL);
        const username = this.getValueFromToken<string>(IdentityUserService.USER_PREFERRED_USERNAME);
        const user = { firstName: givenName, lastName: familyName, email: email, username: username };
        return new IdentityUserModel(user);
    }

    getValueFromToken<T>(key: string): T {
        let value;
        const token = localStorage.getItem(IdentityUserService.USER_ACCESS_TOKEN);
        if (token) {
            const tokenPayload = this.helper.decodeToken(token);
            value = tokenPayload[key];
        }
        return <T> value;
    }

    getApplicationRoleClientId(appName: string): Observable<string> {
        return of('39d1f2b9-de0e-48d6-98f2-00af9d25c9e1');
    }

    findUsersByName(search: string): Observable<any> {
        if (search === '') {
            return of([]);
        }
        const url = this.buildUserUrl();
        const httpMethod = 'GET', pathParams = {}, queryParams = {search: search}, bodyParam = {}, headerParams = {},
            formParams = {}, authNames = [], contentTypes = ['application/json'], accepts = ['application/json'];

        return (from(this.apiService.getInstance().oauth2Auth.callCustomApi(
                    url, httpMethod, pathParams, queryParams,
                    headerParams, formParams, bodyParam, authNames,
                    contentTypes, accepts, Object, null, null)
                ));
    }

    checkUserHasClientRoleMapping(userId: string, clientId: string): Observable<boolean> {
        const url = this.buildUserClientRoleMapping(userId, clientId);
        const httpMethod = 'GET', pathParams = {}, queryParams = {}, bodyParam = {}, headerParams = {},
            formParams = {}, authNames = [], contentTypes = ['application/json'], accepts = ['application/json'];

        return from(this.apiService.getInstance().oauth2Auth.callCustomApi(
                    url, httpMethod, pathParams, queryParams,
                    headerParams, formParams, bodyParam, authNames,
                    contentTypes, accepts, Object, null, null)
                ).pipe(
                    map((response: any) => {
                        if (response.length > 0) {
                            return (true);
                        }
                        return (false);
                    })
            );
    }

    getUsers(): Observable<IdentityUserModel[]> {
        const url = this.buildUserUrl();
        const httpMethod = 'GET', pathParams = {}, queryParams = {}, bodyParam = {}, headerParams = {},
            formParams = {}, authNames = [], contentTypes = ['application/json'], accepts = ['application/json'];

        return from(this.apiService.getInstance().oauth2Auth.callCustomApi(
                    url, httpMethod, pathParams, queryParams,
                    headerParams, formParams, bodyParam, authNames,
                    contentTypes, accepts, Object, null, null)
                ).pipe(
                    map((response: IdentityUserModel[]) => {
                        return response;
                    })
            );
    }

    getUserRoles(userId: string): Observable<IdentityRoleModel[]> {
        const url = this.buildRolesUrl(userId);
        const httpMethod = 'GET', pathParams = {}, queryParams = {}, bodyParam = {}, headerParams = {},
            formParams = {}, authNames = [], contentTypes = ['application/json'], accepts = ['application/json'];

        return from(this.apiService.getInstance().oauth2Auth.callCustomApi(
                    url, httpMethod, pathParams, queryParams,
                    headerParams, formParams, bodyParam, authNames,
                    contentTypes, accepts, Object, null, null)
                ).pipe(
                    map((response: IdentityRoleModel[]) => {
                        return response;
                    })
            );
    }

    async getUsersByRolesWithCurrentUser(roleNames: string[]): Promise<IdentityUserModel[]> {
        const filteredUsers: IdentityUserModel[] = [];
        if (roleNames && roleNames.length > 0) {
            const users = await this.getUsers().toPromise();

            for (let i = 0; i < users.length; i++) {
                const hasAnyRole = await this.userHasAnyRole(users[i].id, roleNames);
                if (hasAnyRole) {
                    filteredUsers.push(users[i]);
                }
            }
        }

        return filteredUsers;
    }

    async getUsersByRolesWithoutCurrentUser(roleNames: string[]): Promise<IdentityUserModel[]> {
        const filteredUsers: IdentityUserModel[] = [];
        if (roleNames && roleNames.length > 0) {
            const currentUser = this.getCurrentUserInfo();
            let users = await this.getUsers().toPromise();

            users = users.filter((user) => { return user.username !== currentUser.username; });

            for (let i = 0; i < users.length; i++) {
                const hasAnyRole = await this.userHasAnyRole(users[i].id, roleNames);
                if (hasAnyRole) {
                    filteredUsers.push(users[i]);
                }
            }
        }

        return filteredUsers;
    }

    private async userHasAnyRole(userId: string, roleNames: string[]): Promise<boolean> {
        const userRoles = await this.getUserRoles(userId).toPromise();
        const hasAnyRole = roleNames.some((roleName) => {
            const filteredRoles = userRoles.filter((userRole) => {
                return userRole.name.toLocaleLowerCase() === roleName.toLocaleLowerCase();
            });

            return filteredRoles.length > 0;
        });

        return hasAnyRole;
    }

    private buildUserUrl(): any {
        return `${this.appConfigService.get('bpmHost')}/auth/admin/realms/springboot/users`;
    }

    private buildUserClientRoleMapping(userId: string, clientId: string): any {
        return `${this.appConfigService.get('bpmHost')}/auth/admin/realms/springboot/users/${userId}/role-mappings/clients/${clientId}`;
    }

    private buildRolesUrl(userId: string): any {
        return `${this.appConfigService.get('bpmHost')}/auth/admin/realms/springboot/users/${userId}/role-mappings/realm/composite`;
    }

}
