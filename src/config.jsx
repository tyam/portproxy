const electron = require('electron');
const remote = electron.remote;
const app = remote.require('./app');
const { app:happ, h } = require('hyperapp')
const { assoc, dissoc } = require('ramda')


const createInitialConfig = (app) => {
    const data = app.getConfig()
    console.log(data)
    return {data:data, config:data}
}
const createConfigActions = (app) => {
    return {
        update: (el) => ({data, ...rest}, actions) => {
            if (el.name == 'theme') {
                if (data.theme != el.value) {
                    data = assoc(el.name, el.value, data)
                    app.setConfig(data)
                }
            }
            return {data:data, ...rest}
        }, 
        configure: (aConfig) => ({config, data}, actions) => {
            return {config:aConfig, data:aConfig}
        }
    }
}
const view = (state, actions) => {
    return (
        <div class={`main ${state.config.theme}`}>
            <div class="configPane">
                <div class="control">
                    <label for="">テーマ</label>
                    <select name="theme" onchange={(ev) => actions.update(ev.target)}>
                        <option value="vanilla" selected={state.data.theme == 'vanilla'}>標準</option>
                        <option value="dark" selected={state.data.theme == 'dark'}>ダーク</option>
                    </select>
                </div>
            </div>
        </div>
    )
}

const config = happ(createInitialConfig(app), createConfigActions(app), view, document.getElementById('app'))
remote.app.on('configure', (aConfig) => {
    config.configure(aConfig)
})
