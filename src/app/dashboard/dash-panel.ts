import {AfterViewInit, Component} from "@angular/core";
import {Compbaser} from "ng-mslib";
import {YellowPepperService} from "../../services/yellowpepper.service";
import {timeout} from "../../decorators/timeout-decorator";
import {EFFECT_LOAD_FASTERQ_LINES, EFFECT_LOAD_STATIONS} from "../../store/effects/appdb.effects";
import {RedPepperService} from "../../services/redpepper.service";
import {List} from "immutable";
import {StationModel} from "../../models/StationModel";

@Component({
    selector: 'dash-panel',
    styles: [`
        .twitter-timeline {
            width: 100% !important;
        }

        iframe {
            width: 100% !important;
        }
    `],
    templateUrl: './dash-panel.html'
})
export class DashPanel extends Compbaser implements AfterViewInit {
    options: Object;
    m_totalStationsConnected = 0;
    m_totalStationsDisconnected = 0;
    m_lastSave$;
    m_userModel$;
    m_scenes$;
    m_campaigns$;
    m_resources$;
    m_lines$;
    m_timelines$;

    constructor(private yp: YellowPepperService, private rp: RedPepperService) {
        super();
        this.m_lastSave$ = this.yp.ngrxStore.select(store => store.appDb.uiState.appSaved)
        this.m_userModel$ = this.yp.listenUserModel();
        this.m_scenes$ = this.yp.getScenes();
        this.m_campaigns$ = this.yp.getCampaigns();
        this.m_resources$ = this.yp.getResources();
        this.m_lines$ = this.yp.listenFasterqLines();
        this.m_timelines$ = this.yp.getTimelines();

        this._listenStationsConnection();
        this._listenLoadLines();
        this.options = {
            title: {text: 'simple chart'},
            series: [{
                data: [29.9, 71.5, 106.4, 129.2],
            }]
        };
    }

    _listenLoadLines() {
        this.yp.ngrxStore.dispatch({type: EFFECT_LOAD_FASTERQ_LINES, payload: {}})
    }

    _listenStationsConnection() {
        this.cancelOnDestroy(
            this.yp.listenStations()
                .map((i_stationModels: List<StationModel>) => {
                    i_stationModels.forEach(i_stationModel => {
                        if (i_stationModel.connection == 0) {
                            this.m_totalStationsDisconnected++;
                        } else {
                            this.m_totalStationsConnected++;
                        }
                    });
                    return i_stationModels;
                }).subscribe(() => {
            }, (e) => console.error(e))
        );
        this._loadStationData();
    }

    ngAfterViewInit() {
        var twitter = function (d: any, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0], p = /^http:/.test(d.location) ? 'http' : 'https';
            // if (!d.getElementById(id)) {
            js = d.createElement(s);
            js.id = id;
            js.src = p + "://platform.twitter.com/widgets.js";
            js.setAttribute('onload', "twttr.events.bind('rendered',function(e) {});");
            fjs.parentNode.insertBefore(js, fjs);
            // }
        }(document, "script", "twitter-wjs");
        this.setTwitterWidth();

    }

    _loadStationData() {
        this.yp.ngrxStore.dispatch({type: EFFECT_LOAD_STATIONS, payload: {userData: this.rp.getUserData()}});
        // if (_.isUndefined(this.m_loadStationsHandle)) {
        //     this.m_loadStationsHandle = setInterval(() => {
        //         this._loadData();
        //     }, 4000);
        // }
    }

    @timeout(500)
    setTwitterWidth() {
        jQuery('.twitter-timeline').css({width: '100%'});

    }

    destroy() {
    }
}
