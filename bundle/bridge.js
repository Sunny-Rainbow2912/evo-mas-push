var $04M5f$electron = require("electron");



let $5d07c63a5200d685$var$i = 0;
const $5d07c63a5200d685$var$newId = ()=>++$5d07c63a5200d685$var$i;
const $5d07c63a5200d685$var$defined = (value)=>value !== undefined || value !== null;
const $5d07c63a5200d685$var$handlers = {};
(0, $04M5f$electron.ipcRenderer).on('main:rpc', (sender, id, ...args)=>{
    if (!$5d07c63a5200d685$var$handlers[id]) return console.log('Message from main RPC had no handler:', args);
    args = args.map((arg)=>$5d07c63a5200d685$var$defined(arg) ? JSON.parse(arg) : arg);
    $5d07c63a5200d685$var$handlers[id](...args);
    delete $5d07c63a5200d685$var$handlers[id];
});
var $5d07c63a5200d685$export$2e2bcd8739ae039 = (...args)=>{
    const cb = args.pop();
    if (typeof cb !== 'function') throw new Error('Main RPC requires a callback');
    const id = $5d07c63a5200d685$var$newId();
    $5d07c63a5200d685$var$handlers[id] = cb;
    args = args.map((arg)=>$5d07c63a5200d685$var$defined(arg) ? JSON.stringify(arg) : arg);
    (0, $04M5f$electron.ipcRenderer).send('main:rpc', JSON.stringify(id), ...args);
};


const $b684936afd57f1f4$var$unwrap = (v)=>v !== undefined || v !== null ? JSON.parse(v) : v;
const $b684936afd57f1f4$var$wrap = (v)=>v !== undefined || v !== null ? JSON.stringify(v) : v;
const $b684936afd57f1f4$var$source = 'bridge:link';
const $b684936afd57f1f4$var$safeOrigins = [
    'file://'
].concat(process.env.NODE_ENV === 'development' ? [
    'http://localhost:1234'
] : []);
window.addEventListener('message', (e)=>{
    if (!$b684936afd57f1f4$var$safeOrigins.includes(e.origin) || e.data.source?.includes('react-devtools')) return;
    const data = $b684936afd57f1f4$var$unwrap(e.data);
    if (data.source !== $b684936afd57f1f4$var$source) {
        if (data.method === 'rpc') return (0, $5d07c63a5200d685$export$2e2bcd8739ae039)(...data.args, (...args)=>e.source.postMessage($b684936afd57f1f4$var$wrap({
                method: 'rpc',
                id: data.id,
                args: args,
                source: $b684936afd57f1f4$var$source
            }), e.origin));
        if (data.method === 'event') return (0, $04M5f$electron.ipcRenderer).send(...data.args);
        if (data.method === 'invoke') (async ()=>{
            const args = await (0, $04M5f$electron.ipcRenderer).invoke(...data.args);
            window.postMessage($b684936afd57f1f4$var$wrap({
                method: 'invoke',
                channel: 'action',
                id: data.id,
                args: args,
                source: $b684936afd57f1f4$var$source
            }), '*');
        })();
    }
}, false);
(0, $04M5f$electron.ipcRenderer).on('main:action', (...args)=>{
    args.shift();
    window.postMessage($b684936afd57f1f4$var$wrap({
        method: 'event',
        channel: 'action',
        args: args,
        source: $b684936afd57f1f4$var$source
    }), '*');
});
(0, $04M5f$electron.ipcRenderer).on('main:flex', (...args)=>{
    args.shift();
    window.postMessage($b684936afd57f1f4$var$wrap({
        method: 'event',
        channel: 'flex',
        args: args,
        source: $b684936afd57f1f4$var$source
    }), '*');
});
(0, $04M5f$electron.ipcRenderer).on('main:dapp', (...args)=>{
    args.shift();
    window.postMessage($b684936afd57f1f4$var$wrap({
        method: 'event',
        channel: 'dapp',
        args: args,
        source: $b684936afd57f1f4$var$source
    }), '*');
});


//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUFTO2NBQVE7Z0JBQU07SUFBTyxJQUFJO0FBQy9FO0FBRUEsQ0FBQSxHQUFBLDJCQUFVLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxHQUFHO0lBQzlCLEtBQUssS0FBSztJQUNWLE9BQU8sV0FBVyxDQUFDLDJCQUFLO1FBQUUsUUFBUTtRQUFTLFNBQVM7Y0FBUTtnQkFBTTtJQUFPLElBQUk7QUFDL0UiLCJzb3VyY2VzIjpbInJlc291cmNlcy9icmlkZ2UvaW5kZXguanMiLCJyZXNvdXJjZXMvYnJpZGdlL3JwYy9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBpcGNSZW5kZXJlciB9IGZyb20gJ2VsZWN0cm9uJ1xuaW1wb3J0IHJwYyBmcm9tICcuL3JwYydcblxuY29uc3QgdW53cmFwID0gKHYpID0+ICh2ICE9PSB1bmRlZmluZWQgfHwgdiAhPT0gbnVsbCA/IEpTT04ucGFyc2UodikgOiB2KVxuY29uc3Qgd3JhcCA9ICh2KSA9PiAodiAhPT0gdW5kZWZpbmVkIHx8IHYgIT09IG51bGwgPyBKU09OLnN0cmluZ2lmeSh2KSA6IHYpXG5jb25zdCBzb3VyY2UgPSAnYnJpZGdlOmxpbmsnXG5jb25zdCBzYWZlT3JpZ2lucyA9IFsnZmlsZTovLyddLmNvbmNhdChcbiAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdkZXZlbG9wbWVudCcgPyBbJ2h0dHA6Ly9sb2NhbGhvc3Q6MTIzNCddIDogW11cbilcblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXG4gICdtZXNzYWdlJyxcbiAgKGUpID0+IHtcbiAgICBpZiAoIXNhZmVPcmlnaW5zLmluY2x1ZGVzKGUub3JpZ2luKSB8fCBlLmRhdGEuc291cmNlPy5pbmNsdWRlcygncmVhY3QtZGV2dG9vbHMnKSkgcmV0dXJuXG4gICAgY29uc3QgZGF0YSA9IHVud3JhcChlLmRhdGEpXG4gICAgaWYgKGRhdGEuc291cmNlICE9PSBzb3VyY2UpIHtcbiAgICAgIGlmIChkYXRhLm1ldGhvZCA9PT0gJ3JwYycpIHtcbiAgICAgICAgcmV0dXJuIHJwYyguLi5kYXRhLmFyZ3MsICguLi5hcmdzKSA9PlxuICAgICAgICAgIGUuc291cmNlLnBvc3RNZXNzYWdlKHdyYXAoeyBtZXRob2Q6ICdycGMnLCBpZDogZGF0YS5pZCwgYXJncywgc291cmNlIH0pLCBlLm9yaWdpbilcbiAgICAgICAgKVxuICAgICAgfVxuICAgICAgaWYgKGRhdGEubWV0aG9kID09PSAnZXZlbnQnKSByZXR1cm4gaXBjUmVuZGVyZXIuc2VuZCguLi5kYXRhLmFyZ3MpXG4gICAgICBpZiAoZGF0YS5tZXRob2QgPT09ICdpbnZva2UnKSB7XG4gICAgICAgIDsoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGFyZ3MgPSBhd2FpdCBpcGNSZW5kZXJlci5pbnZva2UoLi4uZGF0YS5hcmdzKVxuICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSh3cmFwKHsgbWV0aG9kOiAnaW52b2tlJywgY2hhbm5lbDogJ2FjdGlvbicsIGlkOiBkYXRhLmlkLCBhcmdzLCBzb3VyY2UgfSksICcqJylcbiAgICAgICAgfSkoKVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgZmFsc2VcbilcblxuaXBjUmVuZGVyZXIub24oJ21haW46YWN0aW9uJywgKC4uLmFyZ3MpID0+IHtcbiAgYXJncy5zaGlmdCgpXG4gIHdpbmRvdy5wb3N0TWVzc2FnZSh3cmFwKHsgbWV0aG9kOiAnZXZlbnQnLCBjaGFubmVsOiAnYWN0aW9uJywgYXJncywgc291cmNlIH0pLCAnKicpXG59KVxuXG5pcGNSZW5kZXJlci5vbignbWFpbjpmbGV4JywgKC4uLmFyZ3MpID0+IHtcbiAgYXJncy5zaGlmdCgpXG4gIHdpbmRvdy5wb3N0TWVzc2FnZSh3cmFwKHsgbWV0aG9kOiAnZXZlbnQnLCBjaGFubmVsOiAnZmxleCcsIGFyZ3MsIHNvdXJjZSB9KSwgJyonKVxufSlcblxuaXBjUmVuZGVyZXIub24oJ21haW46ZGFwcCcsICguLi5hcmdzKSA9PiB7XG4gIGFyZ3Muc2hpZnQoKVxuICB3aW5kb3cucG9zdE1lc3NhZ2Uod3JhcCh7IG1ldGhvZDogJ2V2ZW50JywgY2hhbm5lbDogJ2RhcHAnLCBhcmdzLCBzb3VyY2UgfSksICcqJylcbn0pXG4iLCJpbXBvcnQgeyBpcGNSZW5kZXJlciB9IGZyb20gJ2VsZWN0cm9uJ1xubGV0IGkgPSAwXG5jb25zdCBuZXdJZCA9ICgpID0+ICsraVxuXG5jb25zdCBkZWZpbmVkID0gKHZhbHVlKSA9PiB2YWx1ZSAhPT0gdW5kZWZpbmVkIHx8IHZhbHVlICE9PSBudWxsXG5cbmNvbnN0IGhhbmRsZXJzID0ge31cblxuaXBjUmVuZGVyZXIub24oJ21haW46cnBjJywgKHNlbmRlciwgaWQsIC4uLmFyZ3MpID0+IHtcbiAgaWYgKCFoYW5kbGVyc1tpZF0pIHJldHVybiBjb25zb2xlLmxvZygnTWVzc2FnZSBmcm9tIG1haW4gUlBDIGhhZCBubyBoYW5kbGVyOicsIGFyZ3MpXG4gIGFyZ3MgPSBhcmdzLm1hcCgoYXJnKSA9PiAoZGVmaW5lZChhcmcpID8gSlNPTi5wYXJzZShhcmcpIDogYXJnKSlcbiAgaGFuZGxlcnNbaWRdKC4uLmFyZ3MpXG4gIGRlbGV0ZSBoYW5kbGVyc1tpZF1cbn0pXG5cbmV4cG9ydCBkZWZhdWx0ICguLi5hcmdzKSA9PiB7XG4gIGNvbnN0IGNiID0gYXJncy5wb3AoKVxuICBpZiAodHlwZW9mIGNiICE9PSAnZnVuY3Rpb24nKSB0aHJvdyBuZXcgRXJyb3IoJ01haW4gUlBDIHJlcXVpcmVzIGEgY2FsbGJhY2snKVxuICBjb25zdCBpZCA9IG5ld0lkKClcbiAgaGFuZGxlcnNbaWRdID0gY2JcbiAgYXJncyA9IGFyZ3MubWFwKChhcmcpID0+IChkZWZpbmVkKGFyZykgPyBKU09OLnN0cmluZ2lmeShhcmcpIDogYXJnKSlcbiAgaXBjUmVuZGVyZXIuc2VuZCgnbWFpbjpycGMnLCBKU09OLnN0cmluZ2lmeShpZCksIC4uLmFyZ3MpXG59XG4iXSwibmFtZXMiOltdLCJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJpZGdlLmpzLm1hcCJ9
