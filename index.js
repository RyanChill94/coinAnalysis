const axios = require('axios');

const PRINCIPAL_RMB = 5000; // 本金 

const ExchangeRate= {
    ZB_RMB_TO_USDT: 6.70,
    ZB_USDT_TO_RMB:6.63,
    REALTIME_USDT_TO_RMB:6.53   // 后续改成实时接口
}

// usdt * 6.63 ==>profit
// 5000/6.7 ==> usdt


let zbObj = {};  // 存放ZB数据
let bnObj = {};  // 存放币安数据
let zbTickerArr = []; //币安参数请求列表


const reqAddr = {
    zb_market: 'http://api.zb.com/data/v1/markets', // zb市场信息 
    zb_ticker: 'http://api.zb.com/data/v1/ticker', // zb获取单个行情的具体信息
    binance_ticker: 'https://api.binance.com/api/v1/ticker/allPrices' //获取币安市场行情

}

const delay = (ms) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(new Error('请求超时！'))
        }, ms)
    })
}

const log = (msg) => {
    console.log(...msg)
}

// const fetchWithTimeout = (timeout, config) => { // race并行执行多个promise，结果由最先结束的Promise决定
//     return Promise.race([axios(config), delay(timeout)])
// }

const fetch = (config) => { // race并行执行多个promise，结果由最先结束的Promise决定
    return axios(config);
}

const _generateZBdata = (data) => {
    for (var i in data) {
        var name = i && i.toUpperCase().replace('_', '');
        zbObj[name] = {};
        zbTickerArr.push(i);
    }
    return zbTickerArr.slice(0);
}

const _limit = (float,fix) => {
    return float.toFixed(fix);
}

const _analysis = () => {
    var result = [];
    // usdt 路线
    var originUSDT = _limit(PRINCIPAL_RMB/ExchangeRate.ZB_RMB_TO_USDT,8);
    
    for(var p in zbObj){
        // BTSUSDT -->BTS
        if(p.indexOf('USDT') == -1) continue;

        var name = p.replace('USDT','');

        for(var bp in bnObj){
            var reg = new RegExp("^("+ name  +")(\\w*)");
            var afterVal;
            var path ='';

            currencyArray = reg.exec(bp);
            if( currencyArray && bp.indexOf(name) !== -1 ){
                if(currencyArray[2] === 'USDT'){
                    afterVal = originUSDT/zbObj[p].ticker.sell * bnObj[bp] * ExchangeRate.REALTIME_USDT_TO_RMB ;
                    path = `RMB=>USDT=>${name}=>${currencyArray[2]}=>RMB`;
                }else{
                    afterVal = originUSDT/zbObj[p].ticker.sell * bnObj[bp] * bnObj[ currencyArray[2] + 'USDT'] * ExchangeRate.REALTIME_USDT_TO_RMB ;
                    path = `RMB=>USDT=>${name}=>${currencyArray[2]}=>USDT=>RMB`;
                }
                var profit =  _limit(afterVal/PRINCIPAL_RMB,4) * 100 +'%';
                result.push({
                    path:path,
                    afterVal:afterVal,
                    profit:profit
                })
            }
        }
    }
    return result;
}

// 获取币安目前正在交易的币种
async function getZBmarket() {
    log(["开始请求ZB市场行情"]);
    return fetch(reqAddr.zb_market).then(response => response.data);
}

async function getBNmarket() {
    log(["开始请求币安市场行情"]);
    return fetch(reqAddr.binance_ticker)
        .then((res) => {
            var data = res.data;
            if(data && data.length !== 0 ){
                data.forEach(e => {
                    bnObj[e.symbol] = e.price;
                });
            }
            return true;
        });
};


async function getZBAllticker(tickerArray) {
    const proc = (tickerName) => {
        var name = tickerName && tickerName.toUpperCase().replace('_', '');
        var reqConfig = {
            url: reqAddr.zb_ticker,
            methods: 'get',
            params: {
                market: tickerName
            }
        };
        return fetch(reqConfig)
            .then(responseData => {
                // responseData.date = date
                zbObj[name] = responseData.data;
            })
    }
    return await Promise.all(tickerArray.map(proc))
}


async function transferAnalysis() {
    try {
        var data = await getZBmarket();
        var zbTickerArr = _generateZBdata(data);
        var flag1 = await getZBAllticker(zbTickerArr);
        var flag2 = await getBNmarket();
        if (flag1 && flag1) {
            log(['实时数据获取成功，开始分析']);
            var ss = _analysis();
            log([ss])
            // log([zbObj])
        } else {
            log(['数据获取失败，请重试'])
        }
    } catch (e) {
        console.error(e)
    }

}

// function test(){
//     var data  =  axios({ url: reqAddr.zb_ticker , methods:'get' , params:{market:'ubtc_usdt'}}).then(res => res.data);
//     console.log(data);
// }

transferAnalysis();


// test()


//module.exports = RequestUtils