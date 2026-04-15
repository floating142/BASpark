// 通用数值与曲线工具：所有子模块共享，避免在不同文件重复实现。

// 功能：Unity 尺寸到像素的统一换算基准。
export const UNITY_SIZE_TO_PX = 180.0;
// 功能：Unity RateOverDistance 的参考基准值（用于与代码步长互转）。
export const UNITY_RATE_DISTANCE_BASE = 5.0;

/**
 * 功能：将数值限制在指定区间。
 * 参数：v 原始值，min 下限，max 上限。
 * 返回：裁剪后的数值。
 */
export function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
}

/**
 * 功能：在两个标量之间做线性插值。
 * 参数：a 起点，b 终点，t 插值因子（通常在 0~1）。
 * 返回：插值结果。
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * 功能：二次缓出曲线，常用于更自然的收尾动画。
 * 参数：t 归一化时间（0~1）。
 * 返回：缓动后的系数。
 */
export function easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
}

/**
 * 功能：解析形如 "r,g,b" 的字符串为 0~1 RGB 数组。
 * 参数：text 输入字符串，fallback 解析失败时的回退值。
 * 返回：长度为 3 的 RGB 数组。
 */
export function parseRgb(text, fallback) {
    const parts = `${text}`.split(',').map(s => Number.parseInt(s.trim(), 10));
    if (parts.length !== 3 || parts.some(n => Number.isNaN(n)))
        return fallback;
    // 统一裁剪到 0~255，再转换为 Cairo 使用的 0~1 浮点色值。
    return parts.map(n => clamp(n, 0, 255) / 255);
}

/**
 * 功能：在 [min, max] 区间随机采样一个浮点数。
 * 参数：min 下界，max 上界。
 * 返回：随机浮点数。
 */
export function randomRange(min, max) {
    return min + Math.random() * (max - min);
}

/**
 * 功能：将任意弧度角归一化到 [0, 2PI)。
 * 参数：a 原始角度（弧度）。
 * 返回：归一化后的角度。
 */
export function normalizeAngle(a) {
    const twoPi = Math.PI * 2;
    let out = a % twoPi;
    if (out < 0)
        out += twoPi;
    return out;
}

// 标量曲线采样（优先使用 Unity 风格切线 Hermite，无切线时回退线性）。
/**
 * 功能：按 stops 采样标量曲线。
 * 参数：stops 关键帧数组，t 归一化时间，fallback 缺省值。
 * 返回：采样到的标量值。
 */
export function evalScalarStops(stops, t, fallback = 1.0) {
    if (!Array.isArray(stops) || stops.length === 0)
        return fallback;

    if (t <= stops[0].t)
        return stops[0].v;

    for (let i = 1; i < stops.length; i++) {
        if (t <= stops[i].t) {
            const a = stops[i - 1];
            const b = stops[i];
            return evalScalarSegment(a, b, t);
        }
    }

    return stops[stops.length - 1].v;
}

/**
 * 功能：采样标量曲线单段（Hermite/线性回退）。
 * 参数：a/b 相邻关键帧，t 采样时间。
 * 返回：段内采样值。
 */
function evalScalarSegment(a, b, t) {
    const dt = Math.max(1e-6, b.t - a.t);
    const s = clamp((t - a.t) / dt, 0, 1);

    const hasTangents = Number.isFinite(a.outSlope) && Number.isFinite(b.inSlope);
    if (!hasTangents)
        return lerp(a.v, b.v, s);

    // Unity AnimationCurve 非加权情形可近似为三次 Hermite。
    const m0 = a.outSlope;
    const m1 = b.inSlope;
    const s2 = s * s;
    const s3 = s2 * s;

    const h00 = 2 * s3 - 3 * s2 + 1;
    const h10 = s3 - 2 * s2 + s;
    const h01 = -2 * s3 + 3 * s2;
    const h11 = s3 - s2;

    return h00 * a.v + h10 * dt * m0 + h01 * b.v + h11 * dt * m1;
}

// 线性采样颜色曲线（RGB 三通道分别插值）。
/**
 * 功能：按 stops 线性采样颜色曲线（RGB 三通道独立插值）。
 * 参数：stops 颜色关键帧数组，t 归一化时间，fallback 缺省颜色。
 * 返回：RGB 数组。
 */
export function evalColorStops(stops, t, fallback) {
    if (!Array.isArray(stops) || stops.length === 0)
        return fallback;

    if (t <= stops[0].t)
        return stops[0].c;

    for (let i = 1; i < stops.length; i++) {
        if (t <= stops[i].t) {
            const a = stops[i - 1];
            const b = stops[i];
            const lt = (t - a.t) / Math.max(1e-6, b.t - a.t);
            return [
                lerp(a.c[0], b.c[0], lt),
                lerp(a.c[1], b.c[1], lt),
                lerp(a.c[2], b.c[2], lt),
            ];
        }
    }

    return stops[stops.length - 1].c;
}
