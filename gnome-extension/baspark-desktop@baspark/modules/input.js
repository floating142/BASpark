import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';

import {
    clamp,
    UNITY_RATE_DISTANCE_BASE,
} from './core-utils.js';

export const inputMethods = {
    // ===== 输入阶段：收集左键点击与拖动，并按策略触发特效发射 =====
    /**
     * 功能：重启指针轮询定时器，使其使用最新配置。
     * 参数：无。
     * 返回：无。
     */
    _restartPollTimer() {
        if (this._pointerPollId) {
            GLib.source_remove(this._pointerPollId);
            this._pointerPollId = 0;
        }

        this._pointerPollId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, this._cfg.pollIntervalMs, () => {
            this._pollPointer();
            return GLib.SOURCE_CONTINUE;
        });
    },

    /**
     * 功能：处理 GNOME captured-event 的左键按下事件。
     * 参数：event Clutter 事件对象。
     * 返回：Clutter 事件传播标记。
     */
    _onCapturedEvent(event) {
        if (event.type() !== Clutter.EventType.BUTTON_PRESS)
            return Clutter.EVENT_PROPAGATE;

        if (event.get_button() !== Clutter.BUTTON_PRIMARY)
            return Clutter.EVENT_PROPAGATE;

        const [x, y] = event.get_coords();
        this._handleClick(x, y, 'captured-event');
        return Clutter.EVENT_PROPAGATE;
    },

    /**
     * 功能：根据 Ring4 的 rateOverDistance 计算距离触发步长。
     * 参数：无。
     * 返回：触发步长像素值；不可触发时返回 Infinity。
     */
    _distanceStepFromRing4() {
        const ring4 = this._subsystems?.ring4;
        if (!ring4 || ring4.rateOverDistance <= 0)
            return Number.POSITIVE_INFINITY;

        // 这是“每移动多少像素触发一次 Ring4”的代码侧换算策略。
        const scaled = this._cfg.distanceEmitStepPx * (UNITY_RATE_DISTANCE_BASE / ring4.rateOverDistance);
        return clamp(scaled, 2, 240);
    },

    /**
     * 功能：轮询鼠标状态，统一处理点击、拖尾与距离发射。
     * 参数：无。
     * 返回：无。
     */
    _pollPointer() {
        const [x, y, mods] = global.get_pointer();
        const down = (mods & Clutter.ModifierType.BUTTON1_MASK) !== 0;
        const now = Date.now();

        if (down && !this._pointerDown) {
            const dx = Math.abs(Math.round(x) - this._lastCapturedX);
            const dy = Math.abs(Math.round(y) - this._lastCapturedY);
            // captured-event 与轮询同时命中时，按时间窗与距离窗做去重。
            const nearCaptured = dx <= this._cfg.dedupeDistancePx && dy <= this._cfg.dedupeDistancePx;
            const justCaptured = (now - this._lastCapturedMs) <= this._cfg.capturedPriorityWindowMs;
            if (!(nearCaptured && justCaptured))
                this._handleClick(x, y, 'pointer-poll');

            this._dragActive = true;
            this._lastDragX = Math.round(x);
            this._lastDragY = Math.round(y);
            this._trailEmitX = x;
            this._trailEmitY = y;
            this._trailDistanceAccumulator = 0;
            this._distanceAccumulator = 0;
            this._beginTrailStroke(x, y);
        }

        if (down && this._dragActive) {
            const trail = this._subsystems?.trail;
            const cx = Math.round(x);
            const cy = Math.round(y);
            const dx = cx - this._lastDragX;
            const dy = cy - this._lastDragY;
            const dist = Math.hypot(dx, dy);

            if (dist > 0) {
                if (this._cfg.enableTrail && trail && this._cfg.timeScale > trail.killUnderTimeScale) {
                    const minStep = Math.max(1e-3, trail.minVertexDistancePx);
                    const dirX = dx / dist;
                    const dirY = dy / dist;
                    let remain = dist;
                    let walkX = this._lastDragX;
                    let walkY = this._lastDragY;

                    // 对齐 TrailRenderer.m_MinVertexDistance：按累计路程离散采样，而非固定时间间隔。
                    while (this._trailDistanceAccumulator + remain >= minStep) {
                        const step = minStep - this._trailDistanceAccumulator;
                        const nx = walkX + dirX * step;
                        const ny = walkY + dirY * step;
                        if (Number.isFinite(this._trailEmitX) && Number.isFinite(this._trailEmitY))
                            this._spawnTrailSegment(this._trailEmitX, this._trailEmitY, nx, ny);
                        this._trailEmitX = nx;
                        this._trailEmitY = ny;
                        walkX = nx;
                        walkY = ny;
                        remain -= step;
                        this._trailDistanceAccumulator = 0;
                    }

                    this._trailDistanceAccumulator += remain;
                }

                if (this._cfg.enableDistanceEmitter) {
                    const stepPx = this._distanceStepFromRing4();
                    if (Number.isFinite(stepPx)) {
                        this._distanceAccumulator += dist;
                        // Unity rateOverDistance 是“每单位距离发射数量”，因此需要保留余量并支持一次多次发射。
                        let emitEvents = 0;
                        while (this._distanceAccumulator >= stepPx) {
                            this._distanceAccumulator -= stepPx;
                            emitEvents++;
                        }

                        if (emitEvents > 0)
                            this._spawnDistanceEmitter(cx, cy, emitEvents);
                    }
                }

                this._lastDragX = cx;
                this._lastDragY = cy;
            }
        }

        if (!down) {
            this._dragActive = false;
            this._trailDistanceAccumulator = 0;
            this._trailEmitX = Number.NaN;
            this._trailEmitY = Number.NaN;
            this._distanceAccumulator = 0;
        }

        this._pointerDown = down;
    },

    /**
     * 功能：统一点击入口，执行去重并触发点击特效。
     * 参数：x/y 点击坐标，source 触发来源标识。
     * 返回：无。
     */
    _handleClick(x, y, source) {
        const now = Date.now();
        const rx = Math.round(x);
        const ry = Math.round(y);

        // 点击去重是纯运行时策略，用于避免 captured-event/poll 双路重复触发。
        const dx = Math.abs(rx - this._lastClickX);
        const dy = Math.abs(ry - this._lastClickY);
        if (dx <= this._cfg.dedupeDistancePx && dy <= this._cfg.dedupeDistancePx && (now - this._lastClickMs) <= this._cfg.dedupeTimeMs)
            return;

        this._lastClickX = rx;
        this._lastClickY = ry;
        this._lastClickMs = now;

        if (source === 'captured-event') {
            this._lastCapturedX = rx;
            this._lastCapturedY = ry;
            this._lastCapturedMs = now;
        }

        this._log(`click from ${source} at ${rx},${ry}`);
        this._spawnClickEffect(rx, ry);
    },
};
