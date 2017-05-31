import React from 'react';
import {render} from 'react-dom';
import dva, {connect} from 'dva';
import {Router, Route} from 'dva/router';
import fetch from 'dva/fetch';
import {DatePicker} from 'antd';
const {RangePicker} = DatePicker;
import createLogger from 'dva-logger';
import './index.html';
import './index.css';
import moment from 'moment';
import {getLS, parseLog, aggregateByKey, convertToKeysArray} from './utils';
import {LocaleProvider} from 'antd';
import enUS from 'antd/lib/locale-provider/en_US';

const baseUrl = getLS('baseUrl', true);
const apiKey = getLS('apiKey', true);
const logId = getLS('logId', true);
const requestHeaders = {
    'x-api-key': apiKey,
};

// 1. Initialize
const app = dva();

app.use(createLogger({}));

// 2. Model
// Remove the comment and define your model.
app.model({
    namespace: 'app',
    state: {
        logs: [],
        logsFormatted: [],
        filter: {
            from: moment().add(-1, 'days').format('x'),
            to: moment().format('x'),
        }
    },
    subscriptions: {
        setup({dispatch, history}) {
            dispatch({type: 'getLogs'});
        },
    },
    effects: {
        *getLogs(action, {put, call, select}) {
            const from = yield select(state => state.app.filter.from);
            const to = yield select(state => state.app.filter.to);
            const {links} = yield fetch(`https://rest.logentries.com/query/logs/${logId}/?from=${from}&to=${to}`, {
                headers: requestHeaders
            }).then(res => res.json());
            if (links) {
                const nextUrl = links[0].href;
                const {events} = yield fetch(nextUrl, {
                    headers: requestHeaders
                }).then(res => res.json());
                yield put({
                    type: 'setLogs',
                    payload: events || [],
                });
            }
        },
        *changeFilter(action, {put, call}) {
            yield put({
                type: 'getLogs'
            });
        }
    },
    reducers: {
        getLogs(state, {payload}) {
            return {
                ...state
            };
        },
        setLogs(state, {payload}) {
            return {
                ...state,
                logs: payload,
                logsFormatted: convertToKeysArray(aggregateByKey(payload.map(item => parseLog(item.message)), 'id'))
            };
        },
        changeFilter(state, {payload}) {
            return {
                ...state,
                filter: {
                    from: payload.date[0].format('x'),
                    to: payload.date[1].format('x'),
                }
            };
        }
    },
});

const renderLog = (log) => {
    if (log.type === 'PAGE') {
        return <div className={'Logs-logPage'}>
            <p><strong>URL:</strong> <a href={baseUrl + log.url} target="_blank">{log.url}</a></p>
            <p><strong>Referrer:</strong> <a href={log.referrer}>{log.referrer}</a></p>
            <details>
                <p><strong>browser.cookie_enabled:</strong> {log['browser.cookie_enabled']}</p>
                <p><strong>browser.do_not_track:</strong> {log['browser.do_not_track']}</p>
                <p><strong>browser.name:</strong> {log['browser.name']}</p>
                <p><strong>browser.version:</strong> {log['browser.version']}</p>
                <p><strong>id:</strong> {log['id']}</p>
                <p><strong>ip:</strong> {log['ip']}</p>
                <p><strong>platform:</strong> {log['platform']}</p>
                <p><strong>referrer:</strong> {log['referrer']}</p>
                <p><strong>screen.height:</strong> {log['screen.height']}</p>
                <p><strong>screen.width:</strong> {log['screen.width']}</p>
                <p><strong>type:</strong> {log['type']}</p>
                <p><strong>url:</strong> {log['url']}</p>
                <p><strong>window.height:</strong> {log['window.height']}</p>
                <p><strong>window.width:</strong> {log['window.width']}</p>
            </details>
        </div>;
    } else if (log.type === 'ERROR') {
        return <div className={'Logs-logError'}>
            <p><strong>Error:</strong> <code dangerouslySetInnerHTML={{__html: log.error}} style={{color: 'red'}}/></p>
            <p><strong>Line:</strong> {log.line}</p>
            <p><strong>Location:</strong> {log.location ?
                <a href={log.location} target="_blank">{log.location}</a> : '-'}</p>
        </div>;
    }
    return null;
};

// 3. Router
const HomePage = connect(({app}) => ({
    app,
}))((props) => <div className="App-container">
    <div className="App-filter">
        <RangePicker
            onChange={(date, dateString) => props.dispatch({type: 'app/changeFilter', payload: {date, dateString}})}
            value={ [moment(props.app.filter.from, 'x'), moment(props.app.filter.to, 'x')] }
        />
    </div>
    <div className="Logs-container">
        {props.app.logsFormatted.map((logItem, k) => <div className={'Logs-logItem'} key={k}>
            <strong>ID: {logItem.key}</strong>
            {logItem.items.map((item, k) => <div className={'Logs-logWrap'} key={k}>{renderLog(item)}</div>)}
        </div>)}
    </div>
</div>);

app.router(({history}) =>
    <Router history={history}>
        <Route path="/" component={HomePage}/>
    </Router>
);

// 4. Start
const App = app.start();
const appLocalized = <LocaleProvider locale={enUS}><App /></LocaleProvider>;

render(appLocalized, document.getElementById('root'));
