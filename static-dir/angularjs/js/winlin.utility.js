/**
 * depends: jquery1.10
 * https://code.csdn.net/snippets/147103
 * @see: http://blog.csdn.net/win_lin/article/details/17994347
 * v 1.0.1
 */

/**
* padding the output.
* padding(3, 5, '0') is 00003
* padding(3, 5, 'x') is xxxx3
* @see http://blog.csdn.net/win_lin/article/details/12065413
*/
function padding(number, length, prefix) {
    if(String(number).length >= length){
        return String(number);
    }
    return padding(prefix+number, length, prefix);
}

/**
* parse the query string to object.
* parse the url location object as: host(hostname:http_port), pathname(dir/filename)
* for example, url http://192.168.1.168:1980/ui/players.html?vhost=player.vhost.com&app=test&stream=livestream
* parsed to object:
{
    host        : "192.168.1.168:1980",
    hostname    : "192.168.1.168",
    http_port   : 1980,
    pathname    : "/ui/players.html",
    dir         : "/ui",
    filename    : "/players.html",
    
    vhost       : "player.vhost.com",
    app         : "test",
    stream      : "livestream"
}
* @see: http://blog.csdn.net/win_lin/article/details/17994347
*/
function parse_query_string(){
    var obj = {};
    
    // add the uri object.
    // parse the host(hostname:http_port), pathname(dir/filename)
    obj.host = window.location.host;
    obj.hostname = window.location.hostname;
    obj.http_port = (window.location.port == "")? 80:window.location.port;
    obj.pathname = window.location.pathname;
    if (obj.pathname.lastIndexOf("/") <= 0) {
        obj.dir = "/";
        obj.filename = "";
    } else {
        obj.dir = obj.pathname.substr(0, obj.pathname.lastIndexOf("/"));
        obj.filename = obj.pathname.substr(obj.pathname.lastIndexOf("/"));
    }
    
    // pure user query object.
    obj.user_query = {};
    
    // parse the query string.
    var query_string = String(window.location.search).replace(" ", "").split("?")[1];
    if(query_string == undefined){
        query_string = String(window.location.hash).replace(" ", "").split("#")[1];
        if(query_string == undefined){
            return obj;
        }
    }
    
    var queries = query_string.split("&");
    $(queries).each(function(){
        var query = this.split("=");
        obj[query[0]] = query[1];
        obj.user_query[query[0]] = query[1];
    });
    
    return obj;
}

/**
* get the agent.
* @return an object specifies some browser.
*   for example, get_browser_agents().MSIE
* @see: http://blog.csdn.net/win_lin/article/details/17994347
*/
function get_browser_agents() {
    var agent = navigator.userAgent;
    
    /**
    WindowsPC platform, Win7:
        chrome 31.0.1650.63:
            Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 
            (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36
        firefox 23.0.1:
            Mozilla/5.0 (Windows NT 6.1; WOW64; rv:23.0) Gecko/20100101 
            Firefox/23.0
        safari 5.1.7(7534.57.2):
            Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/534.57.2 
            (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2
        opera 15.0.1147.153:
            Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 
            (KHTML, like Gecko) Chrome/28.0.1500.95 Safari/537.36 
            OPR/15.0.1147.153
        360 6.2.1.272: 
            Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.1; WOW64; 
            Trident/6.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; 
            .NET CLR 3.0.30729; Media Center PC 6.0; InfoPath.2; .NET4.0C; 
            .NET4.0E)
        IE 10.0.9200.16750(update: 10.0.12):
            Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.1; WOW64; 
            Trident/6.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; 
            .NET CLR 3.0.30729; Media Center PC 6.0; InfoPath.2; .NET4.0C; 
            .NET4.0E)
    */
    
    return {
        // platform
        Android: agent.indexOf("Android") != -1,
        Windows: agent.indexOf("Windows") != -1,
        iPhone: agent.indexOf("iPhone") != -1,
        // Windows Browsers
        Chrome: agent.indexOf("Chrome") != -1,
        Firefox: agent.indexOf("Firefox") != -1,
        QQBrowser: agent.indexOf("QQBrowser") != -1,
        MSIE: agent.indexOf("MSIE") != -1, 
        // Android Browsers
        Opera: agent.indexOf("Presto") != -1,
        MQQBrowser: agent.indexOf("MQQBrowser") != -1
    };
}

/**
 * format relative seconds to HH:MM:SS,
 * for example, 210s formated to 00:03:30
 * @see: http://blog.csdn.net/win_lin/article/details/17994347
 */
function relative_seconds_to_HHMMSS(seconds){
    var date = new Date();
    date.setTime(Number(seconds) * 1000);

    var ret = padding(date.getUTCHours(), 2, '0')
        + ":" + padding(date.getUTCMinutes(), 2, '0')
        + ":" + padding(date.getUTCSeconds(), 2, '0');

    return ret;
}

/**
 * format absolute seconds to HH:MM:SS,
 * for example, 1389146480s (2014-01-08 10:01:20 GMT+0800) formated to 10:01:20
 * @see: http://blog.csdn.net/win_lin/article/details/17994347
 */
function absolute_seconds_to_HHMMSS(seconds){
    var date = new Date();
    date.setTime(Number(seconds) * 1000);

    var ret = padding(date.getHours(), 2, '0')
        + ":" + padding(date.getMinutes(), 2, '0')
        + ":" + padding(date.getSeconds(), 2, '0');

    return ret;
}

/**
 * format absolute seconds to YYYY-mm-dd,
 * for example, 1389146480s (2014-01-08 10:01:20 GMT+0800) formated to 2014-01-08
 * @see: http://blog.csdn.net/win_lin/article/details/17994347
 */
function absolute_seconds_to_YYYYmmdd(seconds) {
    var date = new Date();
    date.setTime(Number(seconds) * 1000);

    var ret = date.getFullYear()
        + "-" + padding(date.getMonth() + 1, 2, '0')
        + "-" + padding(date.getDate(), 2, '0');

    return ret;
}

/**
 * async refresh function call. to avoid multiple call.
 * @remark AsyncRefresh is for jquery to refresh the speicified pfn in a page;
 *      if angularjs, use AsyncRefresh2 to change pfn, cancel previous request for angularjs use singleton object.
 * @param refresh_interval the default refresh interval ms.
 * @see: http://blog.csdn.net/win_lin/article/details/17994347
 * the pfn can be implements as following:
        var async_refresh = new AsyncRefresh(pfn, 3000);
        function pfn() {
            if (!async_refresh.refresh_is_enabled()) {
                async_refresh.request(100);
                return;
            }
            $.ajax({
                type: 'GET', async: true, url: 'xxxxx',
                complete: function(){
                    if (!async_refresh.refresh_is_enabled()) {
                        async_refresh.request(0);
                    } else {
                        async_refresh.request(async_refresh.refresh_interval);
                    }
                },
                success: function(res){
                    // if donot allow refresh, directly return.
                    if (!async_refresh.refresh_is_enabled()) {
                        return;
                    }

                    // render the res.
                }
            });
        }
 */
function AsyncRefresh(pfn, refresh_interval) {
    this.refresh_interval = refresh_interval;

    this.__handler = null;
    this.__pfn = pfn;

    this.__enabled = true;
}
/**
 * disable the refresher, the pfn must check the refresh state.
 */
AsyncRefresh.prototype.refresh_disable = function() {
    this.__enabled = false;
}
AsyncRefresh.prototype.refresh_enable = function() {
    this.__enabled = true;
}
AsyncRefresh.prototype.refresh_is_enabled = function() {
    return this.__enabled;
}
/**
 * start new async request
 * @param timeout the timeout in ms.
 *      user can use the refresh_interval of the AsyncRefresh object,
 *      which initialized in constructor.
 */
AsyncRefresh.prototype.request = function(timeout) {
    if (this.__handler) {
        clearTimeout(this.__handler);
    }

    this.__handler = setTimeout(this.__pfn, timeout);
}

/**
 * async refresh v2, support cancellable refresh, and change the refresh pfn.
 * @remakr for angularjs. if user only need jquery, maybe AsyncRefresh is better.
 * @see: http://blog.csdn.net/win_lin/article/details/17994347
 * Usage:
        vlbControllers.controller('CServers', ['$scope', 'MServer', function($scope, MServer){
            async_refresh2.refresh_change(function(){
                // 获取服务器列表
                MServer.servers_load({}, function(data){
                    $scope.servers = data.data.servers;
                    async_refresh2.request();
                });
            }, 3000);

            async_refresh2.request(0);
        }]);
        vlbControllers.controller('CStreams', ['$scope', 'MStream', function($scope, MStream){
            async_refresh2.refresh_change(function(){
                // 获取流列表
                MStream.streams_load({}, function(data){
                    $scope.streams = data.data.streams;
                    async_refresh2.request();
                });
            }, 3000);

            async_refresh2.request(0);
        }]);
 */
function AsyncRefresh2() {
    // use a anonymous function to call, and check the enabled when actually invoke.
    this.__call = {
        pfn: null,
        timeout: 0,
        __enabled: false,
        __handler: null
    }
}
// singleton
var async_refresh2 = new AsyncRefresh2();
/**
 * initialize or refresh change. cancel previous request, setup new request.
 * @param pfn a function():void to request after timeout. null to disable refresher.
 * @param timeout the timeout in ms, to call pfn. null to disable refresher.
 */
AsyncRefresh2.prototype.initialize = function(pfn, timeout) {
    this.refresh_change(pfn, timeout);
}
AsyncRefresh2.prototype.stop = function() {
    this.refresh_change(null, null);
}
AsyncRefresh2.prototype.refresh_change = function(pfn, timeout) {
    // cancel the previous call.
    if (this.__call.__handler) {
        clearTimeout(this.__handler);
    }
    this.__call.__enabled = false;

    // setup new call.
    this.__call = {
        pfn: pfn,
        timeout: timeout,
        __enabled: true,
        __handler: null
    };
}
/**
 * start new request, we never auto start the request,
 * user must start new request when previous completed.
 * @param timeout [optional] if not specified, use the timeout in initialize or refresh_change.
 */
AsyncRefresh2.prototype.request = function(timeout) {
    var this_call = this.__call;

    // clear previous timeout.
    if (this_call.__handler) {
        clearTimeout(this_call.__handler);
    }

    // override the timeout
    if (timeout == undefined) {
        timeout = this_call.timeout;
    }

    // if user disabled refresher.
    if (this_call.pfn == null || timeout == null) {
        return;
    }

    this_call.__handler = setTimeout(function(){
        // cancelled by refresh_change, ignore.
        if (!this_call.__enabled) {
            return;
        }
        this_call.pfn();
    }, timeout);
}

/**
 * array sort asc, for example:
 * [a, b] in [10, 11, 9]
 * then sort to: [9, 10, 11]
 * Usage, for example:
        obj.data.data.sort(function(a, b){
            return array_sort_asc(parseInt(a.metadata.meta_id), parseInt(b.metadata.meta_id));
        });
 * @see: http://blog.csdn.net/win_lin/article/details/17994347
 * @remark, if need desc, use -1*array_sort_asc(a,b)
 */
function array_sort_asc(elem_a, elem_b) {
    if (elem_a > elem_b) {
        return 1;
    }
    return (elem_a < elem_b)? -1 : 0;
}

// other components.
/**
* pager, see: http://blog.csdn.net/win_lin/article/details/17628631
*/