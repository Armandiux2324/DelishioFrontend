export interface TaxAssociation{menu_item_id:number;menu_item_name:string;active:boolean;category:{id:number;name:string}|null;super_category:{id:number;name:string}|null;tax_class:{id:number;name:string;percentage:string}|null}
export interface TaxAssociationsPage{data:TaxAssociation[];meta:{current_page:number;last_page:number;total:number}}
