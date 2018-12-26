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
    AfterViewInit, Directive, ElementRef, Input, OnChanges, OnDestroy, Renderer2, SimpleChanges
} from '@angular/core';
import { MinimalNodeEntryEntity } from 'alfresco-js-api';
import { DataCellEventModel } from '@alfresco/adf-core';
import { Subject, Subscription } from 'rxjs';

export interface NodeLockType {
    row: DataCellEventModel;
    actions: any[];
}

export interface NodeLockSubject {
    currentRow: Subject<NodeLockType>;
}

@Directive({
    selector: '[adf-document-node-lock]'
})
export class NodeLockDirective implements OnChanges, AfterViewInit, OnDestroy {

    /** Node to manage versions. */
    @Input('adf-document-node-lock')
    node: MinimalNodeEntryEntity;

    /** Node to manage versions. */
    @Input('parent')
    parent: NodeLockSubject = null;

    private subscriptions: Subscription[] = [];

    constructor(private elementRef: ElementRef,
                private renderer: Renderer2) {
    }

    updateElement() {
        if (this.parent) {
            this.subscriptions.push(
                this.parent.currentRow.subscribe(
                    (nodeWithAction: NodeLockType) => {
                        nodeWithAction.actions.forEach(
                            (x1) => x1.disabled = true
                        );
                        /* implement disabled logic */
                        nodeWithAction.row.actions = nodeWithAction.actions;
                    }
                )
            );
        } else {
            const isFolder = this.node && this.node.isFolder;
            this.renderer.setProperty(this.elementRef.nativeElement, 'disabled', isFolder);
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.node) {
            this.updateElement();
        }
    }

    ngAfterViewInit(): void {
        this.updateElement();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((s) => s.unsubscribe());
        this.subscriptions = [];
    }

}
