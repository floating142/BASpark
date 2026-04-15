import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import {normalizeAngle} from './core-utils.js';

export const meshProfileMethods = {
    // ===== 网格阶段：加载 OBJ、归一化与构建 Cairo 路径 =====
    /**
     * 功能：加载圆环与三角形 OBJ 轮廓，并提供回退网格。
     * 参数：无（依赖扩展路径 this.path）。
     * 返回：包含 cylinder002 与 fxMeshTriangle 的网格配置对象。
     */
    _loadMeshProfiles() {
        const fallback = {
            innerRadiusNorm: 1.0,
            outerRadiusNorm: 1.0636685,
            segmentCount: 64,
            vertices: null,
            faces: null,
        };
        const triangleFallback = {
            vertices: [
                [0.0, -1.0],
                [-0.8660254, 0.5],
                [0.8660254, 0.5],
            ],
            faces: [[0, 1, 2]],
        };

        const objPath = GLib.build_filenamev([this.path, 'assets', 'Cylinder002.obj']);
        const cylinder = this._loadCylinderObjProfile(objPath) ?? fallback;
        const triObjAssetPath = GLib.build_filenamev([this.path, 'assets', 'FX_MESH_Triangle.obj']);
        const triObjPackPath = GLib.build_filenamev([this.path, '..', 'effect_rebuild_pack', 'meshes', 'FX_MESH_Triangle.obj']);
        const triangle = this._loadTriangleObjProfile(triObjAssetPath) ?? this._loadTriangleObjProfile(triObjPackPath) ?? triangleFallback;
        this._log(`Cylinder002 profile: inner=${cylinder.innerRadiusNorm.toFixed(6)} outer=${cylinder.outerRadiusNorm.toFixed(6)} seg=${cylinder.segmentCount} faces=${cylinder.faces?.length ?? 0}`);
        this._log(`FX_MESH_Triangle profile: verts=${triangle.vertices?.length ?? 0} faces=${triangle.faces?.length ?? 0}`);

        return {
            cylinder002: cylinder,
            fxMeshTriangle: triangle,
        };
    },

    /**
     * 功能：解析 Cylinder002 OBJ，提取环宽与三角面数据。
     * 参数：path OBJ 文件路径。
     * 返回：圆环轮廓对象；解析失败返回 null。
     */
    _loadCylinderObjProfile(path) {
        try {
            const file = Gio.File.new_for_path(path);
            const [ok, contents] = file.load_contents(null);
            if (!ok)
                return null;

            const text = new TextDecoder().decode(contents);
            const angleMap = new Map();
            const vertices = [];
            const faces = [];

            const parseObjIndex = token => {
                const head = token.split('/')[0];
                const raw = Number.parseInt(head, 10);
                if (Number.isNaN(raw) || raw === 0)
                    return -1;
                if (raw > 0)
                    return raw - 1;
                return vertices.length + raw;
            };

            for (const line of text.split('\n')) {
                if (line.startsWith('v ')) {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length < 3)
                        continue;

                    const x = Number.parseFloat(parts[1]);
                    const y = Number.parseFloat(parts[2]);
                    if (Number.isNaN(x) || Number.isNaN(y))
                        continue;

                    vertices.push([x, y]);

                    const r = Math.hypot(x, y);
                    const a = normalizeAngle(Math.atan2(y, x));
                    // 将角度量化后聚合同一扇区，统计该角度上的内外半径。
                    const key = `${Math.round(a * 100000) / 100000}`;

                    const prev = angleMap.get(key);
                    if (prev) {
                        prev.inner = Math.min(prev.inner, r);
                        prev.outer = Math.max(prev.outer, r);
                    } else {
                        angleMap.set(key, {angle: Number.parseFloat(key), inner: r, outer: r});
                    }
                    continue;
                }

                if (!line.startsWith('f '))
                    continue;

                const parts = line.trim().split(/\s+/);
                if (parts.length < 4)
                    continue;

                const idx = parts.slice(1).map(parseObjIndex);
                if (idx.some(v => v < 0 || v >= vertices.length))
                    continue;

                // 将 n 边形面拆成三角扇，便于 Cairo 统一绘制。
                for (let i = 1; i < idx.length - 1; i++)
                    faces.push([idx[0], idx[i], idx[i + 1]]);
            }

            const rings = [...angleMap.values()].sort((a, b) => a.angle - b.angle);
            if (rings.length < 16)
                return null;

            const innerRadiusNorm = rings.reduce((acc, v) => acc + v.inner, 0) / rings.length;
            const outerRadiusNorm = rings.reduce((acc, v) => acc + v.outer, 0) / rings.length;

            return {
                innerRadiusNorm,
                outerRadiusNorm,
                segmentCount: rings.length,
                vertices,
                faces,
            };
        } catch (e) {
            this._log(`Failed to parse Cylinder002.obj: ${e}`);
            return null;
        }
    },

    /**
     * 功能：解析 FX_MESH_Triangle OBJ，并归一化到单位半径。
     * 参数：path OBJ 文件路径。
     * 返回：包含 vertices/faces 的三角网格；失败返回 null。
     */
    _loadTriangleObjProfile(path) {
        try {
            const file = Gio.File.new_for_path(path);
            if (!file.query_exists(null))
                return null;

            const [ok, contents] = file.load_contents(null);
            if (!ok)
                return null;

            const text = new TextDecoder().decode(contents);
            const vertices = [];
            const faces = [];

            const parseObjIndex = token => {
                const head = token.split('/')[0];
                const raw = Number.parseInt(head, 10);
                if (Number.isNaN(raw) || raw === 0)
                    return -1;
                if (raw > 0)
                    return raw - 1;
                return vertices.length + raw;
            };

            for (const line of text.split('\n')) {
                if (line.startsWith('v ')) {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length < 3)
                        continue;

                    const x = Number.parseFloat(parts[1]);
                    const y = Number.parseFloat(parts[2]);
                    if (Number.isNaN(x) || Number.isNaN(y))
                        continue;

                    vertices.push([x, y]);
                    continue;
                }

                if (!line.startsWith('f '))
                    continue;

                const parts = line.trim().split(/\s+/);
                if (parts.length < 4)
                    continue;

                const idx = parts.slice(1).map(parseObjIndex);
                if (idx.some(v => v < 0 || v >= vertices.length))
                    continue;

                for (let i = 1; i < idx.length - 1; i++)
                    faces.push([idx[0], idx[i], idx[i + 1]]);
            }

            if (vertices.length < 3 || faces.length === 0)
                return null;

            const maxRadius = vertices.reduce((acc, v) => Math.max(acc, Math.hypot(v[0], v[1])), 0);
            if (maxRadius < 1e-6)
                return null;

            // 归一化到单位半径，调用方只需给 size 即可缩放。
            return {
                vertices: vertices.map(v => [v[0] / maxRadius, v[1] / maxRadius]),
                faces,
            };
        } catch (e) {
            this._log(`Failed to parse FX_MESH_Triangle.obj: ${e}`);
            return null;
        }
    },

    /**
     * 功能：用规则分段方式构建圆环扇形路径（无网格回退时使用）。
     * 参数：cr Cairo 上下文，c 圆心坐标，start/end 起止角，innerR/outerR 内外半径，segmentCount 分段数。
     * 返回：无（直接写入 Cairo path）。
     */
    _buildObjRingSegmentPath(cr, c, start, end, innerR, outerR, segmentCount) {
        const twoPi = Math.PI * 2;
        const steps = Math.max(8, Math.round(segmentCount || 64));
        const step = twoPi / steps;

        let s = normalizeAngle(start);
        let e = normalizeAngle(end);
        if (e <= s)
            e += twoPi;

        const angles = [s];
        let a = Math.ceil((s + 1e-6) / step) * step;
        while (a < e) {
            angles.push(a);
            a += step;
        }
        angles.push(e);

        cr.newPath();
        const first = angles[0];
        cr.moveTo(c + Math.cos(first) * outerR, c + Math.sin(first) * outerR);

        for (let i = 1; i < angles.length; i++) {
            const t = angles[i];
            cr.lineTo(c + Math.cos(t) * outerR, c + Math.sin(t) * outerR);
        }

        for (let i = angles.length - 1; i >= 0; i--) {
            const t = angles[i];
            cr.lineTo(c + Math.cos(t) * innerR, c + Math.sin(t) * innerR);
        }

        cr.closePath();
    },

    /**
     * 功能：判断角度是否位于指定弧段内（支持跨 2PI）。
     * 参数：angle 待测角，start/end 弧段起止角。
     * 返回：布尔值。
     */
    _isAngleInArc(angle, start, end) {
        let s = normalizeAngle(start);
        let e = normalizeAngle(end);
        let a = normalizeAngle(angle);

        if (e <= s)
            e += Math.PI * 2;
        if (a < s)
            a += Math.PI * 2;

        return a >= s && a <= e;
    },

    /**
     * 功能：基于 OBJ 三角面筛选并构建弧段网格路径。
     * 参数：cr Cairo 上下文，c 圆心，start/end 起止角，radius 缩放半径，vertices/faces 网格数据。
     * 返回：写入路径的三角面数量。
     */
    _buildObjArcMeshPath(cr, c, start, end, radius, vertices, faces) {
        if (!Array.isArray(vertices) || !Array.isArray(faces) || faces.length === 0)
            return 0;

        let triCount = 0;
        cr.newPath();

        for (const f of faces) {
            const v0 = vertices[f[0]];
            const v1 = vertices[f[1]];
            const v2 = vertices[f[2]];
            if (!v0 || !v1 || !v2)
                continue;

            const cx = (v0[0] + v1[0] + v2[0]) / 3;
            const cy = (v0[1] + v1[1] + v2[1]) / 3;
            // 以面中心角判断是否在弧段中，避免逐顶点裁剪带来的复杂性。
            const a = normalizeAngle(Math.atan2(cy, cx));
            if (!this._isAngleInArc(a, start, end))
                continue;

            cr.moveTo(c + v0[0] * radius, c + v0[1] * radius);
            cr.lineTo(c + v1[0] * radius, c + v1[1] * radius);
            cr.lineTo(c + v2[0] * radius, c + v2[1] * radius);
            cr.closePath();
            triCount++;
        }

        return triCount;
    },

    /**
     * 功能：将单位网格按位置/缩放/旋转变换后写入 Cairo 路径。
     * 参数：cr Cairo 上下文，cx/cy 目标中心，scale 缩放，rotation 旋转弧度，vertices/faces 网格数据。
     * 返回：写入路径的三角面数量。
     */
    _buildObjMeshPath(cr, cx, cy, scale, rotation, vertices, faces) {
        if (!Array.isArray(vertices) || !Array.isArray(faces) || faces.length === 0)
            return 0;

        const cosR = Math.cos(rotation);
        const sinR = Math.sin(rotation);
        let triCount = 0;
        cr.newPath();

        const transformVertex = v => {
            const sx = v[0] * scale;
            const sy = v[1] * scale;
            // 先缩放后旋转再平移，保持与 Unity 局部空间变换顺序一致。
            return [
                cx + sx * cosR - sy * sinR,
                cy + sx * sinR + sy * cosR,
            ];
        };

        for (const f of faces) {
            const v0 = vertices[f[0]];
            const v1 = vertices[f[1]];
            const v2 = vertices[f[2]];
            if (!v0 || !v1 || !v2)
                continue;

            const p0 = transformVertex(v0);
            const p1 = transformVertex(v1);
            const p2 = transformVertex(v2);

            cr.moveTo(p0[0], p0[1]);
            cr.lineTo(p1[0], p1[1]);
            cr.lineTo(p2[0], p2[1]);
            cr.closePath();
            triCount++;
        }

        return triCount;
    },
};
