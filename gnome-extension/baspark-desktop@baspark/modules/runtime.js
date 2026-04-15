export const runtimeMethods = {
    // ===== 运行时公共能力：Actor 管理与日志输出 =====
    /**
     * 功能：将绘制 Actor 添加到舞台顶层并登记到集合。
     * 参数：actor 需要加入舞台的 St Actor。
     * 返回：无。
     */
    _addActorTop(actor) {
        global.stage.add_child(actor);
        global.stage.set_child_above_sibling(actor, null);
        this._actors.add(actor);
    },

    /**
     * 功能：销毁 Actor 并从跟踪集合移除。
     * 参数：actor 需要销毁的 St Actor。
     * 返回：无。
     */
    _destroyActor(actor) {
        if (!actor)
            return;
        this._actors.delete(actor);
        if (actor.get_parent())
            actor.destroy();
    },

    /**
     * 功能：按调试开关输出统一前缀日志。
     * 参数：msg 日志文本。
     * 返回：无。
     */
    _log(msg) {
        if (!this._cfg?.debugLog)
            return;
        console.log(`[BASpark] ${msg}`);
    },
};
