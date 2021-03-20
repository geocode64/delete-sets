import { Component, OnInit } from '@angular/core';
import { CloudAppEventsService, CloudAppRestService, Entity, EntityType, 
  HttpMethod, PageInfo, RestErrorResponse, Request, AlertService } from '@exlibris/exl-cloudapp-angular-lib';
import { map, catchError, switchMap, tap, mergeMap } from 'rxjs/operators';
import { of, forkJoin, Observable, Subscription, iif } from 'rxjs';
import { AppService } from '../app.service';


@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit {

  num = 10;
  loading = true;
  processed = 0;
  showProgress = false;
  currentUserId;
  ids = new Set<string>();
  
  sets: Entity[];
  private pageLoad$: Subscription;
  

  constructor( 
    private restService: CloudAppRestService,
    private eventsService: CloudAppEventsService,
    private alert: AlertService 
  ) { }

  ngOnInit() {
    this.loading=true;
    //this.appService.setTitle('Parallel Requests');
    this.pageLoad$ = this.eventsService.onPageLoad(this.onPageLoad);
    
    
  }

  ngOnDestroy(): void {
    this.pageLoad$.unsubscribe();
  }
  onPageLoad = (pageInfo: PageInfo) => {    
    this.sets = [];
    this.loadSets(pageInfo.entities);
  }

  delete() {
    if(confirm("Are you sure you want to delete "+this.ids.size+" set(s)")) {
      
      //TODO parallell delete code here
      this.deleteSets();
    }

  }

  deleteSets() {
    this.loading = true;
    this.processed = 0;

    let idsArray = Array.from(this.ids);

    of(idsArray)
    .pipe(
      switchMap(ids => {  
        this.loading=true;    
        return iif(
          ()=>ids.length>0,
          forkJoin(ids.map(e=>this.deleteSet(e))),
          of(null)
        )
      }),
    )
    .subscribe({
      next: (s: any[])=>{
        if(!s) return null;
        s.forEach(set=>{
          if(!set) return null;
          // TODO confirm error reporting is working. 
          if (isRestErrorResponse(set)) {
            console.log('Error deleting set: ' + set.message)
          } 
        })
      },
      complete: () => {
        this.loading=false;
        this.eventsService.refreshPage().subscribe(
          ()=>this.alert.success('Set deletion succesful!', {autoClose: false})
        );
      }
    });
    
  }

  deleteSet(setid: string) {

    let request: Request = {
      url: '/conf/sets/'+setid, 
      method: HttpMethod.DELETE
    };

    return this.restService.call<any>(request).pipe(
      tap(()=>this.processed++),
      catchError(e => of(e)),
    )
  }

  loadSets(sets: Entity[]) {
    this.loading=true;
    this.processed = 0;

    const sets$ = of(sets)
    .pipe(
      switchMap(entities => {  
        this.loading=true;    
        const items = entities.filter(e=>e.type==EntityType.SET);
        return iif(
          ()=>items.length>0,
          forkJoin(items.map(e=>this.getSet(e))),
          of(null)
        )
      }),
    )

    this.eventsService.getInitData()
    .pipe(
      mergeMap(initData => {
        const currentUserId = initData.user.primaryId;
        return sets$
        .pipe(
          map(entities => {
            if(!entities) return [];
            return entities.filter((e: any)=>e.created_by.value==currentUserId);  
          }
          )
        )                            
      }),
    )
    .subscribe({
      next: (s: any[])=>{
        if(!s) return null;
        s.forEach(set=>{
          if (isRestErrorResponse(set)) {
            console.log('Error retrieving set: ' + set.message)
          } else {
            this.sets.push(set);
          }
        })
      },
      complete: () => this.loading=false
    });

  }

  getSet(set: Entity) {
    return this.restService.call<any>(set.link).pipe(
      tap(()=>this.processed++),
      catchError(e => of(e)),
    )
  }


  get percentComplete() {
    return Math.round((this.processed/this.num)*100)
  }

  onEntitySelected(event) {
    if (event.checked) this.ids.add(event.mmsId);
    else this.ids.delete(event.mmsId);
  }

  
}
const isRestErrorResponse = (object: any): object is RestErrorResponse => 'error' in object;
