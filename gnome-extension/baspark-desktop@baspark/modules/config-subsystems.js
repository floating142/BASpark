import {
    clamp,
    parseRgb,
    UNITY_SIZE_TO_PX,
} from './core-utils.js';

export const configSubsystemMethods = {
    /**
     * 功能：从 GSettings 读取运行时配置并完成边界裁剪。
     * 参数：无（使用 this._settings）。
     * 返回：无（结果写入 this._cfg）。
     */
    _loadConfig() {
        const s = this._settings;
        // 这里是运行时行为开关与调参入口。
        this._cfg = {
            debugLog: s.get_boolean('debug-log'),
            pollIntervalMs: clamp(s.get_int('poll-interval-ms'), 8, 100),
            timeScale: clamp(s.get_double('time-scale'), 0.2, 5.0),
            globalScale: clamp(s.get_double('global-scale'), 0.5, 5.0),
            dedupeDistancePx: clamp(s.get_int('dedupe-distance-px'), 0, 30),
            dedupeTimeMs: clamp(s.get_int('dedupe-time-ms'), 0, 500),
            capturedPriorityWindowMs: clamp(s.get_int('captured-priority-window-ms'), 0, 500),

            enableTrail: s.get_boolean('enable-trail'),

            enableDistanceEmitter: s.get_boolean('enable-distance-emitter'),
            distanceEmitStepPx: clamp(s.get_int('distance-emit-step-px'), 50, 200),

            colorBase: parseRgb(s.get_string('color-base-rgb'), [0.3349, 0.7416, 1.0]),
            colorDeep: parseRgb(s.get_string('color-deep-rgb'), [0.09, 0.43, 0.86]),
            colorWhite: parseRgb(s.get_string('color-white-rgb'), [1, 1, 1]),
        };
    },

    /**
     * 功能：构建五个子系统的运行时参数映射（Unity 参数 -> 像素域参数）。
     * 参数：无（依赖 this._cfg.timeScale 与 this._cfg.globalScale）。
     * 返回：无（结果写入 this._subsystems）。
     */
    _buildSubsystemMap() {
        const ts = this._cfg.timeScale;
        const gs = this._cfg.globalScale;

        // Unity 解包参数逐项映射（lifetime / size / speed / rateOverDistance）。
        const raw = {
            fxTouch: {
                lifetimeSec: 0.0001,
                size: 1.0,
                localScale: 1.0,
                // PS15 InitialModule.startSize (mode=0, scalar=1.0)
                startSizeMode: 0,
                startSizeScalar: 1.0,
                startSizeMinScalar: 1.0,
                speed: 0.0,
                rateOverDistance: 0.0,
                clickBurst: 0,
                sizeCurve: [
                    {t: 0.0, v: 0.0},
                    {t: 1.0, v: 1.0},
                ],
                colorStops: [
                    {t: 0.0, c: [1.0, 1.0, 1.0]},
                    {t: 1.0, c: [1.0, 1.0, 1.0]},
                ],
                alphaStops: [
                    {t: 0.0, v: 1.0},
                    {t: 1.0, v: 1.0},
                ],
                shapeEnabled: false,
                uvEnabled: false,
            },
            ring: {
                lifetimeSec: 0.2,
                
                size: 0.12,
                localScale: 1.0,
                // PS15 InitialModule.startSize (mode=0, scalar=0.12)
                startSizeMode: 0,
                startSizeScalar: 0.11999999731779099,
                startSizeMinScalar: 0.14000000059604645,
                // PS15 InitialModule.startRotation (mode=3, random between 0 and 2PI)
                startRotationMode: 3,
                startRotationScalar: 6.283185005187988,
                startRotationMinScalar: 0.0,
                speed: 0.0,
                rateOverDistance: 0.0,
                clickBurst: 1,
                sizeCurve: [
                    {t: 0.0, v: 0.32583582401275635, inSlope: 2.4004733562469482, outSlope: 2.4004733562469482},
                    {t: 0.21392822265625, v: 0.7159773111343384, inSlope: 0.9115744829177856, outSlope: 0.9115744829177856},
                    {t: 1.0, v: 1.0, inSlope: 0.0, outSlope: 0.0},
                ],
                colorStops: [
                    {t: 0.0, c: [1.0, 1.0, 1.0]},
                    {t: 7903 / 65535, c: [0.24056601524353027, 0.39061814546585083, 1.0]},
                    {t: 1.0, c: [0.24056601524353027, 0.39061814546585083, 1.0]},
                ],
                alphaStops: [
                    {t: 0.0, v: 1.0},
                    {t: 7132 / 65535, v: 1.0},
                    {t: 1.0, v: 0.0},
                ],
                shapeEnabled: false,
                uvEnabled: false,
            },
            ring3: {
                lifetimeSec: 0.6,
                // PS18 InitialModule.startLifetime (mode=3, random between 0.6 and 0.7)
                startLifetimeMode: 3,
                startLifetimeScalar: 0.6000000238418579,
                startLifetimeMinScalar: 0.699999988079071,
                size: 0.2,
                // Transform_7.m_LocalScale.x
                localScale: 0.3078823983669281,
                // PS18 InitialModule.startSpeed (mode=3, random between 0.3 and 0.4)
                startSpeedMode: 3,
                startSpeedScalar: 0.4000000059604645,
                startSpeedMinScalar: 0.30000001192092896,
                // PS18 InitialModule.startSize (mode=3, random between 0.1 and 0.2)
                startSizeMode: 3,
                startSizeScalar: 0.20000000298023224,
                startSizeMinScalar: 0.10000000149011612,
                speed: 0.4,
                rateOverDistance: 0.0,
                shapeScale: 0.30000001192092896,
                // JSON (PS18) burst scalar=4.
                clickBurst: 4,
                sizeCurve: [
                    {t: 0.0, v: 0.0, inSlope: 0.0, outSlope: 0.0},
                    {t: 0.15445095300674438, v: 1.0, inSlope: 0.0, outSlope: 0.0},
                    {t: 1.0, v: 0.0, inSlope: -2.1621501445770264, outSlope: -2.1621501445770264},
                ],
                colorStops: [
                    {t: 11951 / 65535, c: [1.0, 1.0, 1.0]},
                    {t: 18504 / 65535, c: [0.37264150381088257, 0.7731872797012329, 1.0]},
                    {t: 30262 / 65535, c: [0.37254902720451355, 0.7725490927696228, 1.0]},
                    {t: 43369 / 65535, c: [0.3529411852359772, 0.729411780834198, 0.9450981020927429]},
                    {t: 54163 / 65535, c: [0.37254902720451355, 0.7725490927696228, 1.0]},
                    {t: 1.0, c: [0.37254902720451355, 0.7725490927696228, 1.0]},
                ],
                alphaStops: [
                    {t: 18890 / 65535, v: 1.0},
                    {t: 23901 / 65535, v: 0.0},
                    {t: 30840 / 65535, v: 1.0},
                    {t: 37586 / 65535, v: 0.0},
                    {t: 43754 / 65535, v: 1.0},
                    {t: 49537 / 65535, v: 0.0},
                    {t: 55898 / 65535, v: 1.0},
                    {t: 1.0, v: 1.0},
                ],
                shapeEnabled: true,
                uvEnabled: true,
                uvTilesX: 2,
                uvTilesY: 1,
                uvCycles: 1.0,
                uvStartFrameMode: 3,
                uvStartFrameScalar: 0.5,
                uvStartFrameMinScalar: 0.0,
                uvStartFrame: 0.5,
                uvFrameOverTimeMode: 3,
                uvFrameOverTimeScalar: 0.5,
                uvFrameOverTimeMinScalar: 0.0,
                uvFrameOverTime: 0.5,
            },
            ring4: {
                lifetimeSec: 0.2,
                // PS17 InitialModule.startLifetime (mode=3, random between 0.2 and 0.4)
                startLifetimeMode: 3,
                startLifetimeScalar: 0.20000000298023224,
                startLifetimeMinScalar: 0.4000000059604645,
                size: 0.2,
                // Transform_8.m_LocalScale.x
                localScale: 0.3078823983669281,
                // PS17 InitialModule.startSpeed (mode=3, random between 0.2 and 0.3)
                startSpeedMode: 3,
                startSpeedScalar: 0.20000000298023224,
                startSpeedMinScalar: 0.30000001192092896,
                // PS17 InitialModule.startSize (mode=3, random between 0.1 and 0.2)
                startSizeMode: 3,
                startSizeScalar: 0.20000000298023224,
                startSizeMinScalar: 0.10000000149011612,
                speed: 0.2,
                rateOverDistance: 5.0,
                shapeScale: 0.15000000596046448,
                // JSON (PS17) burst count is 0; this system is driven by rateOverDistance.
                clickBurst: 0,
                // 每次距离触发对应一次发射事件（基础发射数为 1）。
                distanceBurst: 1,
                sizeCurve: [
                    {t: 0.0, v: 0.0, inSlope: 0.0, outSlope: 0.0},
                    {t: 0.15445095300674438, v: 1.0, inSlope: 0.0, outSlope: 0.0},
                    {t: 1.0, v: 0.0, inSlope: -2.1621501445770264, outSlope: -2.1621501445770264},
                ],
                colorStops: [
                    {t: 11951 / 65535, c: [1.0, 1.0, 1.0]},
                    {t: 18504 / 65535, c: [0.37264150381088257, 0.7731872797012329, 1.0]},
                    {t: 30262 / 65535, c: [0.37254902720451355, 0.7725490927696228, 1.0]},
                    {t: 43369 / 65535, c: [0.3529411852359772, 0.729411780834198, 0.9450981020927429]},
                    {t: 54163 / 65535, c: [0.37254902720451355, 0.7725490927696228, 1.0]},
                    {t: 1.0, c: [0.37254902720451355, 0.7725490927696228, 1.0]},
                ],
                alphaStops: [
                    {t: 18890 / 65535, v: 1.0},
                    {t: 23901 / 65535, v: 0.0},
                    {t: 30840 / 65535, v: 1.0},
                    {t: 37586 / 65535, v: 0.0},
                    {t: 43754 / 65535, v: 1.0},
                    {t: 49537 / 65535, v: 0.0},
                    {t: 55898 / 65535, v: 1.0},
                    {t: 1.0, v: 1.0},
                ],
                shapeEnabled: true,
                uvEnabled: true,
                uvTilesX: 2,
                uvTilesY: 1,
                uvCycles: 1.0,
                uvStartFrameMode: 3,
                uvStartFrameScalar: 0.5,
                uvStartFrameMinScalar: 0.0,
                uvStartFrame: 0.5,
                uvFrameOverTimeMode: 3,
                uvFrameOverTimeScalar: 0.5,
                uvFrameOverTimeMinScalar: 0.0,
                uvFrameOverTime: 0.5,
            },
            meshTri: {
                lifetimeSec: 0.6,
                size: 0.12,
                localScale: 1.0,
                startSpeedMode: 0,
                startSpeedScalar: 0.0,
                startSpeedMinScalar: 0.0,
                // PS16 InitialModule.startSize (mode=3, random between 0.12 and 0.14)
                startSizeMode: 3,
                startSizeScalar: 0.11999999731779099,
                startSizeMinScalar: 0.14000000059604645,
                // PS16 InitialModule.startRotation (mode=3, random between 0 and 2PI)
                startRotationMode: 3,
                startRotationScalar: 6.283185005187988,
                startRotationMinScalar: 0.0,
                speed: 0.0,
                rateOverDistance: 0.0,
                clickBurst: 2,
                rotationEnabled: true,
                rotationScalar: 11.170106887817383,
                rotationCurveMin: [
                    {t: 0.14903903007507324, v: 1.0},
                    {t: 1.0, v: 0.4556182622909546},
                ],
                rotationCurveMax: [
                    {t: 0.1586538404226303, v: 0.7988165616989136},
                    {t: 1.0, v: -0.0650913417339325},
                ],
                // PS16 CustomDataModule.vector0_0.maxCurve: 1 -> 0 -> 1.
                customData0Curve: [
                    {t: 0.0, v: 1.0, inSlope: 0.0, outSlope: 0.0},
                    {t: 0.20000000298023224, v: 0.0, inSlope: 0.0, outSlope: 2.4249367713928223},
                    {t: 1.0, v: 1.0, inSlope: 0.27735635638237, outSlope: 0.27735635638237},
                ],
                sizeCurve: [
                    {t: 0.00720977783203125, v: 0.4205089807510376, inSlope: 2.4004733562469482, outSlope: 2.4004733562469482},
                    {t: 0.21392822265625, v: 0.7159773111343384, inSlope: 0.9115744829177856, outSlope: 0.9115744829177856},
                    {t: 1.0, v: 1.0, inSlope: 0.0, outSlope: 0.0},
                ],
                colorStops: [
                    {t: 7325 / 65535, c: [1.0, 1.0, 1.0]},
                    {t: 32768 / 65535, c: [0.2971698045730591, 0.6532865166664124, 1.0]},
                    {t: 1.0, c: [0.0, 0.08176128566265106, 0.801886796951294]},
                ],
                alphaStops: [
                    {t: 0.0, v: 1.0},
                    {t: 7132 / 65535, v: 1.0},
                    {t: 1.0, v: 1.0},
                ],
                shapeEnabled: false,
                uvEnabled: false,
            },
            trail: {
                // TrailRenderer_13.m_Time
                lifetimeSec: 0.30000001192092896,
                // TrailRenderer_13.m_Parameters.widthMultiplier
                widthMultiplier: 0.004999999888241291,
                // TrailRenderer_13.m_MinVertexDistance
                minVertexDistance: 0.009999999776482582,
                // TrailRenderer_13.m_Parameters.numCornerVertices / numCapVertices
                numCornerVertices: 4,
                numCapVertices: 1,
                // FxTrailTimeScale.killUnderTimeScale
                killUnderTimeScale: 0.19,
                // FX_MAT_TouchFXTrail.mat _Color (HDR)
                hdrColor: [23.968628, 23.968628, 23.968628],
                // _Texture = FX_TEX_Trail_03.png（Stretch + Clamp 语义近似）
                textureAsset: 'FX_TEX_Trail_03.png',
                textureClamp: true,
                // TrailRenderer_13.m_Parameters.colorGradient
                gradientMode: 0,
                colorKeys: [
                    {t: 1349 / 65535, c: [0.0, 0.3905813694000244, 1.0]},
                    {t: 27563 / 65535, c: [0.0, 0.09486991167068481, 0.2823529541492462]},
                    {t: 1.0, c: [0.0, 0.0, 0.0]},
                ],
                alphaKeys: [
                    {t: 0.0, v: 1.0},
                    {t: 1.0, v: 1.0},
                ],
            },
        };

        const mapped = {};
        for (const [key, value] of Object.entries(raw)) {
            const size = value.size ?? 0.0;
            const speed = value.speed ?? 0.0;
            const localScale = value.localScale ?? 1.0;
            const lifetimeSec = value.lifetimeSec ?? 0.0001;
            // 统一补齐可选字段并预计算像素单位，避免渲染阶段重复换算。
            mapped[key] = {
                lifetimeSec,
                size,
                speed,
                rateOverDistance: value.rateOverDistance ?? 0.0,
                clickBurst: value.clickBurst ?? 0,
                sizeCurve: value.sizeCurve ?? null,
                colorStops: value.colorStops ?? null,
                alphaStops: value.alphaStops ?? null,
                gradientMode: value.gradientMode ?? 0,
                colorKeys: value.colorKeys ?? null,
                alphaKeys: value.alphaKeys ?? null,
                shapeEnabled: value.shapeEnabled ?? false,
                uvEnabled: value.uvEnabled ?? false,
                uvTilesX: value.uvTilesX ?? 1,
                uvTilesY: value.uvTilesY ?? 1,
                uvCycles: value.uvCycles ?? 1.0,
                uvStartFrameMode: value.uvStartFrameMode ?? 0,
                uvStartFrameScalar: value.uvStartFrameScalar ?? (value.uvStartFrame ?? 0),
                uvStartFrameMinScalar: value.uvStartFrameMinScalar ?? (value.uvStartFrame ?? 0),
                uvStartFrame: value.uvStartFrame ?? 0,
                uvFrameOverTimeMode: value.uvFrameOverTimeMode ?? 0,
                uvFrameOverTimeScalar: value.uvFrameOverTimeScalar ?? (value.uvFrameOverTime ?? 0),
                uvFrameOverTimeMinScalar: value.uvFrameOverTimeMinScalar ?? (value.uvFrameOverTime ?? 0),
                uvFrameOverTime: value.uvFrameOverTime ?? 0,
                distanceBurst: value.distanceBurst ?? 1,
                localScale,
                startLifetimeMode: value.startLifetimeMode ?? 0,
                startLifetimeScalar: value.startLifetimeScalar ?? lifetimeSec,
                startLifetimeMinScalar: value.startLifetimeMinScalar ?? lifetimeSec,
                startSpeedMode: value.startSpeedMode ?? 0,
                startSpeedScalar: value.startSpeedScalar ?? speed,
                startSpeedMinScalar: value.startSpeedMinScalar ?? speed,
                startSizeMode: value.startSizeMode ?? 0,
                startSizeScalar: value.startSizeScalar ?? size,
                startSizeMinScalar: value.startSizeMinScalar ?? size,
                startRotationMode: value.startRotationMode ?? 0,
                startRotationScalar: value.startRotationScalar ?? 0,
                startRotationMinScalar: value.startRotationMinScalar ?? 0,
                shapeScale: value.shapeScale ?? 0,
                rotationEnabled: value.rotationEnabled ?? false,
                rotationScalar: value.rotationScalar ?? 0,
                rotationCurveMin: value.rotationCurveMin ?? null,
                rotationCurveMax: value.rotationCurveMax ?? null,
                customData0Curve: value.customData0Curve ?? null,
                widthMultiplier: value.widthMultiplier ?? 0.0,
                minVertexDistance: value.minVertexDistance ?? 0.0,
                numCornerVertices: value.numCornerVertices ?? 0,
                numCapVertices: value.numCapVertices ?? 0,
                killUnderTimeScale: value.killUnderTimeScale ?? 0.0,
                hdrColor: value.hdrColor ?? [1, 1, 1],
                textureAsset: value.textureAsset ?? null,
                textureClamp: value.textureClamp ?? true,
                lifetimeMs: Math.max(16, Math.round((lifetimeSec * 1000) / ts)),
                // 保持当前版本的尺度约定：将 localScale 融合进 sizePx 与 speedPxPerSec。
                localScalePx: localScale * UNITY_SIZE_TO_PX * gs,
                sizePx: size * localScale * UNITY_SIZE_TO_PX * gs,
                speedPxPerSec: speed * localScale * UNITY_SIZE_TO_PX * gs,
                widthPx: (value.widthMultiplier ?? 0.0) * UNITY_SIZE_TO_PX * gs,
                minVertexDistancePx: (value.minVertexDistance ?? 0.0) * UNITY_SIZE_TO_PX * gs,
                hdrGain: ((value.hdrColor?.[0] ?? 1) + (value.hdrColor?.[1] ?? 1) + (value.hdrColor?.[2] ?? 1)) / 3,
            };
        }

        this._subsystems = mapped;

        this._log(
            `subsystems mapped: ` +
            `FX_Touch(l=${mapped.fxTouch.lifetimeSec},s=${mapped.fxTouch.size},v=${mapped.fxTouch.speed},rod=${mapped.fxTouch.rateOverDistance}) ` +
            `ring(l=${mapped.ring.lifetimeSec},s=${mapped.ring.size},v=${mapped.ring.speed},rod=${mapped.ring.rateOverDistance}) ` +
            `Ring3(l=${mapped.ring3.lifetimeSec},s=${mapped.ring3.size},v=${mapped.ring3.speed},rod=${mapped.ring3.rateOverDistance}) ` +
            `Ring4(l=${mapped.ring4.lifetimeSec},s=${mapped.ring4.size},v=${mapped.ring4.speed},rod=${mapped.ring4.rateOverDistance}) ` +
            `MeshTri(l=${mapped.meshTri.lifetimeSec},s=${mapped.meshTri.size},v=${mapped.meshTri.speed},rod=${mapped.meshTri.rateOverDistance}) ` +
            `Trail(t=${mapped.trail.lifetimeSec},wMul=${mapped.trail.widthMultiplier},mvd=${mapped.trail.minVertexDistance})`
        );
    },
};
