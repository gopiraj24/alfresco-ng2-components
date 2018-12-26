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
/* tslint:disable:no-input-rename  */

import {
    AfterViewInit, ChangeDetectorRef, Directive, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy,
    Output, Renderer2, SimpleChanges
} from '@angular/core';
import { MinimalNodeEntryEntity } from 'alfresco-js-api';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslationService } from '../services';
import { ContentService } from '../services/content.service';
import { PermissionsEnum } from '../models/permissions.enum';
import { DataCellEventModel } from '../datatable';

export interface NodePrivilege {
    currentRow: DataCellEventModel;
    actions: any[];
}

export interface NodePrivilegeSubject {
    currentRowEvents$: Subject<NodePrivilege>;
}

@Directive({
    selector: '[adf-node-privileges]'
})
export class NodePrivilegeDirective implements OnChanges, AfterViewInit, OnDestroy {

    /** Node to enable and disable based on the node privilege */
    @Input('adf-node-privileges')
    node: MinimalNodeEntryEntity;

    /** reference to the parent. will be removed in the future */
    @Input('parent')
    parent: NodePrivilegeSubject = null;

    /** emits event to update reload the document list */
    @Output()
    success: EventEmitter<MinimalNodeEntryEntity> = new EventEmitter<MinimalNodeEntryEntity>();

    /** comma separated actions such as Manage versions */
    @Input()
    actions: string = null;

    private nodeLockSubject$ = new Subject();

    constructor(private elementRef: ElementRef,
                private renderer: Renderer2,
                private translation: TranslationService,
                private contentService: ContentService,
                private changeDetector: ChangeDetectorRef) {}

    @HostListener('click', [ '$event' ])
    onClick(event) {
        event.preventDefault();
        this.success.emit(this.node);
    }

    ngAfterViewInit(): void {
        this.updateElement();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.node && !changes.node.firstChange) {
            this.updateElement();
        }
    }

    updateElement() {
        if (this.parent) {
            this.parent.currentRowEvents$.pipe(takeUntil(this.nodeLockSubject$))
                .subscribe((nodeWithAction: NodePrivilege) => {
                        if (nodeWithAction.currentRow.row['obj'] && nodeWithAction.currentRow.row['obj'].entry) {
                            this.disableActions(
                                nodeWithAction.actions,
                                nodeWithAction.currentRow.row['obj'].entry
                            );
                            nodeWithAction.currentRow.actions = nodeWithAction.actions;
                        }
                    }
                );

        } else {
            const isHavingPermission = this.havingVersionUpdatePermission(this.node);
            this.renderer.setProperty(this.elementRef.nativeElement, 'disabled', !isHavingPermission);
            this.changeDetector.detectChanges();
        }
    }

    public disableActions(actions: any[], node: MinimalNodeEntryEntity): any[] {
        if ( actions && actions instanceof Array) {
            actions.forEach((action) => {
                const translatedTitle = this.translation.instant(action.title);
                const isValid = this.actions.split(',').includes(translatedTitle);
                if (isValid) {
                    switch (translatedTitle) {
                        case 'Manage versions':
                            const writePermission = this.havingVersionUpdatePermission(node);
                            action.disabled = !writePermission;
                            break;
                        default:
                            break;
                    }
                }
            });
        }
        return actions;
    }

    private havingVersionUpdatePermission(node: MinimalNodeEntryEntity): boolean {
        return  node && node.isFile &&
                this.contentService.hasPermission(node, PermissionsEnum.UPDATE) &&
                this.havingWritePermission(node);
    }

    private havingWritePermission(node: MinimalNodeEntryEntity): boolean {
        return node.properties && node.properties.hasOwnProperty('cm:lockType') ? node.properties['cm:lockType'] === 'WRITE_LOCK' : !node.isLocked;
    }

    ngOnDestroy(): void {
        this.nodeLockSubject$.next();
        this.nodeLockSubject$.complete();
    }

}
