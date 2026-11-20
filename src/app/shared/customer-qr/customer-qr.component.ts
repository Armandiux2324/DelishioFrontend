import {Component,Input,OnChanges,OnDestroy,signal} from '@angular/core';
import {customerQrPattern} from './customer-qr';
@Component({selector:'app-customer-qr',standalone:false,template:'@if (path()) {<svg role="img" [attr.aria-label]="label" [attr.viewBox]="\'0 0 \' + size() + \' \' + size()" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path [attr.d]="path()" fill="#000"/></svg>}@if (failed()) {<p role="alert">{{ locale === \'en\' ? \'Unable to display the QR. You can use the code below.\' : \'No se pudo mostrar el QR. Puedes usar el código de abajo.\' }}</p>}',styles:[':host{display:block}svg{display:block;width:16rem;max-width:100%;height:auto;border-radius:.75rem}p{color:var(--d-muted)}']})
export class CustomerQrComponent implements OnChanges,OnDestroy {
 @Input({required:true}) value='';@Input({required:true}) label='';@Input() locale:'es'|'en'='es';
 protected readonly path=signal('');protected readonly size=signal(0);protected readonly failed=signal(false);private version=0;
 ngOnChanges():void{void this.render();}ngOnDestroy():void{this.version++;}
 private async render():Promise<void>{const version=++this.version,value=this.value;this.path.set('');this.failed.set(false);if(!customerQrPattern.test(value)){this.failed.set(true);return;}try{const {QRCodeWriter,BarcodeFormat,EncodeHintType}=await import('@zxing/library');if(version!==this.version)return;const matrix=new QRCodeWriter().encode(value,BarcodeFormat.QR_CODE,0,0,new Map([[EncodeHintType.MARGIN,4]]));const cells:string[]=[];for(let y=0;y<matrix.getHeight();y++)for(let x=0;x<matrix.getWidth();x++)if(matrix.get(x,y))cells.push('M'+x+' '+y+'h1v1h-1z');this.size.set(matrix.getWidth());this.path.set(cells.join(''));}catch{if(version===this.version)this.failed.set(true);}}
}
