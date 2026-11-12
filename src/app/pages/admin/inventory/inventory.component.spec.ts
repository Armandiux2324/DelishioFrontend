
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { InventoryItem, InventoryLoss, inventoryUnits } from '../../../services/inventory.models';
import { SessionService } from '../../../services/session.service';
import { AdminModule } from '../admin.module';
import { InventoryComponent } from './inventory.component';

describe('Administrator inventory', () => {
 let fixture: ComponentFixture<InventoryComponent>; let component: InventoryComponent;
 let api: jasmine.SpyObj<ApiService>; let session: SessionService;
 const item: InventoryItem = { id: 10, restaurant_id: 1, name: 'Flour', unit: 'kg', unit_cost: '12.3456', current_stock: '15.125' };
 const loss: InventoryLoss = { id: 20, inventory_item_id: 10, quantity: '0.125', reason: 'Damaged', registered_by_employee_id: 1, created_at: '2026-11-12T12:00:00Z' };
 const response = (data: unknown) => ({ data } as never);
 const page = (data: unknown[], current = 1, last = 1) => response({ data, meta: { current_page: current, last_page: last, total: data.length } });
 beforeEach(async () => {
  api = jasmine.createSpyObj<ApiService>('ApiService', ['getInventoryItems', 'getInventoryItem', 'createInventoryItem', 'updateInventoryItem', 'deleteInventoryItem', 'getInventoryLosses', 'getInventoryLoss', 'createInventoryLoss']);
  api.getInventoryItems.and.resolveTo(page([item])); api.getInventoryItem.and.resolveTo(response({ data: item }));
  api.createInventoryItem.and.resolveTo(response({ data: item })); api.updateInventoryItem.and.resolveTo(response({ data: item })); api.deleteInventoryItem.and.resolveTo(response(undefined));
  api.getInventoryLosses.and.resolveTo(page([loss])); api.getInventoryLoss.and.resolveTo(response({ data: loss })); api.createInventoryLoss.and.resolveTo(response({ data: loss }));
  TestBed.configureTestingModule({ imports: [AdminModule], providers: [provideRouter([]), { provide: ApiService, useValue: api }] });
  session = TestBed.inject(SessionService); session.start({ access_token: 'admin-a', user: { id: 1, name: 'Admin', user_type: 'employee', locale: 'es', employee: { role: 'admin' } } });
  fixture = TestBed.createComponent(InventoryComponent); component = fixture.componentInstance; fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
 });
 afterEach(() => session.clear());
 async function fillItem() { await component['openItem'](); component['itemForm'].setValue({ name: ' Flour ', unit: 'kg', unit_cost: '12.3456', current_stock: '15.125' }); }
 async function fillLoss() { await component['openLoss'](); component['lossForm'].setValue({ inventory_item_id: '10', quantity: '0.125', reason: ' Damaged ' }); }
 it('lists exact stock, cost and units from Laravel', () => { expect(api.getInventoryItems).toHaveBeenCalledOnceWith(1); expect(fixture.nativeElement.textContent).toContain('15.125'); expect(fixture.nativeElement.textContent).toContain('12.3456'); });
 it('creates only the four editable fields with decimal strings', async () => { await fillItem(); await component['saveItem'](); expect(api.createInventoryItem).toHaveBeenCalledOnceWith({ name: 'Flour', unit: 'kg', unit_cost: '12.3456', current_stock: '15.125' }); });
 it('fetches a fresh record and omits unchanged stock when editing metadata', async () => { await component['openItem'](item); component['itemForm'].controls.name.setValue('Updated'); await component['saveItem'](); expect(api.getInventoryItem).toHaveBeenCalledOnceWith(10); expect(api.updateInventoryItem).toHaveBeenCalledOnceWith(10, { name: 'Updated' }); });
 it('sends an explicit absolute stock replacement, including zero', async () => { await component['openItem'](item); component['itemForm'].controls.current_stock.setValue('0'); await component['saveItem'](); expect(api.updateInventoryItem).toHaveBeenCalledOnceWith(10, { current_stock: '0' }); });
 it('does not send an update when nothing changed', async () => { await component['openItem'](item); await component['saveItem'](); expect(api.updateInventoryItem).not.toHaveBeenCalled(); });
 it('supports exactly the DBML units', async () => { await fillItem(); expect(component['units']).toEqual(['g','kg','oz','lb','ml','l','fl_oz','gal','pza']); for (const unit of inventoryUnits) { component['itemForm'].controls.unit.setValue(unit); expect(component['itemForm'].valid).toBeTrue(); } });
 for (const [field, value] of [['name',' '],['name','a'.repeat(256)],['unit','litros'],['unit_cost','-1'],['unit_cost','1000000'],['unit_cost','1.00001'],['current_stock','-1'],['current_stock','1000000000'],['current_stock','0.0001']] as const) {
  it('rejects invalid ingredient '+field+' '+value.slice(0,12), async () => { await fillItem(); component['itemForm'].get(field)!.setValue(value); await component['saveItem'](); expect(api.createInventoryItem).not.toHaveBeenCalled(); expect(component['itemForm'].get(field)!.invalid).toBeTrue(); });
 }
 it('preserves edits when a unit change conflicts with recorded activity', async () => { await component['openItem'](item); component['itemForm'].controls.unit.setValue('g'); api.updateInventoryItem.and.rejectWith({ isAxiosError: true, response: { status: 409, data: { message: 'Unidad bloqueada' } } }); await component['saveItem'](); fixture.detectChanges(); expect(component['itemForm'].controls.unit.value).toBe('g'); expect(fixture.nativeElement.querySelectorAll('dialog')[0].open).toBeTrue(); expect(component['actionState'].error()?.message).toBe('Unidad bloqueada'); });
 it('requires confirmation and preserves deletion conflicts', async () => { component['prepareDelete'](item); expect(api.deleteInventoryItem).not.toHaveBeenCalled(); api.deleteInventoryItem.and.rejectWith({ isAxiosError: true, response: { status: 409, data: { message: 'Ingrediente en receta' } } }); await component['remove'](); expect(component['items']()).toEqual([item]); expect(fixture.nativeElement.querySelectorAll('dialog')[3].open).toBeTrue(); });
 it('handles 204 deletion and returns to the last available page', async () => { component['pagination'].set({ current_page: 2, last_page: 2, total: 21 }); component['prepareDelete'](item); api.getInventoryItems.and.returnValues(Promise.resolve(page([],2,1)), Promise.resolve(page([item]))); await component['remove'](); expect(api.deleteInventoryItem).toHaveBeenCalledOnceWith(10); expect(api.getInventoryItems.calls.allArgs().slice(-2)).toEqual([[2],[1]]); });
 it('loads all ingredient option pages and sends only loss inputs', async () => { api.getInventoryItems.and.returnValues(Promise.resolve(page([item],1,2)),Promise.resolve(page([{...item,id:99}],2,2))); await fillLoss(); expect(component['options']().map(row=>row.id)).toEqual([10,99]); await component['saveLoss'](); expect(api.createInventoryLoss).toHaveBeenCalledOnceWith({ inventory_item_id:10, quantity:'0.125', reason:'Damaged' }); });
 for (const [field,value] of [['inventory_item_id','999'],['quantity','0'],['quantity','-1'],['quantity','1000000000'],['quantity','0.0001'],['reason',' '],['reason','é'.repeat(32768)]] as const) {
  it('rejects invalid loss '+field+' '+value.slice(0,12), async () => { await fillLoss(); component['lossForm'].get(field)!.setValue(value); await component['saveLoss'](); expect(api.createInventoryLoss).not.toHaveBeenCalled(); expect(component['lossForm'].get(field)!.invalid).toBeTrue(); });
 }
 it('keeps a stock rejection visible without retrying or closing the loss form', async () => { await fillLoss(); api.createInventoryLoss.and.rejectWith({ isAxiosError:true,response:{status:422,data:{message:'Sin existencias',errors:{quantity:['La pérdida supera la existencia disponible.']}}} }); await component['saveLoss'](); expect(api.createInventoryLoss).toHaveBeenCalledTimes(1); expect(component['lossForm'].controls.quantity.value).toBe('0.125'); expect(fixture.nativeElement.querySelectorAll('dialog')[1].open).toBeTrue(); expect(component['actionState'].error()?.fields['quantity']).toBeDefined(); });
 it('blocks duplicate loss submissions while pending', async () => { await fillLoss(); let finish!: (value: never)=>void; api.createInventoryLoss.and.returnValue(new Promise(resolve=>finish=resolve)); const pending=component['saveLoss'](); await component['saveLoss'](); expect(api.createInventoryLoss).toHaveBeenCalledTimes(1); finish(response({data:loss})); await pending; });
 it('shows read-only loss details and a historical fallback for removed ingredients', async () => { await component['showLoss'](loss); fixture.detectChanges(); expect(api.getInventoryLoss).toHaveBeenCalledOnceWith(20); expect(component['lossDetail']()).toEqual(loss); expect(component['ingredientName'](10)).toBe('Ingrediente #10'); const detail=fixture.nativeElement.querySelectorAll('dialog')[2]; expect(detail.querySelector('form')).toBeNull(); expect(detail.textContent).toContain('Damaged'); });
 it('ignores a response belonging to an earlier session', async () => { let finish!:(value:never)=>void; api.getInventoryItems.and.returnValue(new Promise(resolve=>finish=resolve)); const pending=component['loadPage'](2); session.start({access_token:'admin-b',user:session.user!}); finish(page([])); await pending; expect(component['items']()).toEqual([item]); });
 it('clears denied access and returns to login', async () => { const navigate=spyOn(TestBed.inject(Router),'navigate').and.resolveTo(true); api.getInventoryItems.and.rejectWith({isAxiosError:true,response:{status:403}}); await component['loadPage'](1); expect(session.token).toBeNull(); expect(navigate).toHaveBeenCalledWith(['/login']); });

 it('loads and paginates the loss history with ingredient names and read-only details', async () => {
  fixture.destroy(); TestBed.inject(ActivatedRoute).snapshot.data={losses:true};
  fixture=TestBed.createComponent(InventoryComponent);component=fixture.componentInstance;fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();
  expect(api.getInventoryLosses).toHaveBeenCalledWith(1);expect(fixture.nativeElement.textContent).toContain('Damaged');expect(component['ingredientName'](10)).toBe('Flour');
  await component['loadPage'](2);expect(api.getInventoryLosses).toHaveBeenCalledWith(2);
 });
 it('rejects recording a loss when no ingredients are available', async () => {
  api.getInventoryItems.and.resolveTo(page([]));await component['openLoss']();fixture.detectChanges();
  component['lossForm'].setValue({inventory_item_id:'10',quantity:'1',reason:'Damage'});await component['saveLoss']();
  expect(api.createInventoryLoss).not.toHaveBeenCalled();expect(fixture.nativeElement.textContent).toContain('No hay ingredientes disponibles');
 });
});
