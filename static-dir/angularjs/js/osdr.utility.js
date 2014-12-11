/**
 * error code defines.
 */
function Errors() {
}
Errors.Success = 0;
// errors >= 10000 are ui errors.
Errors.UIApiError = 10000;
Errors.UIUnAuthoriezed = 10001;
Errors.UINotFound = 10002;
// resolve error code
Errors.resolve = function(code, status, desc) {
    var err_map = {
        100: '没有达到api要求的参数个数，请检查参数',
        101: 'api要求参数必须指定，请检查参数',
        102: 'api要求参数为非null，请检查参数',
        103: 'api要求参数为非空，请检查参数',
        104: 'api要求参数的类型为bool，请检查参数',
        105: 'api要求参数的类型为数组，请检查参数',
        106: 'api要求参数的类型为int，请检查参数'
    };
    err_map[Errors.UIUnAuthoriezed] = "您没有登录或者登录超时，请重新登录";
    err_map[Errors.UINotFound] = "访问的资源不存在";
    err_map[Errors.UIApiError] = "服务器错误";

    var msg = "";

    // always parse the code.
    if (err_map[code]) {
        msg += err_map[code];
    } else {
        msg += "未知错误";
    }

    // show status code when http unknown error.
    if (code == Errors.UIApiError) {
        msg += "，HTTP：" + status;
    }

    // hide the detail when http known error.
    if (code <= Errors.UIApiError && desc) {
        msg += "，原因：" + desc;
    }

    return msg;
};
/**
 * global error function for backend.
 * @param code the error code, from backend or js error code.
 * @param status http status code, if code is http unknown error, show it.
 * @param desc the description of error from backend, or http error data.
 */
function osdr_on_error($location, code, status, desc) {
    // we parse the http error to system error code.
    var http_known_error = {
        401: Errors.UIUnAuthoriezed,
        404: Errors.UINotFound
    };
    if (code == Errors.UIApiError && http_known_error[status]) {
        code = http_known_error[status];
    }

    // process the system error.
    if (code == Errors.UIUnAuthoriezed) {
        alert("请登录");
        jmp_to_user_login_page($location);
        return code;
    }

    // show error message to log. ignore errors:
    // 406: user test, has not login yet.
    if (code != 406) {
        logs.warn(code, Errors.resolve(code, status, desc));
    }

    // when error, the normally refresh will lost control,
    // we start the default refresh here.
    async_refresh2.request();
    return code;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// api level data conversion
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * convert api users to required format for "select" control bind.
 * @param data is
 *      {
 *          code: 0,
 *          users: [
 *              {id: 200, value: "tom"},
 *              {id: 201, value: "kate"}
 *          ],
 *          auth: null
 *      }
 * @returns an object is
 *      {
 *          users: [
 *              {name:200, value:"tom"},
 *              {name:201, value:"kate"}
 *          ],
 *          first: 200 // null for empty users.
 *      }
 */
function api_users_for_select(data) {
    var users = [];
    for (var i = 0; i < data.users.length; i++){
        var user = data.users[i];
        users.push({name:user.id, value:user.value});
    }
    return {
        users: users,
        first: (users.length > 0? users[0].name : null)
    };
}
/**
 * convert api products to required format for "select" control bind.
 * @param data is
 *      {
 *          code: 0,
 *          data: [
 *              {id: 200, value: "Player"},
 *              {id: 201, value: "Server"}
 *          ],
 *          auth: null
 *      }
 * @returns an object is
 *      {
 *          products: [
 *              {name:200, value:"Player"},
 *              {name:201, value:"Server"}
 *          ],
 *          first: 200 // null for empty products.
 *      }
 */
function api_products_for_select(data) {
    var products = [];
    for (var i = 0; i < data.data.length; i++){
        var product = data.data[i];
        products.push({name:product.id, value:product.value});
    }
    return {
        products: products,
        first: (products.length > 0? products[0].name : null)
    };
}
/**
 * convert api types to required format for "select" control bind.
 * @param data is
 *      {
 *          code: 0,
 *          data: [
 *              {id: 200, value: "Coding"},
 *              {id: 201, value: "Testing"}
 *          ],
 *          auth: null
 *      }
 * @returns an object is
 *      {
 *          types: [
 *              {name:200, value:"Coding"},
 *              {name:201, value:"Testing"}
 *          ],
 *          first: 200 // null for empty types.
 *      }
 */
function api_types_for_select(data) {
    var types = [];
    for (var i = 0; i < data.data.length; i++){
        var type = data.data[i];
        types.push({name:type.id, value:type.value});
    }
    return {
        types: types,
        first: (types.length > 0? types[0].name : null)
    };
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// application level data conversion
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function create_empty_work_item() {
    return {
        bug: 0,
        product: null,
        type: null,
        time: null,
        content: null,
        editing: true
    };
}