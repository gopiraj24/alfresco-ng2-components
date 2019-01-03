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

import { Component, OnChanges, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { AbstractControl , FormGroup, FormBuilder } from '@angular/forms';
import { TaskFilterCloudModel, FilterActionType, TaskFilterProperties, FilterOptions } from './../models/filter-cloud.model';
import { TaskFilterCloudService } from '../services/task-filter-cloud.service';
import { MatDialog } from '@angular/material';
import { TaskFilterDialogCloudComponent } from './task-filter-dialog-cloud.component';
import { TranslationService } from '@alfresco/adf-core';
import { debounceTime, map } from 'rxjs/operators';
import { of, Observable } from 'rxjs';
import { AppsProcessCloudService } from '../../../app/services/apps-process-cloud.service';
import { ApplicationInstanceModel } from '../../../app/models/application-instance.model';
import moment = require('moment');

@Component({
  selector: 'adf-cloud-edit-task-filter',
  templateUrl: './edit-task-filter-cloud.component.html',
    styleUrls: ['./edit-task-filter-cloud.component.scss']
})
export class EditTaskFilterCloudComponent implements OnChanges {

    public static ACTION_SAVE = 'SAVE';
    public static ACTION_SAVE_AS = 'SAVE_AS';
    public static ACTION_DELETE = 'DELETE';
    public static MIN_VALUE = 1;
    public FORMAT_DATE: string = 'DD/MM/YYYY';

    @Input()
    appName: string;

    @Input()
    id: string;

    @Input()
    filterProperties = ['state', 'assignment', 'sort', 'order', 'page', 'size']; // default ['state', 'assignment', 'sort', 'order']

    @Input()
    toggleFilterActions = true ;

    /** Emitted when an task filter property changes. */
    @Output()
    filterChange: EventEmitter<TaskFilterCloudModel> = new EventEmitter();

    /** Emitted when an filter action occurs i.e Save, SaveAs, Delete. */
    @Output()
    action: EventEmitter<FilterActionType> = new EventEmitter();

    taskFilter: TaskFilterCloudModel;
    changedTaskFilter: TaskFilterCloudModel;

    columns = [
        {value: 'id', label: 'ID'},
        {value: 'name', label: 'NAME'},
        {value: 'createdDate', label: 'Created Date'},
        {value: 'priority', label: 'PRIORITY'},
        {value: 'processDefinitionId', label: 'PROCESS DEFINITION ID'}
      ];

    status = [
        {label: 'ALL', value: ''},
        {label: 'CREATED', value: 'CREATED'},
        {label: 'CANCELLED', value: 'CANCELLED'},
        {label: 'ASSIGNED', value: 'ASSIGNED'},
        {label: 'SUSPENDED', value: 'SUSPENDED'},
        {label: 'COMPLETED', value: 'COMPLETED'},
        {label: 'DELETED', value: 'DELETED'}
    ];

    directions = [
        { label: 'ASC', value: 'ASC' },
        { label: 'DESC', value: 'DESC' }
    ];

    formHasBeenChanged = false;
    editTaskFilterForm: FormGroup;
    taskFilterProperties: any[] = [];
    showFilterActions: boolean = false;

    constructor(
        private formBuilder: FormBuilder,
        public dialog: MatDialog,
        private translateService: TranslationService,
        private taskFilterCloudService: TaskFilterCloudService,
        private appsProcessCloudService: AppsProcessCloudService) {
        }

    ngOnChanges(changes: SimpleChanges) {
        const id = changes['id'];
        if (id && id.currentValue !== id.previousValue) {
            this.retrieveTaskFilter();
            this.initTaskFilterProperties(this.taskFilter);
            this.buildForm(this.taskFilterProperties);
        }
    }

    retrieveTaskFilter() {
        this.taskFilter = this.taskFilterCloudService.getTaskFilterById(this.appName, this.id);
    }

    buildForm(taskFilterProperties: TaskFilterProperties[]) {
        this.formHasBeenChanged = false;
        const formControllerKeys = this.getFormControllers(taskFilterProperties);
        this.editTaskFilterForm = this.formBuilder.group(formControllerKeys);
        this.onFilterChange();
    }

    getFormControllers(taskFilterProperties: TaskFilterProperties[]) {
        const properties = taskFilterProperties.map((property: TaskFilterProperties) => {
            return { [property.key]: property.value };
        });
        return properties.reduce(((result, current) => Object.assign(result, current)), {});
    }

    /**
     * Check for edit task filter form changes
     */
    onFilterChange() {
        this.editTaskFilterForm.valueChanges
        .pipe(debounceTime(500))
        .subscribe((formValues: TaskFilterCloudModel) => {
            this.changedTaskFilter = new TaskFilterCloudModel(Object.assign({}, this.taskFilter, formValues));
            this.formHasBeenChanged = !this.compareFilters(this.changedTaskFilter, this.taskFilter);
            if (this.isFormValid()) {
                this.filterChange.emit(this.changedTaskFilter);
            }
        });
    }

    initTaskFilterProperties(taskFilter: TaskFilterCloudModel) {
        if (this.filterProperties && this.filterProperties.length > 0) {
            const defaultProperties = this.defaultTaskFilterProperties(taskFilter);
            this.taskFilterProperties = defaultProperties.filter((filterProperty) => this.isValidSelection(this.filterProperties, filterProperty));
        }
    }

    private isValidSelection(filterProperties: string[], filterProperty: any): boolean {
        return filterProperties ? filterProperties.indexOf(filterProperty.key) >= 0 : true;
    }

    isFormValid() {
        return this.editTaskFilterForm.valid;
    }

    getPropertyController(property: TaskFilterProperties): AbstractControl {
        return this.editTaskFilterForm.get(property.key);
    }

    onDateChanged(newDateValue: any, dateProperty: TaskFilterProperties) {
        if (newDateValue) {
            let momentDate;

            if (typeof newDateValue === 'string') {
                momentDate = moment(newDateValue, this.FORMAT_DATE, true);
            } else {
                momentDate = newDateValue;
            }

            if (momentDate.isValid()) {
                this.getPropertyController(dateProperty).setValue(momentDate.toDate());
            } else {
                this.getPropertyController(dateProperty).setErrors({ invalid: true });
            }
        }
    }

    hasError(property: TaskFilterProperties): boolean {
        return this.getPropertyController(property).errors && this.getPropertyController(property).errors.invalid;
    }

    /**
     * Check if both filters are same
     */
    compareFilters(editedQuery, currentQuery): boolean {
        return JSON.stringify(editedQuery).toLowerCase() === JSON.stringify(currentQuery).toLowerCase();
    }

    getRunningApplications(): Observable<FilterOptions[]> {
        return this.appsProcessCloudService.getRunningApplications().pipe(
            map((applications: ApplicationInstanceModel[]) => {
                if (applications && applications.length > 0) {
                    let options: FilterOptions[] = [];
                    applications.map((application) => {
                        options.push({ label: application.name, value: application.name });
                    });
                    return options;
                }
            }));
    }

    onSave() {
        this.taskFilterCloudService.updateFilter(this.changedTaskFilter);
        this.action.emit({actionType: EditTaskFilterCloudComponent.ACTION_SAVE, id: this.changedTaskFilter.id});
    }

    onDelete() {
        this.taskFilterCloudService.deleteFilter(this.taskFilter);
        this.action.emit({actionType: EditTaskFilterCloudComponent.ACTION_DELETE, id: this.taskFilter.id});
    }

    onSaveAs() {
        const dialogRef = this.dialog.open(TaskFilterDialogCloudComponent, {
            data: {
                name: this.translateService.instant(this.taskFilter.name)
            },
            height: 'auto',
            minWidth: '30%'
        });
        dialogRef.afterClosed().subscribe( (result) => {
            if (result && result.action === TaskFilterDialogCloudComponent.ACTION_SAVE) {
                const filterId = Math.random().toString(36).substr(2, 9);
                const filterKey = this.getSanitizeFilterName(result.name);
                const newFilter = {
                                    name: result.name,
                                    icon: result.icon,
                                    id: filterId,
                                    key: 'custom-' + filterKey
                                };
                const filter = Object.assign({}, this.changedTaskFilter, newFilter);
                this.taskFilterCloudService.addFilter(filter);
                this.action.emit({actionType: EditTaskFilterCloudComponent.ACTION_SAVE_AS, id: filter.id});
            }
        });
    }

    getSanitizeFilterName(filterName) {
        const nameWithHyphen = this.replaceSpaceWithHyphen(filterName.trim());
        return nameWithHyphen.toLowerCase();
    }

    replaceSpaceWithHyphen(name) {
        const regExt = new RegExp(' ', 'g');
        return name.replace(regExt, '-');
    }

    onExpand() {
        this.showFilterActions = true;
    }

    onClose() {
        this.showFilterActions = false;
    }

    isDateType(property: TaskFilterProperties) {
        return property.type === 'date';
    }

    isSelectType(property: TaskFilterProperties) {
        return property.type === 'select';
    }

    isTextType(property: TaskFilterProperties) {
        return property.type === 'text';
    }

    defaultTaskFilterProperties(currentTaskFilter: TaskFilterCloudModel) {
        return [
            new TaskFilterProperties({
                label: 'ADF_CLOUD_EDIT_TASK_FILTER.LABEL.STATUS',
                type: 'select',
                key: 'state',
                value: currentTaskFilter.state || '',
                options: of(this.status)
            }),
            new TaskFilterProperties({
                label: 'ADF_CLOUD_EDIT_TASK_FILTER.LABEL.ASSIGNMENT',
                type: 'text',
                key: 'assignment',
                value: currentTaskFilter.assignment || ''
            }),
            new TaskFilterProperties({
                label: 'ADF_CLOUD_EDIT_TASK_FILTER.LABEL.APP_NAME',
                type: 'select',
                key: 'appName',
                value: currentTaskFilter.appName || '',
                options: this.getRunningApplications()
            }),
            new TaskFilterProperties({
                label: 'ADF_CLOUD_EDIT_TASK_FILTER.LABEL.PROCESS_DEF_ID',
                type: 'text',
                key: 'processDefinitionId',
                value: currentTaskFilter.processDefinitionId || ''
            }),
            new TaskFilterProperties({
                label: 'ADF_CLOUD_EDIT_TASK_FILTER.LABEL.COLUMN',
                type: 'select',
                key: 'sort',
                value: currentTaskFilter.sort || this.columns[0],
                options: of(this.columns)
            }),
            new TaskFilterProperties({
                label: 'ADF_CLOUD_EDIT_TASK_FILTER.LABEL.DIRECTION',
                type: 'select',
                key: 'order',
                value: currentTaskFilter.order || this.directions[0],
                options: of(this.directions)
            }),
            new TaskFilterProperties({
                label: 'ADF_CLOUD_EDIT_TASK_FILTER.LABEL.PROCESS_INSTANCE_ID',
                type: 'text',
                key: 'processInstanceId',
                value: currentTaskFilter.processInstanceId || ''
            }),
            new TaskFilterProperties({
                label: 'ADF_CLOUD_EDIT_TASK_FILTER.LABEL.DUE_AFTER',
                type: 'date',
                key: 'dueAfter',
                value: currentTaskFilter.dueAfter || ''
            }),
            new TaskFilterProperties({
                label: 'ADF_CLOUD_EDIT_TASK_FILTER.LABEL.DUE_BEFORE',
                type: 'date',
                key: 'dueBefore',
                value: currentTaskFilter.dueBefore || ''
            }),
            new TaskFilterProperties({
                label: 'ADF_CLOUD_EDIT_TASK_FILTER.LABEL.CLAIMED_DATE_FROM',
                type: 'date',
                key: 'claimedDateFrom',
                value: currentTaskFilter.claimedDateFrom || ''
            }),
            new TaskFilterProperties({
                label: 'ADF_CLOUD_EDIT_TASK_FILTER.LABEL.CLAIMED_DATE_TO',
                type: 'date',
                key: 'claimedDateTo',
                value: currentTaskFilter.claimedDateTo || ''
            }),
            new TaskFilterProperties({
                label: 'ADF_CLOUD_EDIT_TASK_FILTER.LABEL.CREATED_DATE_FORM',
                type: 'date',
                key: 'createdDateFrom',
                value: currentTaskFilter.createdDateFrom || ''
            }),
            new TaskFilterProperties({
                label: 'ADF_CLOUD_EDIT_TASK_FILTER.LABEL.CREATED_DATE_TO',
                type: 'date',
                key: 'createdDateTo',
                value: currentTaskFilter.createdDateTo || ''
            }),
            new TaskFilterProperties({
                label: 'ADF_CLOUD_EDIT_TASK_FILTER.LABEL.TASK_NAME',
                type: 'text',
                key: 'taskName',
                value: currentTaskFilter.taskName || ''
            }),
            new TaskFilterProperties({
                label: 'ADF_CLOUD_EDIT_TASK_FILTER.LABEL.PARENT_TASK_ID',
                type: 'text',
                key: 'parentTaskId',
                value: currentTaskFilter.parentTaskId || ''
            }),
            new TaskFilterProperties({
                label: 'ADF_CLOUD_EDIT_TASK_FILTER.LABEL.PRIORITY',
                type: 'text',
                key: 'priority',
                value: currentTaskFilter.priority || ''
            }),
            new TaskFilterProperties({
                label: 'ADF_CLOUD_EDIT_TASK_FILTER.LABEL.STAND_ALONE',
                type: 'text',
                key: 'standAlone',
                value: currentTaskFilter.standAlone || ''
            }),

            new TaskFilterProperties({
                label: 'ADF_CLOUD_EDIT_TASK_FILTER.LABEL.LAST_MODIFIED_FROM',
                type: 'date',
                key: 'lastModifiedFrom',
                value: currentTaskFilter.lastModifiedFrom || ''
            }),

            new TaskFilterProperties({
                label: 'ADF_CLOUD_EDIT_TASK_FILTER.LABEL.LAST_MODIFIED_TO',
                type: 'date',
                key: 'lastModifiedTo',
                value: currentTaskFilter.lastModifiedTo || ''
            }),
            new TaskFilterProperties({
                label: 'ADF_CLOUD_EDIT_TASK_FILTER.LABEL.OWNER',
                type: 'text',
                key: 'owner',
                value: currentTaskFilter.owner || ''
            }),
            new TaskFilterProperties({
                label: 'ADF_CLOUD_EDIT_TASK_FILTER.LABEL.DUE_DATE_FROM',
                type: 'text',
                key: 'dueDateFrom',
                value: currentTaskFilter.dueDateFrom || ''
            }),
            new TaskFilterProperties({
                label: 'ADF_CLOUD_EDIT_TASK_FILTER.LABEL.DUE_DATE_TO',
                type: 'text',
                key: 'dueDateTo',
                value: currentTaskFilter.dueDateTo || ''
            })
        ];
    }
}
