import {ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Output} from "@angular/core";
import {animate, state, style, transition, trigger} from "@angular/animations";
import {Compbaser} from "ng-mslib";
import {CampaignsModelExt, CampaignTimelineChanelPlayersModelExt} from "../../store/model/msdb-models-extended";
import {YellowPepperService} from "../../services/yellowpepper.service";
import {CampaignTimelineChanelsModel, CampaignTimelinesModel} from "../../store/imsdb.interfaces_auto";
import {List} from "immutable";
import {ACTION_UISTATE_UPDATE, AppdbAction, SideProps} from "../../store/actions/appdb.actions";
import {IUiState, TimelineViewModeEnum} from "../../store/store.data";
import {PreviewModeEnum} from "../live-preview/live-preview";
import * as _ from "lodash";
import {RedPepperService} from "../../services/redpepper.service";
import {MainAppShowStateEnum} from "../app-component";
import {Lib} from "../../Lib";

// https://github.com/AlexWD/ds-timeline-widget

@Component({
    selector: 'campaign-editor',
    templateUrl: './campaign-editors.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        .btn.active.focus, .btn.active:focus, .btn.focus, .btn:active.focus, .btn:active:focus, .btn:focus {
            outline: 0;
        }

        label {
            border-radius: 0px;
        }
    `],
    animations: [
        trigger('visibilityChanged', [
            state('on', style({transform: 'rotate(0deg)'})),
            state('off', style({transform: 'rotate(180deg)'})),
            transition('* => *', animate('300ms'))
        ]),

        trigger('fadeInOut', [
            transition(':enter', [
                style({opacity: 0}),
                animate('400ms', style({opacity: 1}))
            ]),
            transition(':leave', [
                style({opacity: 1}),
                animate('200ms', style({opacity: 0}))
            ])
        ])

    ]
})

export class CampaignEditor extends Compbaser {

    campaignModel: CampaignsModelExt;
    campaignTimelinesModel: CampaignTimelinesModel;
    channelModel: CampaignTimelineChanelsModel;
    m_campaignTimelinesModels: List<CampaignTimelinesModel>;
    m_campaignTimelineChanelPlayersModel: CampaignTimelineChanelPlayersModelExt;
    m_isVisible1 = 'off';
    zoom = 1;
    loginState: string = '';
    m_inDevMode = Lib.DevMode();
    m_TimelineViewModeEnum = TimelineViewModeEnum;
    m_TimelineViewModeSelection = TimelineViewModeEnum.ListMode;

    constructor(private yp: YellowPepperService, private actions: AppdbAction, private rp: RedPepperService, private cd: ChangeDetectorRef) {
        super();
        this.cancelOnDestroy(
            //
            this.yp.listenCampaignSelected()
                .switchMap((i_campaignsModelExt: CampaignsModelExt) => {
                    this.campaignModel = i_campaignsModelExt;
                    return this.yp.listenCampaignTimelines(i_campaignsModelExt.getCampaignId())
                })
                .subscribe((i_campaignTimelinesModel: List<CampaignTimelinesModel>) => {
                    this.m_campaignTimelinesModels = i_campaignTimelinesModel;
                }, (e) => console.error(e))
        );

        this.cancelOnDestroy(
            this.yp.listenTimelineSelected(true)
                .subscribe((i_campaignTimelinesModel: CampaignTimelinesModel) => {
                    this.campaignTimelinesModel = i_campaignTimelinesModel;
                }, (e) => console.error(e))
        );
        this.cancelOnDestroy(
            this.yp.listenChannelSelected(true)
                .subscribe((channel: CampaignTimelineChanelsModel) => {
                    this.channelModel = channel;
                }, (e) => {
                    console.error(e)
                })
        );
        this.cancelOnDestroy(
            this.yp.listenBlockChannelSelected(true)
                .subscribe((i_campaignTimelineChanelPlayersModel: CampaignTimelineChanelPlayersModelExt) => {
                    this.m_campaignTimelineChanelPlayersModel = i_campaignTimelineChanelPlayersModel;
                }, (e) => console.error(e))
        )
    }

    @Output()
    onToScreenLayoutEditor: EventEmitter<any> = new EventEmitter<any>();

    @Output()
    onToAddContent: EventEmitter<any> = new EventEmitter<any>();

    @Output()
    onToAddTimeline: EventEmitter<any> = new EventEmitter<any>();

    @Output()
    onGoBack: EventEmitter<any> = new EventEmitter<any>();

    _onAddContent() {
        if (!this.channelModel)
            return bootbox.alert('Select channel to add content to. First be sure to select a timeline and next, click the [Next Channel] button');
        this.onToAddContent.emit();

    }

    _onRemoveTimeline() {
        if (!this.campaignTimelinesModel)
            return bootbox.alert('you must first select a timeline to remove');
        if (this.rp.getCampaignTimelines(this.campaignTimelinesModel.getCampaignId()).length == 1)
            return bootbox.alert('you must keep at least one Timeline')

        bootbox.confirm('are you sure you want to remove the selected timeline?', (i_result) => {
            if (i_result == true) {
                var boardTemplateID = this.rp.getGlobalTemplateIdOfTimeline(this.campaignTimelinesModel.getCampaignTimelineId());
                this.rp.removeTimelineFromCampaign(this.campaignTimelinesModel.getCampaignTimelineId());
                this.rp.removeSchedulerFromTime(this.campaignTimelinesModel.getCampaignTimelineId());
                var campaignTimelineBoardTemplateID = this.rp.removeBoardTemplateFromTimeline(this.campaignTimelinesModel.getCampaignTimelineId());
                this.rp.removeBoardTemplate(boardTemplateID);
                this.rp.removeTimelineBoardViewerChannels(campaignTimelineBoardTemplateID);
                this.rp.removeBoardTemplateViewers(boardTemplateID);
                this.rp.getChannelsOfTimeline(this.campaignTimelinesModel.getCampaignTimelineId()).forEach(i_campaign_timeline_chanel_id => {
                    this.rp.removeChannelFromTimeline(i_campaign_timeline_chanel_id);
                    this.rp.getChannelBlocks(i_campaign_timeline_chanel_id).forEach((i_block_id) => {
                        this.rp.removeBlockFromTimelineChannel(i_block_id);
                    })
                });
                var uiState: IUiState = {
                    uiSideProps: SideProps.miniDashboard,
                    campaign: {
                        timelineSelected: -1,
                        campaignTimelineChannelSelected: -1,
                        campaignTimelineBoardViewerSelected: -1
                    }
                }
                this.yp.ngrxStore.dispatch(({type: ACTION_UISTATE_UPDATE, payload: uiState}))
                this.rp.reduxCommit();
            }
        });
    }

    _changeZoom(value) {
        // console.log(value);
    }

    _onTimelineViewMode(i_mode: TimelineViewModeEnum) {
        var uiState: IUiState = {
            campaign: {
                timelineViewModeSelected: i_mode
            }
        }
        this.yp.ngrxStore.dispatch(({type: ACTION_UISTATE_UPDATE, payload: uiState}))
        this.m_TimelineViewModeSelection = i_mode;
    }

    _onAddTimeline() {
        this.onToAddTimeline.emit();
    }

    _onEditScreenLayout() {
        if (!this.campaignTimelinesModel)
            return bootbox.alert('no timeline selected')
        var uiState: IUiState = {uiSideProps: SideProps.screenLayoutEditor}
        this.yp.ngrxStore.dispatch(({type: ACTION_UISTATE_UPDATE, payload: uiState}))
        this.onToScreenLayoutEditor.emit();
    }

    /**
     Delete the selected block from the channel
     @method _deleteChannelBlock
     @return none
     **/
    _onRemoveContent() {
        if (!this.m_campaignTimelineChanelPlayersModel)
            return bootbox.alert('No item selected');
        this.rp.removeBlockFromTimelineChannel(this.m_campaignTimelineChanelPlayersModel.getCampaignTimelineChanelPlayerId());
        this.rp.reduxCommit();
        let uiState: IUiState = {
            uiSideProps: SideProps.miniDashboard,
            campaign: {
                blockChannelSelected: -1
            }
        }
        this.yp.ngrxStore.dispatch(({type: ACTION_UISTATE_UPDATE, payload: uiState}))
    }

    _onCampaignPreview() {
        let uiState: IUiState = {mainAppState: MainAppShowStateEnum.SAVE_AND_PREVIEW, previewMode: PreviewModeEnum.CAMPAIGN}
        this.yp.ngrxStore.dispatch(({type: ACTION_UISTATE_UPDATE, payload: uiState}))
    }

    _onTimelinePreview() {
        if (_.isUndefined(this.campaignTimelinesModel))
            return bootbox.alert('No timeline selected');
        let uiState: IUiState = {mainAppState: MainAppShowStateEnum.SAVE_AND_PREVIEW, previewMode: PreviewModeEnum.TIMELINE}
        this.yp.ngrxStore.dispatch(({type: ACTION_UISTATE_UPDATE, payload: uiState}))
    }

    _onGoBack() {
        this.actions.resetCampaignSelection();
        this.onGoBack.emit()
    }

    ngOnInit() {
    }

    destroy() {
    }
}