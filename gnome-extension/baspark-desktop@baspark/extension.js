import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {configSubsystemMethods} from './modules/config-subsystems.js';
import {meshProfileMethods} from './modules/mesh-profiles.js';
import {inputMethods} from './modules/input.js';
import {effectMethods} from './modules/effects.js';
import {runtimeMethods} from './modules/runtime.js';

export default class BASparkDesktopExtension extends Extension {
    /**
     * 功能：启用扩展并初始化事件、配置、网格与计时器。
     * 参数：无。
     * 返回：无。
     */
    enable() {
        this._buildTag = '2026-04-15';

        this._actors = new Set();
        this._timers = new Set();
        this._signalIds = [];

        this._pointerPollId = 0;
        this._pointerDown = false;
        this._dragActive = false;

        this._lastCapturedX = -1;
        this._lastCapturedY = -1;
        this._lastCapturedMs = 0;

        this._lastClickX = -1;
        this._lastClickY = -1;
        this._lastClickMs = 0;

        this._lastDragX = -1;
        this._lastDragY = -1;
        this._trailDistanceAccumulator = 0;
        this._trailEmitX = Number.NaN;
        this._trailEmitY = Number.NaN;
        this._distanceAccumulator = 0;
        this._trailStream = null;

        this._settings = this.getSettings('org.gnome.shell.extensions.baspark-desktop');
        this._settingsChangedId = this._settings.connect('changed', () => {
            // 配置变化后立即重建映射并刷新轮询节奏。
            this._loadConfig();
            this._buildSubsystemMap();
            this._restartPollTimer();
        });

        this._loadConfig();
        this._buildSubsystemMap();
        this._meshProfiles = this._loadMeshProfiles();

        const capturedId = global.stage.connect('captured-event', (_actor, event) => this._onCapturedEvent(event));
        this._signalIds.push(capturedId);

        this._restartPollTimer();

        this._log(`enable(), build=${this._buildTag}`);

    }

    /**
     * 功能：停用扩展并释放所有信号、定时器与绘制 Actor。
     * 参数：无。
     * 返回：无。
     */
    disable() {
        if (this._signalIds) {
            for (const id of this._signalIds) {
                if (id)
                    global.stage.disconnect(id);
            }
        }
        this._signalIds = null;

        if (this._pointerPollId) {
            GLib.source_remove(this._pointerPollId);
            this._pointerPollId = 0;
        }

        if (this._timers) {
            for (const id of this._timers)
                GLib.source_remove(id);
            this._timers.clear();
        }

        if (this._actors) {
            for (const actor of this._actors) {
                if (actor?.get_parent())
                    actor.destroy();
            }
            this._actors.clear();
        }

        if (this._settings && this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = 0;
        }

        this._settings = null;
        this._cfg = null;
        this._subsystems = null;
        this._meshProfiles = null;
        this._actors = null;
        this._timers = null;
    }
}

// 通过原型混入按职责拆分的方法，入口文件仅保留扩展生命周期。
Object.assign(
    BASparkDesktopExtension.prototype,
    configSubsystemMethods,
    meshProfileMethods,
    inputMethods,
    effectMethods,
    runtimeMethods
);
