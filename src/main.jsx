const electron = require('electron');
const remote = electron.remote;
const netsh = remote.require('./netsh');
const app = remote.require('./app');
const dialog = remote.dialog;
const { app:happ, h } = require('hyperapp')
const { assoc, dissoc, isEmpty, has, append } = require('ramda')
const process = require('process')

const ifElse = (cond, ifF, elseF) => {
    if (cond) {
        return ifF()
    } else {
        return elseF()
    }
}

const validateAddr = (name, value, problems) => {
    if (value.trim() == '') {
        return assoc(name, 'empty', problems)
    } else if (value.match(/(([1-9]?[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([1-9]?[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])/)) {
        return problems
    } else {
        return assoc(name, 'invalid', problems)
    }
}
const validatePort = (name, value, problems) => {
    if (value.trim() == '') {
        return assoc(name, 'empty', problems)
    } else {
        const v = parseInt(value)
        if (v+'' == value && v >= 1) {
            return problems
        } else {
            return assoc(name, 'invalid', problems)
        }
    }
}

// device = {name, address}
// map = {fromAddr, fromPort, toAddr, toPort}
// state = {devs:[::device], maps:[::map], loading, activeIndex, tmpMap, problems}

const createInitialState = (netsh) => {
    window.setTimeout(() => netsh.list(main.syncK), 100);
    const emptyMap = {fromAddr:"", fromPort:"", toAddr:"", toPort:""}
    const config = app.getConfig()
    return {devs:[], maps:[], loading:true, activeIndex:-1, tmpMap:emptyMap, problems:{}, config:config}
}
const createActions = (netsh) => {
    return {
        sync: () => ({loading, ...rest}, actions) => {
            netsh.list(actions.syncK)
            return {loading:true, ...rest}
        }, 
        syncK: (res) => (state, actions) => {
            const {devs:_1, maps:_2, loading:_3, activeIndex, ...rest} = state;
            return {devs:res.devs, maps:res.maps, loading:false, activeIndex:-1, ...rest}
        }, 
        remove: (m) => ({loading, ...rest}, actions) => {
            netsh.remove(m, actions.sync);
            return {loading:true, ...rest}
        }, 
        select: (i) => ({activeIndex, problems, tmpMap:_1, ...rest}, actions) => {
            const tmpMap = (i == rest.maps.length) ? 
                {fromAddr:"", fromPort:"", toAddr:"", toPort:""} : rest.maps[i]
            return {activeIndex:i, problems:{}, tmpMap:tmpMap, ...rest}
        }, 
        update: (el) => ({tmpMap, problems, ...rest}, actions) => {
            return {tmpMap:assoc(el.name, el.value, tmpMap), problems:dissoc(el.name, problems), ...rest}
        }, 
        blur: (el) => ({problems, ...rest}, actions) => {
            const validate = (el.name == 'fromAddr' || el.name == 'toAddr') ? validateAddr : validatePort
            const problems2 = validate(el.name, el.value, problems)
            return {problems:problems2, ...rest}
        }, 
        cancel: () => ({activeIndex, problems, tmpMap, ...rest}, actions) => {
            const emptyMap = {fromAddr:"", fromPort:"", toAddr:"", toPort:""}
            return {activeIndex:-1, problems:{}, tmpMap:emptyMap, ...rest}
        }, 
        commit: () => ({problems, tmpMap, loading, ...rest}, actions) => {
            const p0 = validateAddr('fromAddr', tmpMap.fromAddr, problems)
            const p1 = validatePort('fromPort', tmpMap.fromPort, p0)
            const p2 = validateAddr('toAddr', tmpMap.toAddr, p1)
            const p3 = validatePort('toPort', tmpMap.toPort, p2)
            if (! isEmpty(p3)) {
                return {problems:p3, tmpMap:tmpMap, loading:loading, ...rest}
            } else if (rest.activeIndex == rest.maps.length) {
                netsh.add(tmpMap, actions.sync)
                return {problems:p3, tmpMap:tmpMap, loading:true, ...rest}
            } else {
                netsh.change(rest.maps[rest.activeIndex], tmpMap, actions.sync)
                return {problems:p3, tmpMap:tmpMap, loading:true, ...rest}
            }
        }, 
        configure: (config) => ({config:_1, ...rest}, actions) => {
            return {config:config, ...rest}
        }
    }
}
const viewItems = (state, actions) => {
    const maps2 = append({fromAddr:'', fromPort:'', toAddr:'', toPort:''}, state.maps)
    const confirm = (m, cb) => {
        dialog.showMessageBox(remote.getCurrentWindow(), {
            buttons: ['削除', 'キャンセル'], 
            title: '転送の削除', 
            message: '転送の設定を削除します（'+m.fromAddr+':'+m.fromPort+'）。\nよろしいですか？', 
            cancelId: 1
        }, (idx) => {
            if (idx == 0) {
                cb(m)
            }
        })
    }
    return (
        <div class={`items ${state.loading ? 'loading' : ''}`}>
            {maps2.map((m, i) => {
                return ifElse(i == state.activeIndex, 
                    () => (
                        <div class="item" key={'item-'+i}><form onsubmit={(e) => {e.preventDefault();return false}}>
                            <div class="row">
                                <div><input type="text" value={state.tmpMap.fromAddr} name="fromAddr" oninput={(ev) => actions.update(ev.target)} onblur={(ev) => actions.blur(ev.target)} class={has('fromAddr', state.problems) ? 'error' : ''} list="devs" /></div>
                                <div><input type="text" value={state.tmpMap.fromPort} name="fromPort" oninput={(ev) => actions.update(ev.target)} onblur={(ev) => actions.blur(ev.target)} class={has('fromPort', state.problems) ? 'error' : ''} /></div>
                                <div><input type="text" value={state.tmpMap.toAddr} name="toAddr" oninput={(ev) => actions.update(ev.target)} onblur={(ev) => actions.blur(ev.target)} class={has('toAddr', state.problems) ? 'error' : ''} list="devs" /></div>
                                <div><input type="text" value={state.tmpMap.toPort} name="toPort" oninput={(ev) => actions.update(ev.target)} onblur={(ev) => actions.blur(ev.target)} class={has('toPort', state.problems) ? 'error' : ''} /></div>
                                <div>
                                    <button type="submit" onclick={actions.commit} title="確定"><i class="icon-checkmark"></i></button>
                                    <button type="button" onclick={(ev) => (ev.preventDefault(), actions.cancel())} title="キャンセル"><i class="icon-cross"></i></button>
                                </div>
                            </div>
                            <datalist id="devs">
                                {state.devs.ipv4.map((d) => (
                                    <option value={d.address}></option>
                                ))}
                            </datalist>
                            </form></div>
                    ), 
                    () => (
                        <div key={'item-'+i} class={`item ${(i != -1) ? 'selectable' : ''} ${(i == state.maps.length) ? 'item-new' : ''}`}>
                            <div class="row">
                                <div><span class="display">{m.fromAddr}</span></div>
                                <div><span class="display">{m.fromPort}</span></div>
                                <div><span class="display">{m.toAddr}</span></div>
                                <div><span class="display">{m.toPort}</span></div>
                                {ifElse(i != state.maps.length, 
                                    () => (
                                        <div>
                                            <button onclick={() => actions.select(i)} title="変更"><i class="icon-pencil"></i></button>
                                            <button onclick={() => confirm(m, actions.remove)} title="削除"><i class="icon-bin"></i></button>
                                        </div>
                                    ), 
                                    () => (
                                        <div>
                                            <button onclick={() => actions.select(i)} class="primary" title="登録"><i class="icon-plus"></i></button>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    )
                )
            })}
        </div>
    )
}
const view = (state, actions) => {
    const displayConfig = () => {
        app.openConfigWindow()
    }
    const displayInfo = () => {
        const msg = '作者：山田哲央\nURL：https://github.com/tyam/portproxy\nバージョン：'+remote.app.getVersion()+'\n\nElectron：'+process.versions.electron+'\nChrome：'+process.versions.chrome+'\nNode.js：'+process.versions.node+'\n\nCopyright Tetsuo Yamada 2018 ALL RIGHTS RESERVED.'
        dialog.showMessageBox(remote.getCurrentWindow(), {
            buttons: ['コピー', 'OK'], 
            title: 'portproxyの情報', 
            message: msg, 
            defaultId: 1
        }, (idx) => {
            if (idx == 0) {
                electron.clipboard.writeText(msg)
            }
        })
    }
    return (
        <div class={`main ${state.config.theme}`}>
            <div class="cover">
                <div class="copy">ポート転送の管理</div>
                <div class="buttons">
                    <button onclick={displayConfig}><i class="icon-cog"></i></button>
                    <button onclick={displayInfo}><i class="icon-info"></i></button>
                </div>
            </div>
        <div class="item item-label" key="label">
            <div class="row">
                <div><span>From Addr</span></div>
                <div><span>From Port</span></div>
                <div><span>To Addr</span></div>
                <div><span>To Port</span></div>
                <div><span>&nbsp;</span></div>
            </div>
        </div>
            <div class="body">
                {viewItems(state, actions)}
            </div>
        </div>
    )
}

const main = happ(createInitialState(netsh), createActions(netsh), view, document.getElementById('app'))
remote.app.on('configure', (config) => {
    main.configure(config)
})