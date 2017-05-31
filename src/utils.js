export function setLS(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

export function getLS(key, usePrompt=false, defaultValue=null) {
    let value = defaultValue;
    try {
        const valueFromLS = localStorage.getItem(key);
        if (valueFromLS !== null) {
            value = JSON.parse(valueFromLS);
        }
    } catch (e) {
        console.warn(e);
    }
    if (!value && usePrompt) {
        value = prompt(key, '');
        setLS(key, value);
    }
    return value;
}

export function parseLog(log) {
    const normalizedStr = String(log).replace(/\\\'/g, '&apos;');
    const matches = normalizedStr.match(/([^\s]+) ([^\s]+) ([^\s]+) (.+)/);
    const params = String(matches[4] + ' ').match(/(.+?)\=('|)(.+?)(\2)\s/g).reduce((accum, item) => {
        const [key, value] = item.split('=');
        accum[key] = String(value).trim().replace(/^\'/, '').replace(/\'$/, '');
        return accum;
    }, {});
    return {
        ip: matches[1],
        id: matches[2],
        type: matches[3],
        ...params,
    };
}

export function aggregateByKey(items, key) {
    return items.reduce((accum, item) => {
        accum[item[key]] = accum[item[key]] || [];
        accum[item[key]].push(item);
        return accum;
    }, {});
}

export function convertToKeysArray(obj) {
    const keys = Object.keys(obj);
    return keys.map(key => ({
        key: key,
        items: obj[key],
    }));
}
