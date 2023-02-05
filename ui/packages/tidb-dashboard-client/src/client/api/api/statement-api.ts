/* tslint:disable */
/* eslint-disable */
/**
 * Dashboard API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 1.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


import globalAxios, { AxiosPromise, AxiosInstance, AxiosRequestConfig } from 'axios';
import { Configuration } from '../configuration';
// Some imports not used depending on template conditions
// @ts-ignore
import { DUMMY_BASE_URL, assertParamExists, setApiKeyToObject, setBasicAuthToObject, setBearerAuthToObject, setOAuthToObject, setSearchParams, serializeDataIfNeeded, toPathString, createRequestFunction } from '../common';
// @ts-ignore
import { BASE_PATH, COLLECTION_FORMATS, RequestArgs, BaseAPI, RequiredError } from '../base';
// @ts-ignore
import { RestErrorResponse } from '../models';
// @ts-ignore
import { StatementBinding } from '../models';
/**
 * StatementApi - axios parameter creator
 * @export
 */
export const StatementApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * 
         * @summary Drop all manually created bindings for a statement
         * @param {string} sqlDigest query template ID (a.k.a. sql digest)
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        statementsPlanBindingDelete: async (sqlDigest: string, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'sqlDigest' is not null or undefined
            assertParamExists('statementsPlanBindingDelete', 'sqlDigest', sqlDigest)
            const localVarPath = `/statements/plan/binding`;
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }

            const localVarRequestOptions = { method: 'DELETE', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            // authentication JwtAuth required
            await setApiKeyToObject(localVarHeaderParameter, "Authorization", configuration)

            if (sqlDigest !== undefined) {
                localVarQueryParameter['sql_digest'] = sqlDigest;
            }


    
            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * 
         * @summary Get the bound plan digest (if exists) of a statement
         * @param {string} sqlDigest query template id
         * @param {number} beginTime begin time
         * @param {number} endTime end time
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        statementsPlanBindingGet: async (sqlDigest: string, beginTime: number, endTime: number, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'sqlDigest' is not null or undefined
            assertParamExists('statementsPlanBindingGet', 'sqlDigest', sqlDigest)
            // verify required parameter 'beginTime' is not null or undefined
            assertParamExists('statementsPlanBindingGet', 'beginTime', beginTime)
            // verify required parameter 'endTime' is not null or undefined
            assertParamExists('statementsPlanBindingGet', 'endTime', endTime)
            const localVarPath = `/statements/plan/binding`;
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }

            const localVarRequestOptions = { method: 'GET', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            // authentication JwtAuth required
            await setApiKeyToObject(localVarHeaderParameter, "Authorization", configuration)

            if (sqlDigest !== undefined) {
                localVarQueryParameter['sql_digest'] = sqlDigest;
            }

            if (beginTime !== undefined) {
                localVarQueryParameter['begin_time'] = beginTime;
            }

            if (endTime !== undefined) {
                localVarQueryParameter['end_time'] = endTime;
            }


    
            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * 
         * @summary Create a binding for a statement and a plan
         * @param {string} planDigest plan digest id
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        statementsPlanBindingPost: async (planDigest: string, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'planDigest' is not null or undefined
            assertParamExists('statementsPlanBindingPost', 'planDigest', planDigest)
            const localVarPath = `/statements/plan/binding`;
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }

            const localVarRequestOptions = { method: 'POST', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            // authentication JwtAuth required
            await setApiKeyToObject(localVarHeaderParameter, "Authorization", configuration)

            if (planDigest !== undefined) {
                localVarQueryParameter['plan_digest'] = planDigest;
            }


    
            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    }
};

/**
 * StatementApi - functional programming interface
 * @export
 */
export const StatementApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = StatementApiAxiosParamCreator(configuration)
    return {
        /**
         * 
         * @summary Drop all manually created bindings for a statement
         * @param {string} sqlDigest query template ID (a.k.a. sql digest)
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async statementsPlanBindingDelete(sqlDigest: string, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<string>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.statementsPlanBindingDelete(sqlDigest, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * 
         * @summary Get the bound plan digest (if exists) of a statement
         * @param {string} sqlDigest query template id
         * @param {number} beginTime begin time
         * @param {number} endTime end time
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async statementsPlanBindingGet(sqlDigest: string, beginTime: number, endTime: number, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Array<StatementBinding>>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.statementsPlanBindingGet(sqlDigest, beginTime, endTime, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * 
         * @summary Create a binding for a statement and a plan
         * @param {string} planDigest plan digest id
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async statementsPlanBindingPost(planDigest: string, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<string>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.statementsPlanBindingPost(planDigest, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
    }
};

/**
 * StatementApi - factory interface
 * @export
 */
export const StatementApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    const localVarFp = StatementApiFp(configuration)
    return {
        /**
         * 
         * @summary Drop all manually created bindings for a statement
         * @param {string} sqlDigest query template ID (a.k.a. sql digest)
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        statementsPlanBindingDelete(sqlDigest: string, options?: any): AxiosPromise<string> {
            return localVarFp.statementsPlanBindingDelete(sqlDigest, options).then((request) => request(axios, basePath));
        },
        /**
         * 
         * @summary Get the bound plan digest (if exists) of a statement
         * @param {string} sqlDigest query template id
         * @param {number} beginTime begin time
         * @param {number} endTime end time
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        statementsPlanBindingGet(sqlDigest: string, beginTime: number, endTime: number, options?: any): AxiosPromise<Array<StatementBinding>> {
            return localVarFp.statementsPlanBindingGet(sqlDigest, beginTime, endTime, options).then((request) => request(axios, basePath));
        },
        /**
         * 
         * @summary Create a binding for a statement and a plan
         * @param {string} planDigest plan digest id
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        statementsPlanBindingPost(planDigest: string, options?: any): AxiosPromise<string> {
            return localVarFp.statementsPlanBindingPost(planDigest, options).then((request) => request(axios, basePath));
        },
    };
};

/**
 * Request parameters for statementsPlanBindingDelete operation in StatementApi.
 * @export
 * @interface StatementApiStatementsPlanBindingDeleteRequest
 */
export interface StatementApiStatementsPlanBindingDeleteRequest {
    /**
     * query template ID (a.k.a. sql digest)
     * @type {string}
     * @memberof StatementApiStatementsPlanBindingDelete
     */
    readonly sqlDigest: string
}

/**
 * Request parameters for statementsPlanBindingGet operation in StatementApi.
 * @export
 * @interface StatementApiStatementsPlanBindingGetRequest
 */
export interface StatementApiStatementsPlanBindingGetRequest {
    /**
     * query template id
     * @type {string}
     * @memberof StatementApiStatementsPlanBindingGet
     */
    readonly sqlDigest: string

    /**
     * begin time
     * @type {number}
     * @memberof StatementApiStatementsPlanBindingGet
     */
    readonly beginTime: number

    /**
     * end time
     * @type {number}
     * @memberof StatementApiStatementsPlanBindingGet
     */
    readonly endTime: number
}

/**
 * Request parameters for statementsPlanBindingPost operation in StatementApi.
 * @export
 * @interface StatementApiStatementsPlanBindingPostRequest
 */
export interface StatementApiStatementsPlanBindingPostRequest {
    /**
     * plan digest id
     * @type {string}
     * @memberof StatementApiStatementsPlanBindingPost
     */
    readonly planDigest: string
}

/**
 * StatementApi - object-oriented interface
 * @export
 * @class StatementApi
 * @extends {BaseAPI}
 */
export class StatementApi extends BaseAPI {
    /**
     * 
     * @summary Drop all manually created bindings for a statement
     * @param {StatementApiStatementsPlanBindingDeleteRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof StatementApi
     */
    public statementsPlanBindingDelete(requestParameters: StatementApiStatementsPlanBindingDeleteRequest, options?: AxiosRequestConfig) {
        return StatementApiFp(this.configuration).statementsPlanBindingDelete(requestParameters.sqlDigest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * 
     * @summary Get the bound plan digest (if exists) of a statement
     * @param {StatementApiStatementsPlanBindingGetRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof StatementApi
     */
    public statementsPlanBindingGet(requestParameters: StatementApiStatementsPlanBindingGetRequest, options?: AxiosRequestConfig) {
        return StatementApiFp(this.configuration).statementsPlanBindingGet(requestParameters.sqlDigest, requestParameters.beginTime, requestParameters.endTime, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * 
     * @summary Create a binding for a statement and a plan
     * @param {StatementApiStatementsPlanBindingPostRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof StatementApi
     */
    public statementsPlanBindingPost(requestParameters: StatementApiStatementsPlanBindingPostRequest, options?: AxiosRequestConfig) {
        return StatementApiFp(this.configuration).statementsPlanBindingPost(requestParameters.planDigest, options).then((request) => request(this.axios, this.basePath));
    }
}