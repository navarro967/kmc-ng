import {
	Component,
	OnDestroy,
	OnInit,
	ViewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { ISubscription } from 'rxjs/Subscription';
import { Message } from 'primeng/primeng';
import { AppLocalization } from '@kaltura-ng/kaltura-common';
import { BrowserService } from 'app-shared/kmc-shell';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { AreaBlockerMessage } from '@kaltura-ng/kaltura-ui';

import {
	PlaylistsStore,
	SortDirection
} from './playlists-store/playlists-store.service';
import { PlaylistsTableComponent } from "./playlists-table.component";

import * as moment from 'moment';

export type UpdateStatus = {
  busy : boolean;
  errorMessage : string;
};

export interface Filter {
	type: string;
	label: string;
	tooltip: string
}

@Component({
    selector: 'kPlaylistsList',
    templateUrl: './playlists-list.component.html',
    styleUrls: ['./playlists-list.component.scss']
})
export class PlaylistsListComponent implements OnInit, OnDestroy {

	@ViewChild(PlaylistsTableComponent) private dataTable: PlaylistsTableComponent;

  private _state = new BehaviorSubject<UpdateStatus>({ busy : false, errorMessage : null});
  public state$ = this._state.asObservable();
  public _blockerMessage: AreaBlockerMessage = null;
  public _msgs: Message[] = [];

	_filter = {
		pageIndex : 0,
		freetextSearch : '',
		createdAfter: null,
		createdBefore : null,
		pageSize : null, // pageSize is set to null by design. It will be modified after the first time loading playlists
		sortBy : 'createdAt',
		sortDirection : SortDirection.Desc
	};

	public showLoader = true;
	public _selectedPlaylists: any[] = [];
	private querySubscription : ISubscription;
	public activeFilters: Filter[] = [];

	constructor(
		public _playlistsStore: PlaylistsStore,
		private appLocalization: AppLocalization,
		private router: Router,
    private _browserService : BrowserService
	) {}

	removeTag(tag: Filter){
		this.updateFilters(tag, 1);
		if(tag.type === 'freeText') {
			this._filter.freetextSearch = null;
		}
		if(tag.type === 'Dates') {
			this._filter.createdBefore = null;
			this._filter.createdAfter = null;
		}
		this._playlistsStore.reload({
      freeText: this._filter.freetextSearch,
      createdBefore: this._filter.createdBefore,
      createdAfter: this._filter.createdAfter,
      pageIndex: 1
    });
	}

	removeAllTags(){
		this.clearSelection();
    this._playlistsStore.reload({
      freeText: '',
      createdBefore: null,
      createdAfter: null,
      pageIndex: 1
    });
		this.activeFilters = [];
	}

	onActionSelected(event) {
    switch (event.action){
      case "view":
        this.router.navigate(['/content/playlists/playlist', event.playlistID]);
        break;
      case "delete":
        this._browserService.confirm(
          {
            header: this.appLocalization.get('applications.content.playlists.deletePlaylist'),
            message: `
              ${this.appLocalization.get('applications.content.playlists.confirmDelete', {0:''})}<br/>
              ${this.appLocalization.get('applications.content.playlists.playlistId', { 0: event.playlistID })}<br/>
              ${this.appLocalization.get('applications.content.playlists.deleteNote', {0:''})}`,
            accept: () => {
              this.deletePlaylist(event.playlistID);
            }
          }
        );
        break;
      default:
        alert("Selected Action: " + event.action + "\nPlaylist ID: " + event.playlistID);
        break;
    }
	}

  private deletePlaylist(playlistIds: any): void{
    this._state.next({busy: true, errorMessage: null});
    this._blockerMessage = null;
    // Array.isArray(playlistIds)? playlistIds.map(id => id.id) : playlistIds
    this._playlistsStore.deletePlaylist(playlistIds)
      .subscribe(
      result => {
        this._state.next({busy: false, errorMessage: null});
        this._msgs = [];
        this._msgs.push({severity: 'success', summary: '', detail: this.appLocalization.get('applications.content.playlists.deleted')});
        this.clearSelection();
      },
      error => {
        this._blockerMessage = new AreaBlockerMessage(
          {
            message: error.message,
            buttons: [
              {
                label: this.appLocalization.get('app.common.retry'),
                action: () => {
                  this.deletePlaylist(playlistIds);
                }
              },
              {
                label: this.appLocalization.get('app.common.cancel'),
                action: () => {
                  this._blockerMessage = null;
                  this._state.next({busy: false, errorMessage: null});
                }
              }
            ]
          }
        )
      }
    );
  }

	onFreetextChanged() : void {
    this._playlistsStore.reload({ freeText: this._filter.freetextSearch });
	}

	onSortChanged(event) : void {
    this._playlistsStore.reload({
      sortBy: event.field,
      sortDirection: event.order === 1 ? SortDirection.Asc : SortDirection.Desc
    });
	}

	onPaginationChanged(state : any) : void {
		if (state.page !== this._filter.pageIndex || state.rows !== this._filter.pageSize) {
      this._filter.pageSize = state.page + 1;
      this._filter.pageIndex = state.rows;
      this._playlistsStore.reload({
        pageIndex: state.page + 1,
        pageSize: state.rows
      });
			this.clearSelection();
		}
	}

	onCreatedChanged(dates) : void {
		this._playlistsStore.reload({
      createdAfter: dates.createdAfter,
      createdBefore: dates.createdBefore,
      pageIndex: 1
    });

		if(!dates.createdAfter && !dates.createdBefore) {
			this.clearDates();
		}
	}

	clearDates() {
		this.activeFilters.forEach((el, index, arr) => {
			if(el.type == 'Dates') {
				arr.splice(index, 1);
			}
		});
	}

	updateFilters(filter: Filter, flag?: number) { // if flag == 1 we won't push filter to activeFilters
		if(!filter.label) {
			flag = 1;
		}
		this.activeFilters.forEach((el, index, arr) => {
			if(el.type == filter.type) {
				arr.splice(index, 1);
			}
		});
		if(!flag) {
			this.activeFilters.push(filter);
		}
	}

	syncFilters(query) {
		let freeTextFilter: Filter = {
			type: 'freeText',
			label: query.freeText,
			tooltip: this.appLocalization.get('applications.content.filters.freeText')
		};
		this.updateFilters(freeTextFilter);

		let dateFilter: Filter = {
			type: 'Dates',
			label: freeTextFilter.type,
			tooltip: null
		};

		if (query.createdAfter || query.createdBefore) {
			dateFilter.type = 'Dates';
			dateFilter.label = dateFilter.type;
			if (!query.createdAfter) {
				dateFilter.tooltip = this.appLocalization.get('applications.content.filters.dateFilter.until', {0: moment(query.createdBefore).format('LL')});
			} else if (!query.createdBefore) {
				dateFilter.tooltip = this.appLocalization.get('applications.content.filters.dateFilter.from', {0: moment(query.createdAfter).format('LL')});
			} else {
				dateFilter.tooltip = `${moment(query.createdAfter).format('LL')} - ${moment(query.createdBefore).format('LL')}`;
			}
			this.updateFilters(dateFilter);
		}
	}

	ngOnInit() {
		this.querySubscription = this._playlistsStore.query$.subscribe(
			query => {
				this._filter.pageSize = query.pageSize;
				this._filter.pageIndex = query.pageIndex - 1;
				this._filter.sortBy = query.sortBy;
				this._filter.sortDirection = query.sortDirection;
				this._filter.freetextSearch = query.freeText;
				this._filter.createdAfter = query.createdAfter;
				this._filter.createdBefore = query.createdBefore;

				this.syncFilters(query);

				this.dataTable.scrollToTop();
			}
		);

		this._playlistsStore.reload(false);
	}

	ngOnDestroy() {
		this.querySubscription.unsubscribe();
		this.querySubscription = null;
	}

	public _reload() {
		this.clearSelection();
		this._playlistsStore.reload(true);
	}

	clearSelection() {
		this._selectedPlaylists = [];
	}

  deletePlaylists(selectedPlaylists) {
	  let playlistsToDelete = selectedPlaylists.map((playlist, index) => {
      return `${index + 1}: ${playlist.name}`;
    });
    this._browserService.confirm(
      {
        header: this.appLocalization.get('applications.content.playlists.deletePlaylist'),
        message: `
              ${this.appLocalization.get('applications.content.playlists.confirmDelete', {0: selectedPlaylists.length > 1 ? 's': ''})}<br/>
              ${playlistsToDelete.join(',').replace(/,/gi, '<br />')}<br/>
              ${this.appLocalization.get('applications.content.playlists.deleteNote', {0: selectedPlaylists.length > 1 ? 's': ''})}`,
        accept: () => {
          // this.deletePlaylist(selectedPlaylists);
        }
      }
    );
  }
}
