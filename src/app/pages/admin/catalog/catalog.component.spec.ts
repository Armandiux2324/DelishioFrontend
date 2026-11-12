
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { CatalogKind } from '../../../services/catalog.models';
import { SessionService } from '../../../services/session.service';
import { AdminModule } from '../admin.module';
import { CatalogComponent } from './catalog.component';

for (const kind of ['tax-classes', 'super-categories', 'categories'] as CatalogKind[]) {
  describe('Administrator catalog: ' + kind, () => {
    let fixture: ComponentFixture<CatalogComponent>;
    let component: CatalogComponent;
    let api: jasmine.SpyObj<ApiService>;
    let session: SessionService;
    const tax = { id: 10, restaurant_id: 1, name: 'Tax', percentage: '8.25' };
    const superCategory = { id: 20, restaurant_id: 1, name: 'Food', tax_class_id: 10 };
    const category = { id: 30, name: 'Lunch', super_category_id: 20, description: 'Description' };
    const records = { 'tax-classes': tax, 'super-categories': superCategory, categories: category };
    const record = records[kind];
    const parentKind = kind === 'categories' ? 'super-categories' : 'tax-classes';
    const response = (data: unknown) => ({ data } as never);
    const page = (resource: CatalogKind, current = 1, last = 1) => response({ data: [records[resource]], meta: { current_page: current, last_page: last, total: 1 } });
    beforeEach(async () => {
      api = jasmine.createSpyObj<ApiService>('ApiService', ['getCatalog', 'getCatalogRecord', 'createCatalog', 'updateCatalog', 'deleteCatalog']);
      api.getCatalog.and.callFake(async resource => page(resource));
      api.getCatalogRecord.and.resolveTo(response({ data: record }));
      api.createCatalog.and.resolveTo(response({ data: record }));
      api.updateCatalog.and.resolveTo(response({ data: record }));
      api.deleteCatalog.and.resolveTo(response(undefined));
      TestBed.configureTestingModule({ imports: [AdminModule], providers: [provideRouter([]), { provide: ApiService, useValue: api }] });
      TestBed.inject(ActivatedRoute).snapshot.data = { catalogKind: kind };
      session = TestBed.inject(SessionService);
      session.start({ access_token: 'admin-a', user: { id: 1, name: 'Admin', user_type: 'employee', locale: 'es', employee: { role: 'admin' } } });
      fixture = TestBed.createComponent(CatalogComponent);
      component = fixture.componentInstance;
      fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    });
    afterEach(() => session.clear());

    async function createForm() {
      await component['openEditor']();
      component['form'].patchValue({ name: ' New ', percentage: '0', parent: kind === 'categories' ? '20' : '10', description: '' });
    }
    it('lists the authenticated resource and resolves its parent name', () => {
      expect(api.getCatalog).toHaveBeenCalledWith(kind, 1);
      expect(fixture.nativeElement.textContent).toContain(record.name);
      if (kind !== 'tax-classes') expect(component['parentName'](record)).toBe(records[parentKind].name);
    });
    it('creates only the resource fields with zero tax or nullable description', async () => {
      await createForm(); await component['save']();
      const payload = kind === 'tax-classes' ? { name: 'New', percentage: '0' } : kind === 'super-categories'
        ? { name: 'New', tax_class_id: 10 } : { name: 'New', super_category_id: 20, description: null };
      expect(api.createCatalog).toHaveBeenCalledOnceWith(kind, payload);
      expect(fixture.nativeElement.querySelectorAll('dialog')[0].open).toBeFalse();
    });
    it('fetches fresh values before editing and updates without server identifiers', async () => {
      await component['openEditor'](record);
      expect(api.getCatalogRecord).toHaveBeenCalledOnceWith(kind, record.id);
      component['form'].controls.name.setValue('Updated'); await component['save']();
      const payload = kind === 'tax-classes' ? { name: 'Updated', percentage: '8.25' } : kind === 'super-categories'
        ? { name: 'Updated', tax_class_id: 10 } : { name: 'Updated', super_category_id: 20, description: 'Description' };
      expect(api.updateCatalog).toHaveBeenCalledOnceWith(kind, record.id, payload);
    });
    it('rejects empty and oversized names before making a request', async () => {
      await createForm();
      for (const value of ['   ', 'a'.repeat(256)]) {
        component['form'].controls.name.setValue(value); await component['save']();
        expect(api.createCatalog).not.toHaveBeenCalled();
      }
    });
    it('keeps form input on a server validation failure', async () => {
      await createForm(); api.createCatalog.and.rejectWith({ isAxiosError: true, response: { status: 422, data: { message: 'Invalid', errors: { name: ['Invalid name'] } } } });
      await component['save'](); fixture.detectChanges();
      expect(component['form'].controls.name.value).toBe(' New ');
      expect(fixture.nativeElement.querySelectorAll('dialog')[0].open).toBeTrue();
      expect(fixture.nativeElement.textContent).toContain('Invalid name');
    });
    it('requires explicit confirmation and preserves conflicts from dependent records', async () => {
      component['prepareDelete'](record); expect(api.deleteCatalog).not.toHaveBeenCalled();
      api.deleteCatalog.and.rejectWith({ isAxiosError: true, response: { status: 409, data: { message: 'Record in use' } } });
      await component['remove'](); fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('dialog')[1].open).toBeTrue();
      expect(fixture.nativeElement.textContent).toContain('Record in use');
      expect(component['records']()).toEqual([record]);
    });
    it('handles a successful 204 delete and clamps the last page', async () => {
      component['pagination'].set({ current_page: 2, last_page: 2, total: 21 });
      component['prepareDelete'](record);
      api.getCatalog.and.callFake(async (resource, current = 1) => resource === kind && current === 2
        ? response({ data: [], meta: { current_page: 2, last_page: 1, total: 20 } }) : page(resource));
      await component['remove']();
      expect(api.deleteCatalog).toHaveBeenCalledOnceWith(kind, record.id);
      expect(api.getCatalog).toHaveBeenCalledWith(kind, 2);
      expect(api.getCatalog).toHaveBeenCalledWith(kind, 1);
      expect(component['pagination']().current_page).toBe(1);
    });
    it('prevents duplicate submissions while saving', async () => {
      await createForm(); let finish!: (value: never) => void;
      api.createCatalog.and.returnValue(new Promise(resolve => finish = resolve));
      const pending = component['save'](); await component['save']();
      expect(api.createCatalog).toHaveBeenCalledTimes(1);
      finish(response({ data: record })); await pending;
    });
    it('does not apply responses from an earlier session', async () => {
      let finish!: (value: never) => void;
      api.getCatalog.and.callFake(async resource => resource === kind ? new Promise(resolve => finish = resolve) : page(resource));
      const pending = component['loadPage'](2);
      session.start({ access_token: 'admin-b', user: session.user! });
      finish(response({ data: [], meta: { current_page: 2, last_page: 2, total: 0 } })); await pending;
      expect(component['records']()).toEqual([record]);
    });
    it('clears denied access and returns to login', async () => {
      const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
      api.getCatalog.and.rejectWith({ isAxiosError: true, response: { status: 403 } });
      await component['loadPage'](1); expect(session.token).toBeNull(); expect(navigate).toHaveBeenCalledWith(['/login']);
    });
    if (kind === 'tax-classes') {
      it('respects tax precision and the backend maximum of 999.99', async () => {
        await createForm();
        for (const value of ['-1', '1000', '1.001', '1e2']) {
          component['form'].controls.percentage.setValue(value); await component['save'](); expect(api.createCatalog).not.toHaveBeenCalled();
        }
        component['form'].controls.percentage.setValue('999.99'); await component['save']();
        expect(api.createCatalog).toHaveBeenCalledWith(kind, { name: 'New', percentage: '999.99' });
      });
    } else {
      it('loads all relationship pages, including options beyond the first 20', async () => {
        api.getCatalog.and.callFake(async (resource, current = 1) => resource === parentKind
          ? response({ data: current === 1 ? [records[parentKind]] : [{ ...records[parentKind], id: 99, name: 'Last option' }], meta: { current_page: current, last_page: 2, total: 21 } }) : page(resource));
        await component['openEditor']();
        expect(api.getCatalog).toHaveBeenCalledWith(parentKind, 2);
        expect(component['parents']().map(parent => parent.id)).toContain(99);
      });
      it('rejects a parent that is not available to the current restaurant', async () => {
        await createForm(); component['form'].controls.parent.setValue('999'); await component['save']();
        expect(api.createCatalog).not.toHaveBeenCalled(); expect(component['form'].controls.parent.invalid).toBeTrue();
      });
      it('shows an empty-parent message without accepting incomplete input', async () => {
        api.getCatalog.and.resolveTo(response({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } }));
        await component['openEditor'](); fixture.detectChanges();
        component['form'].controls.name.setValue('Name'); await component['save']();
        expect(api.createCatalog).not.toHaveBeenCalled(); expect(fixture.nativeElement.textContent).toContain('Crea primero');
      });
    }
    if (kind === 'categories') {
      it('validates description bytes rather than characters', async () => {
        await createForm(); component['form'].controls.description.setValue('é'.repeat(32768)); await component['save']();
        expect(api.createCatalog).not.toHaveBeenCalled(); expect(component['form'].controls.description.hasError('bytes')).toBeTrue();
      });
    }
  });
}
