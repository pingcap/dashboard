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


import { ModelRequestTargetNode } from './model-request-target-node';

/**
 * 
 * @export
 * @interface LogsearchTaskModel
 */
export interface LogsearchTaskModel {
    /**
     * 
     * @type {string}
     * @memberof LogsearchTaskModel
     */
    'error'?: string;
    /**
     * 
     * @type {number}
     * @memberof LogsearchTaskModel
     */
    'id'?: number;
    /**
     * 
     * @type {string}
     * @memberof LogsearchTaskModel
     */
    'log_store_path'?: string;
    /**
     * 
     * @type {number}
     * @memberof LogsearchTaskModel
     */
    'size'?: number;
    /**
     * 
     * @type {string}
     * @memberof LogsearchTaskModel
     */
    'slow_log_store_path'?: string;
    /**
     * 
     * @type {number}
     * @memberof LogsearchTaskModel
     */
    'state'?: number;
    /**
     * 
     * @type {ModelRequestTargetNode}
     * @memberof LogsearchTaskModel
     */
    'target'?: ModelRequestTargetNode;
    /**
     * 
     * @type {number}
     * @memberof LogsearchTaskModel
     */
    'task_group_id'?: number;
}

