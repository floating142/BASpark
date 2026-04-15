import GLib from 'gi://GLib';
import St from 'gi://St';
import Cairo from 'cairo';
import GdkPixbuf from 'gi://GdkPixbuf';

import {
    clamp,
    lerp,
    easeOutQuad,
    randomRange,
    evalScalarStops,
    evalColorStops,
    UNITY_SIZE_TO_PX,
} from './core-utils.js';

export const effectMethods = {
    // ===== 发射阶段：根据子系统参数生成每次点击要绘制的粒子集合 =====
    /**
     * 功能：构建 FX_Touch 子系统发射数据。
     * 参数：无。
     * 返回：FX_Touch 发射对象。
     */
    _emitFxTouch() {
        const params = this._subsystems.fxTouch;
        const lifetimeSec = this._sampleStartLifetimeSec(params);
        return {
            params,
            lifetimeSec,
            lifetimeMs: Math.max(16, Math.round((lifetimeSec * 1000) / this._cfg.timeScale)),
        };
    },

    /**
     * 功能：构建 Ring 子系统发射数据。
     * 参数：无。
     * 返回：Ring 发射对象。
     */
    _emitRing() {
        const params = this._subsystems.ring;
        const lifetimeSec = this._sampleStartLifetimeSec(params);
        return {
            params,
            lifetimeSec,
            lifetimeMs: Math.max(16, Math.round((lifetimeSec * 1000) / this._cfg.timeScale)),
            startRotationRad: this._sampleStartRotation(params),
        };
    },

    /**
     * 功能：生成 Ring3 点击爆发粒子集合。
     * 参数：无。
     * 返回：包含参数与粒子数组的发射对象。
     */
    _emitRing3() {
        const out = [];
        const params = this._subsystems.ring3;
        const fallbackLifetimeSec = this._sampleStartLifetimeSec(params);
        const fallbackLifetimeMs = Math.max(16, Math.round((fallbackLifetimeSec * 1000) / this._cfg.timeScale));
        const count = Math.max(0, Math.round(params.clickBurst));
        for (let i = 0; i < count; i++) {
            const itemLifetimeSec = this._sampleStartLifetimeSec(params);
            const itemLifetimeMs = Math.max(16, Math.round((itemLifetimeSec * 1000) / this._cfg.timeScale));
            out.push({
                // JSON: ShapeModule enabled for Ring(3), use radial random angles.
                angle: Math.random() * Math.PI * 2,
                // 保持三角形竖直朝向，并随机翻转为尖朝上或朝下。
                orientBase: Math.random() < 0.5 ? Math.PI * 0.5 : Math.PI * 1.5,
                // PS18 RotationModule.enabled=false, no extra spin.
                spin: 0,
                lifetimeSec: itemLifetimeSec,
                lifetimeMs: itemLifetimeMs,
                speedPxPerSec: this._sampleStartSpeedPx(params),
                sizeMul: this._sampleStartSizeMul(params),
                uvStartFrameNorm: this._sampleUvStartFrameNorm(params),
                uvFrameOverTimeNorm: this._sampleUvFrameOverTimeNorm(params),
            });
        }

        const lifetimeMs = out.reduce((maxMs, item) => Math.max(maxMs, item.lifetimeMs), fallbackLifetimeMs);
        const lifetimeSec = (lifetimeMs * this._cfg.timeScale) / 1000;

        return {
            params,
            lifetimeSec,
            lifetimeMs,
            particles: out,
        };
    },

    /**
     * 功能：生成 Ring4 点击爆发粒子集合。
     * 参数：countOverride 可选粒子数量覆盖值（用于距离发射场景）。
     * 返回：包含参数与粒子数组的发射对象。
     */
    _emitRing4(countOverride = null) {
        const params = this._subsystems.ring4;
        const fallbackLifetimeSec = this._sampleStartLifetimeSec(params);
        const fallbackLifetimeMs = Math.max(16, Math.round((fallbackLifetimeSec * 1000) / this._cfg.timeScale));
        const count = Math.max(0, Math.round(countOverride ?? params.clickBurst));
        const out = [];
        for (let i = 0; i < count; i++) {
            const itemLifetimeSec = this._sampleStartLifetimeSec(params);
            const itemLifetimeMs = Math.max(16, Math.round((itemLifetimeSec * 1000) / this._cfg.timeScale));
            out.push({
                angle: Math.random() * Math.PI * 2,
                // 保持三角形竖直朝向，并随机翻转为尖朝上或朝下。
                orientBase: Math.random() < 0.5 ? Math.PI * 0.5 : Math.PI * 1.5,
                // PS17 RotationModule.enabled=false, no extra spin.
                spin: 0,
                lifetimeSec: itemLifetimeSec,
                lifetimeMs: itemLifetimeMs,
                speedPxPerSec: this._sampleStartSpeedPx(params),
                sizeMul: this._sampleStartSizeMul(params),
                uvStartFrameNorm: this._sampleUvStartFrameNorm(params),
                uvFrameOverTimeNorm: this._sampleUvFrameOverTimeNorm(params),
            });
        }

        const lifetimeMs = out.reduce((maxMs, item) => Math.max(maxMs, item.lifetimeMs), fallbackLifetimeMs);
        const lifetimeSec = (lifetimeMs * this._cfg.timeScale) / 1000;

        return {
            params,
            lifetimeSec,
            lifetimeMs,
            // JSON: Ring(4) burst=0; distance emitter is the main producer.
            particles: out,
        };
    },

    /**
     * 功能：生成 MeshTri 点击爆发弧段集合。
     * 参数：无。
     * 返回：包含参数与弧段数组的发射对象。
     */
    _emitMeshTri() {
        const rings = [];
        const params = this._subsystems.meshTri;
        const lifetimeSec = this._sampleStartLifetimeSec(params);
        const count = Math.max(0, Math.round(params.clickBurst));
        for (let i = 0; i < count; i++) {
            rings.push({
                angle: this._sampleStartRotation(params),
                rotMix: Math.random(),
                radiusMul: this._sampleStartSizeMul(params),
                widthMul: 1.0,
                phase: 0.0,
            });
        }
        return {
            params,
            lifetimeSec,
            lifetimeMs: Math.max(16, Math.round((lifetimeSec * 1000) / this._cfg.timeScale)),
            rings,
        };
    },

    /**
     * 功能：在指定坐标创建一次完整点击特效实例。
     * 参数：x/y 点击坐标。
     * 返回：无。
     */
    _spawnClickEffect(x, y) {
        const scale = this._cfg.globalScale;
        const size = Math.round(360 * scale);
        const half = size / 2;

        const subsystems = {
            fxTouch: this._emitFxTouch(),
            ring: this._emitRing(),
            ring3: this._emitRing3(),
            meshTri: this._emitMeshTri(),
        };

        const durationMs = Math.max(
            subsystems.fxTouch.lifetimeMs,
            subsystems.ring.lifetimeMs,
            subsystems.ring3.lifetimeMs,
            subsystems.meshTri.lifetimeMs
        );

        const state = {
            t: 0,
            durationMs,
            subsystems,
        };

        const actor = new St.DrawingArea({
            reactive: false,
            x: x - half,
            y: y - half,
            width: size,
            height: size,
            opacity: 255,
        });

        this._addActorTop(actor);

        actor.connect('repaint', () => {
            const cr = actor.get_context();
            this._drawClickFrame(cr, half, state);
            cr.$dispose();
        });
        actor.queue_repaint();

        const timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 16, () => {
            state.t += 16;
            if (state.t >= state.durationMs) {
                this._timers.delete(timerId);
                this._destroyActor(actor);
                return GLib.SOURCE_REMOVE;
            }
            actor.queue_repaint();
            return GLib.SOURCE_CONTINUE;
        });

        this._timers.add(timerId);
    },

    /**
     * 功能：计算子系统生命周期进度。
     * 参数：sub 子系统实例，tMs 已流逝毫秒。
     * 返回：0~1 的归一化进度。
     */
    _subProgress(sub, tMs) {
        const lifeMs = sub.lifetimeMs ?? sub.params.lifetimeMs;
        return clamp(tMs / lifeMs, 0, 1);
    },

    /**
     * 功能：按 JSON 的 startLifetime 模式采样生命周期（秒）。
     * 参数：params 子系统参数。
     * 返回：采样后的生命周期秒值。
     */
    _sampleStartLifetimeSec(params) {
        const sampled = this._sampleMinMaxConstant(
            params.startLifetimeMode,
            params.startLifetimeScalar,
            params.startLifetimeMinScalar
        );
        return Math.max(0.0001, sampled);
    },

    /**
     * 功能：按 size 曲线采样当前尺寸系数。
     * 参数：sub 子系统实例，p 归一化进度。
     * 返回：尺寸系数。
     */
    _subSizeCurve(sub, p) {
        return evalScalarStops(sub.params.sizeCurve, p, 1.0);
    },

    /**
     * 功能：按颜色/透明度曲线采样当前颜色。
     * 参数：sub 子系统实例，p 归一化进度，fallbackRgb 回退颜色，fallbackAlpha 回退透明度。
     * 返回：[r,g,b,a]。
     */
    _subColor(sub, p, fallbackRgb, fallbackAlpha = 1.0) {
        const rgb = evalColorStops(sub.params.colorStops, p, fallbackRgb);
        const alpha = evalScalarStops(sub.params.alphaStops, p, fallbackAlpha);
        return [rgb[0], rgb[1], rgb[2], alpha];
    },

    /**
     * 功能：计算 UV 帧动画带来的亮度系数。
     * 参数：sub 子系统实例，p 归一化进度，phase 粒子相位。
     * 返回：亮度系数。
     */
    _uvFrameFactor(sub, p, item = null) {
        if (!sub.params.uvEnabled || sub.params.uvTilesX <= 1)
            return 1.0;

        const tilesX = Math.max(1, Math.round(sub.params.uvTilesX ?? 1));
        const tilesY = Math.max(1, Math.round(sub.params.uvTilesY ?? 1));
        const totalFrames = tilesX * tilesY;
        const cycles = Math.max(0.001, sub.params.uvCycles ?? 1.0);
        const startFrameNorm = item?.uvStartFrameNorm ?? sub.params.uvStartFrame ?? 0;
        const frameOverTimeNorm = item?.uvFrameOverTimeNorm ?? sub.params.uvFrameOverTime ?? 0;

        // 对齐 JSON UVModule(timeMode=0): 以生命周期进度驱动帧进度，并带每粒子随机起始帧。
        const frameNorm = startFrameNorm + frameOverTimeNorm * p * cycles;
        const wrapped = ((frameNorm % 1) + 1) % 1;
        const framePos = wrapped * totalFrames;
        const frame0 = Math.floor(framePos) % totalFrames;
        const frame1 = (frame0 + 1) % totalFrames;
        const blend = framePos - Math.floor(framePos);

        // Ring3/Ring4 的 atlas 当前为 2 帧，这里按帧索引做平滑过渡，避免硬切。
        const uvLut = totalFrames === 2 ? [0.78, 1.0] : [1.0];
        const w0 = uvLut[frame0 % uvLut.length] ?? 1.0;
        const w1 = uvLut[frame1 % uvLut.length] ?? 1.0;
        return lerp(w0, w1, blend);
    },

    /**
     * 功能：采样每粒子 UV 起始帧归一化值。
     * 参数：params 子系统参数。
     * 返回：0~1 归一化帧位置。
     */
    _sampleUvStartFrameNorm(params) {
        const sampled = this._sampleMinMaxConstant(
            params.uvStartFrameMode,
            params.uvStartFrameScalar,
            params.uvStartFrameMinScalar
        );
        return clamp(sampled, 0, 1);
    },

    /**
     * 功能：采样每粒子 UV 帧随时间推进系数。
     * 参数：params 子系统参数。
     * 返回：归一化推进系数。
     */
    _sampleUvFrameOverTimeNorm(params) {
        const sampled = this._sampleMinMaxConstant(
            params.uvFrameOverTimeMode,
            params.uvFrameOverTimeScalar,
            params.uvFrameOverTimeMinScalar
        );
        return Math.max(0, sampled);
    },

    /**
     * 功能：采样 Unity MinMaxConstant（当前支持常量与随机区间）。
     * 参数：mode 模式，scalar 最大值/常量，minScalar 最小值。
     * 返回：采样结果。
     */
    _sampleMinMaxConstant(mode, scalar, minScalar) {
        if (mode === 3) {
            const lo = Math.min(minScalar, scalar);
            const hi = Math.max(minScalar, scalar);
            return randomRange(lo, hi);
        }

        return scalar;
    },

    /**
     * 功能：采样粒子初始尺寸倍率。
     * 参数：params 子系统参数。
     * 返回：相对 params.size 的倍率。
     */
    _sampleStartSizeMul(params) {
        const sampled = this._sampleMinMaxConstant(
            params.startSizeMode,
            params.startSizeScalar,
            params.startSizeMinScalar
        );
        return sampled / Math.max(1e-6, params.size);
    },

    /**
     * 功能：采样粒子初始旋转角。
     * 参数：params 子系统参数。
     * 返回：旋转弧度。
     */
    _sampleStartRotation(params) {
        return this._sampleMinMaxConstant(
            params.startRotationMode,
            params.startRotationScalar,
            params.startRotationMinScalar
        );
    },

    /**
     * 功能：采样并换算粒子初始速度（像素/秒）。
     * 参数：params 子系统参数。
     * 返回：速度（px/s）。
     */
    _sampleStartSpeedPx(params) {
        const sampled = this._sampleMinMaxConstant(
            params.startSpeedMode,
            params.startSpeedScalar,
            params.startSpeedMinScalar
        );
        // 速度像素化统一乘全局尺度，保证不同分辨率/缩放下观感一致。
        return sampled ;
    },

    /**
     * 功能：计算 MeshTri 弧段在当前时刻的附加旋转。
     * 参数：sub 子系统实例，p 生命周期进度，mix 随机混合因子。
     * 返回：旋转弧度。
     */
    _meshTriRotation(sub, p, mix) {
        if (!sub.params.rotationEnabled || p <= 0)
            return 0;

        const lifeSec = sub.lifetimeSec ?? sub.params.lifetimeSec ?? 0;
        if (lifeSec <= 0)
            return 0;

        const blend = clamp(mix, 0, 1);
        const scalar = sub.params.rotationScalar ?? 0;
        const steps = 8;
        let integral = 0;

        // Unity Rotation over Lifetime 是角速度曲线；这里按生命周期归一化时间做数值积分。
        let prev = this._meshTriAngularVelocity(sub, 0, blend, scalar);
        for (let i = 1; i <= steps; i++) {
            const u = (p * i) / steps;
            const curr = this._meshTriAngularVelocity(sub, u, blend, scalar);
            integral += (prev + curr) * 0.5 * (p / steps);
            prev = curr;
        }

        // 屏幕坐标系 y 轴向下，旋转方向做一次反号校正。
        return -integral * lifeSec;
    },

    /**
     * 功能：计算 MeshTri 在归一化时刻的角速度值（弧度/秒）。
     * 参数：sub 子系统实例，p 生命周期进度，blend 随机混合因子，scalar 角速度缩放。
     * 返回：角速度（rad/s）。
     */
    _meshTriAngularVelocity(sub, p, blend, scalar) {
        const minV = evalScalarStops(sub.params.rotationCurveMin, p, 0);
        const maxV = evalScalarStops(sub.params.rotationCurveMax, p, 0);
        return lerp(minV, maxV, blend) * scalar;
    },

    /**
     * 功能：采样 MeshTri customData0 曲线值。
     * 参数：sub 子系统实例，p 生命周期进度。
     * 返回：custom0 标量值。
     */
    _meshTriCustom0(sub, p) {
        return evalScalarStops(sub.params.customData0Curve, p, 1.0);
    },

    /**
     * 功能：绘制点击帧的全部图层。
     * 参数：cr Cairo 上下文，c 画布中心，state 点击特效状态。
     * 返回：无。
     */
    _drawClickFrame(cr, c, state) {
        // 图层顺序直接决定视觉叠加关系：底层晕光 -> 中心点 -> 环与碎片 -> MeshTri。
        const base = this._cfg.colorBase;
        const deep = this._cfg.colorDeep;
        const white = this._cfg.colorWhite;

        this._renderFxTouch(cr, c, state.subsystems.fxTouch, state.t, white);
        this._renderRing(cr, c, state.subsystems.ring, state.t, base, deep, white);
        this._renderRing3(cr, c, state.subsystems.ring3, state.t, base, white);
        this._renderMeshTri(cr, c, state.subsystems.meshTri, state.t, base, deep, white);
    },

    /**
     * 功能：绘制 FX_Touch 的中心闪光层。
     * 参数：cr Cairo 上下文，c 中心坐标，sub 子系统，tMs 当前毫秒，white 白色基准。
     * 返回：无。
     */
    _renderFxTouch(cr, c, sub, tMs, white) {
        const p = this._subProgress(sub, tMs);
        if (p >= 1)
            return;

        const curve = this._subSizeCurve(sub, p);
        const fade = Math.pow(1 - p, 1.8);
        const r = sub.params.localScalePx * Math.max(0, curve);
        cr.setSourceRGBA(white[0], white[1], white[2], 0.72 * fade);
        cr.arc(c, c, r, 0, Math.PI * 2);
        cr.fill();
    },

    /**
     * 功能：绘制 Ring 圆环层。
     * 参数：cr Cairo 上下文，c 中心坐标，sub 子系统，tMs 当前毫秒，base/deep/white 颜色组。
     * 返回：无。
     */
    _renderRing(cr, c, sub, tMs, base, deep, white) {
        const p = this._subProgress(sub, tMs);
        if (p >= 1)
            return;

        const curve = this._subSizeCurve(sub, p);
        const col = this._subColor(sub, p, base, 1.0);
        const radius = sub.params.sizePx * Math.max(0, curve);
        const rot = sub.startRotationRad ?? 0;

        // Ring 贴图在 Unity 中受 startRotation 影响；Cairo 近似为轻微椭圆并应用旋转。
        cr.save();
        cr.translate(c, c);
        cr.rotate(rot);
        cr.scale(1.0, 0.94);
        cr.setSourceRGBA(col[0], col[1], col[2], 0.58 * col[3]);
        cr.arc(0, 0, radius, 0, Math.PI * 2);
        cr.fill();
        cr.restore();

    },

    /**
     * 功能：绘制 Ring3 三角粒子层。
     * 参数：cr Cairo 上下文，c 中心坐标，sub 子系统，tMs 当前毫秒，base/white 颜色组。
     * 返回：无。
     */
    _renderRing3(cr, c, sub, tMs, base, white) {
        if (sub.particles.length === 0)
            return;

        const triMesh = this._meshProfiles?.fxMeshTriangle;

        for (const item of sub.particles) {
            const p = clamp(tMs / (item.lifetimeMs ?? sub.lifetimeMs ?? sub.params.lifetimeMs), 0, 1);
            if (p >= 1)
                continue;

            const lifeSec = item.lifetimeSec ?? sub.lifetimeSec ?? sub.params.lifetimeSec;
            const curve = this._subSizeCurve(sub, p);
            const col = this._subColor(sub, p, base, 1.0);
            // 先算沿径向的位移，再叠加形状半径得到最终飞行半径。
            const dist = item.speedPxPerSec * lifeSec * p;
            const radius = sub.params.localScalePx * (sub.params.shapeScale + dist);
            const x = c + Math.cos(item.angle) * radius;
            const y = c + Math.sin(item.angle) * radius;
            const uv = this._uvFrameFactor(sub, p, item);
            const alpha = clamp(col[3] * uv, 0, 1);
            const size = sub.params.sizePx * item.sizeMul * Math.max(0, curve);
            const rot = (item.orientBase ?? 0) + item.spin * p;
            const drawn = this._drawObjTriangle(cr, x, y, size, rot, [col[0], col[1], col[2]], white, alpha, triMesh);
            if (!drawn)
                this._drawTriangle(cr, x, y, size, rot, [col[0], col[1], col[2]], white, alpha);
        }
    },

    /**
     * 功能：绘制 Ring4 三角粒子层（点击 burst 场景）。
     * 参数：cr Cairo 上下文，c 中心坐标，sub 子系统，tMs 当前毫秒，base/white 颜色组。
     * 返回：无。
     */
    _renderRing4(cr, c, sub, tMs, base, white) {
        if (sub.particles.length === 0)
            return;

        const triMesh = this._meshProfiles?.fxMeshTriangle;

        for (const item of sub.particles) {
            const p = clamp(tMs / (item.lifetimeMs ?? sub.lifetimeMs ?? sub.params.lifetimeMs), 0, 1);
            if (p >= 1)
                continue;

            const lifeSec = item.lifetimeSec ?? sub.lifetimeSec ?? sub.params.lifetimeSec;
            const curve = this._subSizeCurve(sub, p);
            const col = this._subColor(sub, p, base, 1.0);
            const dist = item.speedPxPerSec * lifeSec * p;
            const radius = sub.params.localScalePx * (sub.params.shapeScale + dist);
            const x = c + Math.cos(item.angle) * radius;
            const y = c + Math.sin(item.angle) * radius;
            const uv = this._uvFrameFactor(sub, p, item);
            const alpha = clamp(col[3] * uv, 0, 1);
            const size = sub.params.sizePx * item.sizeMul * Math.max(0, curve);
            const rot = (item.orientBase ?? 0) + item.spin * p;
            const drawn = this._drawObjTriangle(cr, x, y, size, rot, [col[0], col[1], col[2]], white, alpha, triMesh);
            if (!drawn)
                this._drawTriangle(cr, x, y, size, rot, [col[0], col[1], col[2]], white, alpha);
        }
    },

    /**
     * 功能：绘制 MeshTri 弧段层。
     * 参数：cr Cairo 上下文，c 中心坐标，sub 子系统，tMs 当前毫秒，base/deep/white 颜色组。
     * 返回：无。
     */
    _renderMeshTri(cr, c, sub, tMs, base, deep, white) {
        const p = this._subProgress(sub, tMs);
        if (p >= 1)
            return;

        const profile = this._meshProfiles?.cylinder002 ?? {
            innerRadiusNorm: 1.0,
            outerRadiusNorm: 1.0636685,
            segmentCount: 64,
            vertices: null,
            faces: null,
        };

        // JSON mapping for GameObject "MeshTri": mesh ring style (burst=2), broken arcs.
        for (const item of sub.rings) {
            const localP = clamp(p + item.phase * 0.08, 0, 1);
            const curve = this._subSizeCurve(sub, localP);
            const col = this._subColor(sub, localP, base, 1.0);
            // MeshTri radius does not use LocalScale; use StartSize + SizeModule directly.
            const baseRadius = sub.params.sizePx * item.radiusMul * Math.max(0, curve);
            const innerR = baseRadius * profile.innerRadiusNorm;
            const outerR = baseRadius * profile.outerRadiusNorm;
            const width = Math.max(0.9, (outerR - innerR) * item.widthMul);
            const custom0 = this._meshTriCustom0(sub, localP);
            // Arc length is driven only by vector0_0 (1->0->1): short -> long -> short.
            const dynamicLen = lerp(0, Math.PI * 2, clamp(1 - custom0, 0, 1));
            const center = item.angle + this._meshTriRotation(sub, localP, item.rotMix);
            const start = center;
            const end = center + dynamicLen;
            if (dynamicLen <= 0.04)
                continue;

            // 末端阶段额外衰减，避免弧段在生命周期尾部突然消失。
            const endFade = localP < 0.84 ? 1.0 : clamp((1 - localP) / 0.16, 0, 1);
            const brightness = clamp((0.34 + (1 - custom0) * 0.96) * endFade, 0, 1.4);
            const midR = lerp(col[0], white[0], 0.32);
            const midG = lerp(col[1], white[1], 0.32);
            const midB = lerp(col[2], white[2], 0.32);

            let faceCount = 0;
            if (profile.vertices && profile.faces)
                faceCount = this._buildObjArcMeshPath(cr, c, start, end, baseRadius, profile.vertices, profile.faces);
            if (faceCount === 0)
                this._buildObjRingSegmentPath(cr, c, start, end, innerR, outerR, profile.segmentCount);

            const g = new Cairo.RadialGradient(c, c, innerR, c, c, outerR);
            g.addColorStopRGBA(0.00, deep[0], deep[1], deep[2], 0.14 * col[3] * brightness);
            g.addColorStopRGBA(0.45, midR, midG, midB, 0.78 * col[3] * brightness);
            g.addColorStopRGBA(0.55, white[0], white[1], white[2], 0.95 * col[3] * brightness);
            g.addColorStopRGBA(1.00, deep[0], deep[1], deep[2], 0.14 * col[3] * brightness);
            cr.setSource(g);
            cr.fill();

            const midRadius = (innerR + outerR) * 0.5;
            cr.setLineWidth(Math.max(0.7, width * 0.20));
            cr.setSourceRGBA(white[0], white[1], white[2], 0.60 * col[3] * brightness);
            cr.arc(c, c, midRadius, start, end);
            cr.stroke();
        }
    },

    /**
     * 功能：绘制简化版等边三角形（OBJ 回退）。
     * 参数：cr Cairo 上下文，x/y 位置，size 尺寸，orient 旋转，baseCol/highlightCol 颜色，alpha 透明度。
     * 返回：无。
     */
    _drawTriangle(cr, x, y, size, orient, baseCol, highlightCol, alpha) {
        const side = size * 1.35;
        const h = side * 0.8660254;

        cr.save();
        cr.translate(x, y);
        cr.rotate(orient);

        cr.setSourceRGBA(baseCol[0], baseCol[1], baseCol[2], alpha);
        cr.moveTo(0, -2 * h / 3);
        cr.lineTo(-side / 2, h / 3);
        cr.lineTo(side / 2, h / 3);
        cr.closePath();
        cr.fill();

        cr.setSourceRGBA(highlightCol[0], highlightCol[1], highlightCol[2], alpha * 0.25);
        cr.moveTo(0, -2 * h / 3);
        cr.lineTo(-side * 0.25, -h * 0.02);
        cr.lineTo(side * 0.25, -h * 0.02);
        cr.closePath();
        cr.fill();

        cr.restore();
    },

    /**
     * 功能：按 OBJ 网格绘制三角粒子。
     * 参数：cr Cairo 上下文，x/y 位置，size 尺寸，orient 旋转，baseCol/highlightCol 颜色，alpha 透明度，mesh 网格。
     * 返回：是否绘制成功。
     */
    _drawObjTriangle(cr, x, y, size, orient, baseCol, highlightCol, alpha, mesh) {
        if (!mesh?.vertices || !mesh?.faces)
            return false;

        const baseTris = this._buildObjMeshPath(cr, x, y, size, orient, mesh.vertices, mesh.faces);
        if (baseTris <= 0)
            return false;

        cr.setSourceRGBA(baseCol[0], baseCol[1], baseCol[2], alpha);
        cr.fill();

        const hx = x + Math.cos(orient - Math.PI / 2) * size * 0.06;
        const hy = y + Math.sin(orient - Math.PI / 2) * size * 0.06;
        const hiTris = this._buildObjMeshPath(cr, hx, hy, size * 0.56, orient, mesh.vertices, mesh.faces);
        if (hiTris > 0) {
            cr.setSourceRGBA(highlightCol[0], highlightCol[1], highlightCol[2], alpha * 0.25);
            cr.fill();
        }

        return true;
    },

    /**
     * 功能：开始一段新的拖尾笔划，并显式断开与上一段的连线。
     * 参数：x/y 新笔划起点。
     * 返回：无。
     */
    _beginTrailStroke(x, y) {
        const cfg = this._cfg;
        const trail = this._subsystems?.trail;
        if (!cfg.enableTrail || !trail || cfg.timeScale <= trail.killUnderTimeScale)
            return;
        if (!Number.isFinite(x) || !Number.isFinite(y))
            return;

        this._ensureTrailStream();
        const stream = this._trailStream;
        if (!stream)
            return;

        const nowMs = Date.now();
        const last = stream.points[stream.points.length - 1];
        if (last && last.penUp && Math.hypot(last.x - x, last.y - y) < 0.35) {
            last.x = x;
            last.y = y;
            last.tMs = nowMs;
        } else {
            // penUp 点用于把新笔划与上一笔划断开。
            stream.points.push({x, y, tMs: nowMs, penUp: true});
        }

        if (stream.points.length > 320)
            stream.points.splice(0, stream.points.length - 320);
        stream.dirty = true;
    },

    /**
     * 功能：向连续拖尾流追加一段轨迹采样。
     * 参数：x1/y1 起点，x2/y2 终点。
     * 返回：无。
     */
    _spawnTrailSegment(x1, y1, x2, y2) {
        const cfg = this._cfg;
        const trail = this._subsystems?.trail;
        if (!trail || cfg.timeScale <= trail.killUnderTimeScale)
            return;
        if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2))
            return;

        this._ensureTrailStream();
        const stream = this._trailStream;
        if (!stream)
            return;

        const nowMs = Date.now();
        const pushPoint = (x, y, penUp = false) => {
            const last = stream.points[stream.points.length - 1];
            if (last && !last.penUp && !penUp && Math.hypot(last.x - x, last.y - y) < 0.35) {
                last.tMs = nowMs;
                return;
            }
            stream.points.push({x, y, tMs: nowMs, penUp});
        };

        if (stream.points.length === 0)
            pushPoint(x1, y1, true);
        pushPoint(x2, y2);

        if (stream.points.length > 320)
            stream.points.splice(0, stream.points.length - 320);
        stream.dirty = true;
    },

    /**
     * 功能：确保连续拖尾流已创建并运行。
     * 参数：无。
     * 返回：无。
     */
    _ensureTrailStream() {
        if (this._trailStream)
            return;

        const stageW = Math.max(2, global.stage.width);
        const stageH = Math.max(2, global.stage.height);
        const actor = new St.DrawingArea({
            reactive: false,
            x: 0,
            y: 0,
            width: Math.min(2, stageW),
            height: Math.min(2, stageH),
            opacity: 255,
        });

        const stream = {
            actor,
            points: [],
            timerId: 0,
            dirty: true,
        };

        this._trailStream = stream;
        this._addActorTop(actor);

        actor.connect('repaint', () => {
            const cr = actor.get_context();
            this._drawTrailStreamFrame(cr, stream);
            cr.$dispose();
        });
        actor.queue_repaint();

        stream.timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 16, () => {
            if (this._trailStream !== stream)
                return GLib.SOURCE_REMOVE;

            this._pruneTrailStreamPoints(stream, Date.now());
            const trail = this._subsystems?.trail;
            if (!this._cfg.enableTrail || !trail || this._cfg.timeScale <= trail.killUnderTimeScale)
                stream.points.length = 0;

            this._updateTrailStreamActorRect(stream);
            if (stream.points.length > 1 || stream.dirty)
                actor.queue_repaint();
            stream.dirty = false;

            if (!this._pointerDown && stream.points.length === 0) {
                this._timers.delete(stream.timerId);
                this._destroyActor(actor);
                this._trailStream = null;
                return GLib.SOURCE_REMOVE;
            }

            return GLib.SOURCE_CONTINUE;
        });

        this._timers.add(stream.timerId);
    },

    /**
     * 功能：按拖尾寿命裁剪过期采样点。
     * 参数：stream 拖尾流状态，nowMs 当前时间戳。
     * 返回：无。
     */
    _pruneTrailStreamPoints(stream, nowMs) {
        const trail = this._subsystems?.trail;
        const lifeMs = Math.max(1, Math.round((trail?.lifetimeSec ?? 0.3) * 1000 / this._cfg.timeScale));
        let firstAlive = 0;
        while (firstAlive < stream.points.length && nowMs - stream.points[firstAlive].tMs > lifeMs)
            firstAlive++;
        if (firstAlive > 0)
            stream.points.splice(0, firstAlive);
    },

    /**
     * 功能：根据拖尾点包围盒更新 actor 区域，降低整屏重绘成本。
     * 参数：stream 拖尾流状态。
     * 返回：无。
     */
    _updateTrailStreamActorRect(stream) {
        const actor = stream.actor;
        const points = stream.points;
        const trail = this._subsystems?.trail;

        if (!points || points.length === 0) {
            if (actor.width !== 2 || actor.height !== 2)
                actor.set_size(2, 2);
            if (actor.x !== 0 || actor.y !== 0)
                actor.set_position(0, 0);
            return;
        }

        let minX = points[0].x;
        let minY = points[0].y;
        let maxX = points[0].x;
        let maxY = points[0].y;
        for (let i = 1; i < points.length; i++) {
            const p = points[i];
            if (p.x < minX)
                minX = p.x;
            if (p.y < minY)
                minY = p.y;
            if (p.x > maxX)
                maxX = p.x;
            if (p.y > maxY)
                maxY = p.y;
        }

        const pad = Math.max(4, (trail?.widthPx ?? 1.0) * 3.0);
        const stageW = Math.max(2, global.stage.width);
        const stageH = Math.max(2, global.stage.height);

        let x = Math.floor(minX - pad);
        let y = Math.floor(minY - pad);
        let w = Math.ceil(maxX - minX + pad * 2);
        let h = Math.ceil(maxY - minY + pad * 2);

        x = clamp(x, 0, stageW - 2);
        y = clamp(y, 0, stageH - 2);
        w = clamp(w, 2, stageW - x);
        h = clamp(h, 2, stageH - y);

        if (actor.x !== x || actor.y !== y)
            actor.set_position(x, y);
        if (actor.width !== w || actor.height !== h)
            actor.set_size(w, h);
    },

    /**
     * 功能：按 Gradient 模式采样 trail 颜色键（RGB）。
     * 参数：trail trail 参数，tNorm 0~1 归一化位置。
     * 返回：RGB 数组。
     */
    _evalTrailGradientColor(trail, tNorm) {
        const t = clamp(tNorm, 0, 1);
        const keys = trail.colorKeys ?? [];
        if (keys.length === 0)
            return [0, 0, 0];

        if ((trail.gradientMode ?? 0) === 1) {
            let out = keys[0].c ?? [0, 0, 0];
            for (let i = 1; i < keys.length; i++) {
                if (keys[i].t > t)
                    break;
                out = keys[i].c ?? out;
            }
            return out;
        }

        return evalColorStops(keys, t, keys[0].c ?? [0, 0, 0]);
    },

    /**
     * 功能：按 Gradient 模式采样 trail 透明度键（A）。
     * 参数：trail trail 参数，tNorm 0~1 归一化位置。
     * 返回：透明度标量。
     */
    _evalTrailGradientAlpha(trail, tNorm) {
        const t = clamp(tNorm, 0, 1);
        const keys = trail.alphaKeys ?? [];
        if (keys.length === 0)
            return 1.0;

        if ((trail.gradientMode ?? 0) === 1) {
            let out = Number.isFinite(keys[0].v) ? keys[0].v : 1.0;
            for (let i = 1; i < keys.length; i++) {
                if (keys[i].t > t)
                    break;
                out = Number.isFinite(keys[i].v) ? keys[i].v : out;
            }
            return out;
        }

        return evalScalarStops(keys, t, Number.isFinite(keys[0].v) ? keys[0].v : 1.0);
    },

    /**
     * 功能：构建拖尾贴图的一维遮罩查找表（从 FX_TEX_Trail_03.png 提取）。
     * 参数：trail trail 参数。
     * 返回：无。
     */
    _ensureTrailTextureMaskLut(trail) {
        if (this._trailTextureMaskLut)
            return;

        const fallback = () => {
            const n = 128;
            const out = new Array(n);
            for (let i = 0; i < n; i++) {
                const u = i / (n - 1);
                // 近似贴图“头圆尾尖”：前段高亮，后段快速衰减。
                out[i] = clamp(1.0 - Math.pow(u, 0.62) * 1.55, 0.0, 1.0);
            }
            this._trailTextureMaskLut = out;
        };

        try {
            const texName = trail.textureAsset ?? 'FX_TEX_Trail_03.png';
            const texPath = GLib.build_filenamev([this.path, 'assets', texName]);
            const pix = GdkPixbuf.Pixbuf.new_from_file(texPath);
            const w = pix.get_width();
            const h = pix.get_height();
            const nCh = pix.get_n_channels();
            const stride = pix.get_rowstride();
            const hasAlpha = pix.get_has_alpha();
            const buf = pix.get_pixels();

            const n = 128;
            const out = new Array(n);
            const y0 = Math.max(0, Math.floor(h * 0.45));
            const y1 = Math.min(h - 1, Math.ceil(h * 0.55));

            for (let i = 0; i < n; i++) {
                const u = i / (n - 1);
                const x = Math.round(u * (w - 1));
                let sum = 0;
                let cnt = 0;
                for (let y = y0; y <= y1; y++) {
                    const p = y * stride + x * nCh;
                    const r = buf[p + 0] / 255;
                    const g = buf[p + 1] / 255;
                    const b = buf[p + 2] / 255;
                    const a = hasAlpha ? buf[p + 3] / 255 : 1.0;
                    const lum = (r + g + b) / 3;
                    sum += lum * a;
                    cnt++;
                }
                out[i] = cnt > 0 ? clamp(sum / cnt, 0.0, 1.0) : 0.0;
            }

            this._trailTextureMaskLut = out;
        } catch (e) {
            this._log(`trail texture load fallback: ${e}`);
            fallback();
        }
    },

    /**
     * 功能：按归一化位置采样拖尾贴图遮罩值。
     * 参数：tNorm 0~1 归一化位置（0=head,1=tail）。
     * 返回：0~1 遮罩系数。
     */
    _sampleTrailTextureMask(tNorm) {
        const lut = this._trailTextureMaskLut;
        if (!Array.isArray(lut) || lut.length === 0)
            return 1.0;

        const t = clamp(tNorm, 0, 1) * (lut.length - 1);
        const i0 = Math.floor(t);
        const i1 = Math.min(lut.length - 1, i0 + 1);
        const f = t - i0;
        return lerp(lut[i0], lut[i1], f);
    },

    /**
     * 功能：绘制连续拖尾单帧内容。
     * 参数：cr Cairo 上下文，stream 拖尾流状态。
     * 返回：无。
     *
     * 详细说明：
     * - 该函数负责将当前拖尾流的所有有效线段绘制到画布上。
     * - 拖尾的每一段颜色、宽度、透明度均按“生命周期进度”采样（即 Unity TrailRenderer 的 colorGradient 语义），
     *   并结合贴图遮罩 LUT、HDR 增益、加色混合等实现近似原始视觉。
     * - 支持多段断笔（penUp）与局部重绘，极大降低性能开销。
     */
    _drawTrailStreamFrame(cr, stream) {
        // 若拖尾点数不足两点，直接返回。
        if (!stream || stream.points.length < 2)
            return;

        // 读取当前 trail 子系统参数。
        const trail = this._subsystems?.trail;
        if (!trail)
            return;

        // 确保已构建拖尾贴图遮罩查找表（LUT），用于头宽尾窄遮罩采样。
        this._ensureTrailTextureMaskLut(trail);

        // ox/oy 为当前 actor 的左上角坐标（用于将全局点坐标转为局部）。
        const ox = stream.actor.x;
        const oy = stream.actor.y;
        // 线帽/线角样式：有 cap/cornerVertices 时用圆头/圆角，否则方头/斜角。
        const lineCap = (trail.numCapVertices ?? 0) > 0 ? 1 : 0;
        const lineJoin = (trail.numCornerVertices ?? 0) > 0 ? 1 : 0;
        // 拖尾基础宽度（像素），防止过细。
        const baseWidth = Math.max(0.2, trail.widthPx ?? 1.0);
        // 材质 HDR 增益（来自 .mat），用于整体亮度缩放。
        const hdrGain = Math.max(1.0, trail.hdrGain ?? 1.0);
        // hdrScale 控制发光强度（经验值归一化到 0.6~3.0）。
        const hdrScale = clamp(hdrGain / 8.0, 0.6, 3.0);

        // 拖尾寿命（毫秒），按 timeScale 换算。
        const lifeMs = Math.max(1, Math.round((trail.lifetimeSec ?? 0.3) * 1000 / this._cfg.timeScale));
        // 当前时间戳。
        const nowMs = Date.now();

        cr.save();
        // 使用加色混合（ADD），近似 Unity 的发光/叠加效果。
        cr.setOperator(Cairo.Operator.ADD);

        // 遍历所有连续点对，逐段绘制拖尾。
        // 注意：每段的颜色/透明度/宽度均按“点的年龄”采样（生命周期归一化 0~1）。
        for (let i = 1; i < stream.points.length; i++) {
            const p0 = stream.points[i - 1];
            const p1 = stream.points[i];

            // penUp 表示断笔（新笔划起点），不连线。
            if (p1.penUp)
                continue;

            // 坐标转为 actor 局部。
            const x0 = p0.x - ox;
            const y0 = p0.y - oy;
            const x1 = p1.x - ox;
            const y1 = p1.y - oy;
            // 距离过短（抖动/重叠）跳过。
            if (Math.hypot(x1 - x0, y1 - y0) < 1e-3)
                continue;

            // 计算两端点的“生命周期进度”age（0=新，1=尾部），用于采样渐变与遮罩。
            const age0 = clamp((nowMs - p0.tMs) / lifeMs, 0, 1);
            const age1 = clamp((nowMs - p1.tMs) / lifeMs, 0, 1);
            // 采样贴图遮罩（头宽尾窄），mask0/mask1 为 0~1。
            const mask0 = this._sampleTrailTextureMask(age0);
            const mask1 = this._sampleTrailTextureMask(age1);
            // maskMid 用于宽度插值，防止极细段不可见。
            const maskMid = Math.max(0.02, (mask0 + mask1) * 0.5);
            if (maskMid <= 0.005)
                continue;

            // 采样两端颜色（RGB）与透明度（A），均按生命周期进度。
            const brightcolor = this._evalTrailGradientColor(trail, 0);
            const a0 = this._evalTrailGradientAlpha(trail, age0) * mask0;
            const a1 = this._evalTrailGradientAlpha(trail, age1) * mask1 ;

            // 构造主线性渐变（core）：高亮主色。
            const core = new Cairo.LinearGradient(x0, y0, x1, y1);
            core.addColorStopRGBA(0.0, brightcolor[0], brightcolor[1], brightcolor[2], clamp(a0 * (0.50 + 0.26 * hdrScale), 0, 1));
            core.addColorStopRGBA(1.0, brightcolor[0], brightcolor[1], brightcolor[2], clamp(a1 * (0.50 + 0.26 * hdrScale), 0, 1));

            // 构造发光晕染层（bloom）：更宽更淡。
            const bloom = new Cairo.LinearGradient(x0, y0, x1, y1);
            bloom.addColorStopRGBA(0.0, brightcolor[0], brightcolor[1], brightcolor[2], clamp(a0 * (0.16 + 0.12 * hdrScale), 0, 1));
            bloom.addColorStopRGBA(1.0, brightcolor[0], brightcolor[1], brightcolor[2], clamp(a1 * (0.16 + 0.12 * hdrScale), 0, 1));

            // 先画发光层（更宽），再画主线。
            cr.setLineCap(lineCap);
            cr.setLineJoin(lineJoin);
            cr.setLineWidth(baseWidth * maskMid * (1.6 + 0.24 * hdrScale));
            cr.setSource(bloom);
            cr.moveTo(x0, y0);
            cr.lineTo(x1, y1);
            cr.stroke();

            cr.setLineWidth(baseWidth * maskMid);
            cr.setSource(core);
            cr.moveTo(x0, y0);
            cr.lineTo(x1, y1);
            cr.stroke();
        }

        cr.restore();
    },

    /**
     * 功能：按距离阈值触发 Ring4 连发发射器。
     * 参数：x/y 发射中心。
     * 返回：无。
     */
    _spawnDistanceEmitter(x, y, emitEvents = 1) {
        // 按移动距离触发 Ring4 粒子，形成“拖动连发”效果。
        const ring4 = this._subsystems.ring4;
        const size = Math.round(360 * this._cfg.globalScale);
        const half = size / 2;
        const burstCount = Math.max(1, Math.round((ring4.distanceBurst ?? 1) * emitEvents));
        const ring4Sub = this._emitRing4(burstCount);

        const state = {
            t: 0,
            durationMs: ring4Sub.lifetimeMs,
            subsystems: {
                ring4: ring4Sub,
            },
        };

        const actor = new St.DrawingArea({
            reactive: false,
            x: x - half,
            y: y - half,
            width: size,
            height: size,
            opacity: 255,
        });

        this._addActorTop(actor);

        actor.connect('repaint', () => {
            const cr = actor.get_context();
            this._renderRing4(cr, half, state.subsystems.ring4, state.t, this._cfg.colorBase, this._cfg.colorWhite);
            cr.$dispose();
        });
        actor.queue_repaint();

        const timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 16, () => {
            state.t += 16;
            if (state.t >= state.durationMs) {
                this._timers.delete(timerId);
                this._destroyActor(actor);
                return GLib.SOURCE_REMOVE;
            }
            actor.queue_repaint();
            return GLib.SOURCE_CONTINUE;
        });

        this._timers.add(timerId);
    },
};
