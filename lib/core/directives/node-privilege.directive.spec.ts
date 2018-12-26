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

import { Component, DebugElement, SimpleChange, ViewChild } from '@angular/core';
import { NodePrivilege, NodePrivilegeDirective, NodePrivilegeSubject } from './node-privilege.directive';
import { Subject } from 'rxjs';
import { ContentService } from '../services';
import { setupTestBed } from '../testing';
import { CoreModule } from '../core.module';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DataCellEventModel } from '../datatable';

@Component({
    selector: 'adf-test-list',
    template: `<adf-test-privilege adf-node-privileges [parent]="parentInstance" #parentInstance></adf-test-privilege>`
})
class TestComponent {
    @ViewChild('parentInstance') parent: Test1Component;
}

@Component({
    selector: 'adf-test-privilege',
    template: ''
})
class Test1Component implements NodePrivilegeSubject {
    currentRowEvents$: Subject<NodePrivilege> = new Subject();
    constructor() {}
}

@Component({
    selector: 'adf-test-node-privilege',
    template: '<button [adf-node-privileges]="node">button</button>'
})
class Test2Component {
    node = null;
}

class MockContentService extends ContentService {
    constructor() {
        super(null, null, null, null);
    }
}

describe('NodePrivilegeDirective', () => {

    let fixture: ComponentFixture<TestComponent>;
    let fixture2: ComponentFixture<Test2Component>;
    let component: TestComponent;
    let component2: Test2Component;
    let element: DebugElement;
    let directiveInstance: NodePrivilegeDirective;

    setupTestBed({
        imports: [
            CoreModule.forRoot(),
            NoopAnimationsModule
        ],
        declarations: [
            Test1Component,
            Test2Component,
            TestComponent
        ],
        providers: [
            {
                provide: ContentService,
                useClass: MockContentService
            }
        ]
    });

    describe('HTML nativeElement with Directive', () => {

        let button: DebugElement;

        beforeEach(() => {
            fixture2 = TestBed.createComponent(Test2Component);
            component2 = fixture2.componentInstance;

            element = fixture2.debugElement.query(By.directive(NodePrivilegeDirective));
            directiveInstance = element.injector.get(NodePrivilegeDirective);

            button = fixture2.debugElement.query(By.css('button'));
        });

        it('updates element once it is loaded', () => {
            spyOn(directiveInstance, 'updateElement').and.stub();

            const node = [{}, {}];
            const change = new SimpleChange([], node, false);
            directiveInstance.ngOnChanges({ node: change });

            expect(directiveInstance.updateElement).toHaveBeenCalled();
        });

        it('updates element on node change', () => {
            spyOn(directiveInstance, 'updateElement').and.stub();

            const node = [{}, {}];
            const change = new SimpleChange([], node, false);
            directiveInstance.ngOnChanges({ node: change });

            expect(directiveInstance.updateElement).toHaveBeenCalled();
        });

        it('updates element only on subsequent change', () => {
            spyOn(directiveInstance, 'updateElement').and.stub();

            const node = [{}, {}];
            const change = new SimpleChange([], node, true);
            directiveInstance.ngOnChanges({ node: change });

            expect(directiveInstance.updateElement).not.toHaveBeenCalled();
        });

        it('should disable the element in the actions when node having read lock', () => {
            directiveInstance.actions = 'Manage versions';
            const result = directiveInstance.disableActions(
                [{ title: 'Manage versions', disabled: false }],
                  { isFile: true, allowableOperations: [ 'update' ], properties: { 'cm:lockType': 'READ_LOCK' } }
                );
            expect(result).toEqual([{ title: 'Manage versions', disabled: true }]);
        });

        it('should disable the element in the actions when node value null', () => {
            directiveInstance.actions = 'Manage versions';
            const result = directiveInstance.disableActions(
                [{ title: 'Manage versions', disabled: false }],
                null
            );
            expect(result).toEqual([{ title: 'Manage versions', disabled: true }]);
        });

        it('should not crash when inputs are null', () => {
            directiveInstance.actions = 'Manage versions';
            const result = directiveInstance.disableActions(
                null,
                null
            );
            expect(result).toEqual(null);
        });

        it('should enable the element in the actions when node having write lock', () => {
            directiveInstance.actions = 'Manage versions';
            const result = directiveInstance.disableActions(
                [{ title: 'Manage versions', disabled: true }],
                { isFile: true, allowableOperations: [ 'update' ], properties: { 'cm:lockType': 'WRITE_LOCK' } }
            );
            expect(result).toEqual([{ title: 'Manage versions', disabled: false }]);
        });

        it('should enable the element when node having write lock', () => {
            component2.node = { isFile: true, properties: { 'cm:lockType': 'WRITE_LOCK' }, allowableOperations: [ 'update' ]};
            fixture2.detectChanges();
            expect(button.nativeElement.disabled).toBeFalsy();
        });

        it('should disable the element when node having read lock', () => {
            component2.node = { properties: { 'cm:lockType': 'READ_LOCK' }};
            fixture2.detectChanges();
            expect(button.nativeElement.disabled).toBeTruthy();
        });

    });

    describe('Directive with parent component', () => {

        beforeEach(() => {
            fixture = TestBed.createComponent(TestComponent);
            component = fixture.componentInstance;

            element = fixture.debugElement.query(By.directive(NodePrivilegeDirective));
            directiveInstance = element.injector.get(NodePrivilegeDirective);
        });

        it('update the parent actions when subject emitted from the component', () => {
            spyOn(directiveInstance, 'disableActions').and.stub();
            const node = { hasValue: () => true, getValue: () => { }, isSelected: false, obj: { entry: { isFile: true, allowableOperations: [ 'update' ]} } };
            directiveInstance.actions = 'Manage versions';
            fixture.detectChanges();
            component.parent.currentRowEvents$.next({
                currentRow: new DataCellEventModel( node, null, null),
                actions: [ { title: 'Manage versions', disabled: false } ]
            });
            expect(directiveInstance.disableActions).toHaveBeenCalled();
        });

        it('should disable parent actions when node is not having sufficient permission', () => {
            const node = {
                hasValue: () => true,
                getValue: () => { },
                isSelected: false,
                obj: { entry: { isFile: true, allowableOperations: [ 'update' ], properties: { 'cm:lockType': 'READ_LOCK' } } }
            };
            directiveInstance.actions = 'Manage versions';
            const currentRow = new DataCellEventModel( node, null, null);
            const actions = [ { title: 'Manage versions', disabled: false } ];
            fixture.detectChanges();
            component.parent.currentRowEvents$.next({
                currentRow: currentRow,
                actions: actions
            });
            expect(currentRow.actions).toEqual([{ title: 'Manage versions', disabled: true }]);
        });

        it('should enable parent actions when node is having sufficient permission', () => {
            const node = {
                hasValue: () => true,
                getValue: () => { },
                isSelected: false,
                obj: { entry: { isFile: true, allowableOperations: [ 'update' ], properties: { 'cm:lockType': 'WRITE_LOCK' } } }
            };
            directiveInstance.actions = 'Manage versions';
            const currentRow = new DataCellEventModel( node, null, null);
            const actions = [ { title: 'Manage versions', disabled: false } ];
            fixture.detectChanges();
            component.parent.currentRowEvents$.next({
                currentRow: currentRow,
                actions: actions
            });
            expect(currentRow.actions).toEqual([{ title: 'Manage versions', disabled: false }]);
        });
    });
});
