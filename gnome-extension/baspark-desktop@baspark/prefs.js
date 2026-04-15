import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

function addSwitch(group, settings, key, title, subtitle = '') {
    const row = new Adw.SwitchRow({title, subtitle});
    group.add(row);
    settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
}

function addSpin(group, settings, {
    key,
    title,
    subtitle = '',
    min = 0,
    max = 9999,
    step = 1,
    digits = 0,
    isDouble = false,
}) {
    const row = new Adw.ActionRow({title, subtitle});
    const adj = new Gtk.Adjustment({
        lower: min,
        upper: max,
        step_increment: step,
        page_increment: step * 10,
    });
    const spin = new Gtk.SpinButton({adjustment: adj, digits, valign: Gtk.Align.CENTER});
    spin.set_numeric(true);

    if (isDouble)
        spin.set_value(settings.get_double(key));
    else
        spin.set_value(settings.get_int(key));

    spin.connect('value-changed', () => {
        if (isDouble)
            settings.set_double(key, spin.get_value());
        else
            settings.set_int(key, spin.get_value_as_int());
    });

    row.add_suffix(spin);
    row.activatable_widget = spin;
    group.add(row);
}

function addEntry(group, settings, key, title, subtitle = '') {
    const row = new Adw.ActionRow({title, subtitle});
    const entry = new Gtk.Entry({hexpand: true, valign: Gtk.Align.CENTER});
    entry.set_text(settings.get_string(key));
    entry.connect('changed', () => settings.set_string(key, entry.get_text()));

    row.add_suffix(entry);
    row.activatable_widget = entry;
    group.add(row);
}

export default class BASparkPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings('org.gnome.shell.extensions.baspark-desktop');

        window.set_default_size(900, 760);

        const page = new Adw.PreferencesPage({title: 'BASpark Rebuild'});
        window.add(page);

        const engine = new Adw.PreferencesGroup({title: '引擎与输入'});
        page.add(engine);
        addSwitch(engine, settings, 'debug-log', '启用调试日志', '在 journalctl 中输出点击与拖尾事件');
        addSpin(engine, settings, {key: 'poll-interval-ms', title: '轮询间隔 (ms)', min: 8, max: 100, step: 1});
        addSpin(engine, settings, {key: 'time-scale', title: '时间倍率', subtitle: '大于 1 更快，小于 1 更慢', min: 0.2, max: 5.0, step: 0.05, digits: 2, isDouble: true});
        addSpin(engine, settings, {key: 'global-scale', title: '全局尺寸倍率', min: 0.5, max: 5.0, step: 0.05, digits: 2, isDouble: true});
        addSpin(engine, settings, {key: 'dedupe-distance-px', title: '点击去重距离 (px)', min: 0, max: 30, step: 1});
        addSpin(engine, settings, {key: 'dedupe-time-ms', title: '点击去重时间窗 (ms)', min: 0, max: 500, step: 1});
        addSpin(engine, settings, {key: 'captured-priority-window-ms', title: 'captured 优先窗口 (ms)', min: 0, max: 500, step: 1});

        const trail = new Adw.PreferencesGroup({title: '拖尾与移动发射'});
        page.add(trail);
        addSwitch(trail, settings, 'enable-trail', '启用拖尾渲染', '寿命/宽度/最小采样距离与颜色梯度来自 TrailRenderer JSON');
        addSwitch(trail, settings, 'enable-distance-emitter', '启用按距离发射', '按住左键移动时持续喷发小三角');
        addSpin(trail, settings, {key: 'distance-emit-step-px', title: '发射步长 (px)', min: 50, max: 200, step: 1});

        const colors = new Adw.PreferencesGroup({title: '颜色 (RGB)'});
        page.add(colors);
        addEntry(colors, settings, 'color-base-rgb', '主色', '格式: 85,189,255');
        addEntry(colors, settings, 'color-deep-rgb', '深色', '格式: 23,110,220');
        addEntry(colors, settings, 'color-white-rgb', '高亮白', '格式: 255,255,255');
    }
}
