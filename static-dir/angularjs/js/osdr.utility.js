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
        0x100: '系统错误',
        0x200: '用户未绑定'
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
        alert("您没有登录，或者权限不够，请登录");
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
 *          kvs: {
 *              200: "tom",
 *              201: "kate"
 *          },
 *          first: 200 // null for empty users.
 *      }
 */
function api_users_for_select(data) {
    var users = [];
    var kvs = {};
    for (var i = 0; i < data.users.length; i++){
        var user = data.users[i];
        users.push({name:user.id, value:user.value});
        kvs[user.id] = user.value;
    }
    return {
        users: users,
        kv: kvs,
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
 *          kvs: {
 *              200: "Player",
 *              201: "Server"
 *          },
 *          first: 200 // null for empty products.
 *      }
 */
function api_products_for_select(data) {
    var products = [];
    var kvs = {};
    for (var i = 0; i < data.data.length; i++){
        var product = data.data[i];
        products.push({name:product.id, value:product.value});
        kvs[product.id] = product.value;
    }
    return {
        products: products,
        kv: kvs,
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
 *          kvs: {
 *              200: "Coding",
 *              201: "Testing"
 *          },
 *          first: 200 // null for empty types.
 *      }
 */
function api_types_for_select(data) {
    var types = [];
    var kvs = {};
    for (var i = 0; i < data.data.length; i++){
        var type = data.data[i];
        types.push({name:type.id, value:type.value});
        kvs[type.id] = type.value;
    }
    return {
        types: types,
        kv: kvs,
        first: (types.length > 0? types[0].name : null)
    };
}
/**
 * convert api types to required format for "select" control bind.
 * @param data is
 *      {
 *          code: 0,
 *          data: [
 *              {id: 201, value: "客户端"}
 *          ]
 *      }
 * @returns an object is
 *      {
 *          groups: [
 *              {id: -1, value: "所有人"},
 *              {id: 201, value: "客户端"}
 *          ],
 *          kvs: {
 *              -1: "所有人",
 *              201: "客户端"
 *          },
 *          first: 0 // null for empty groups.
 *      }
 */
function api_groups_for_select(data) {
    // always appends the all users.
    var groups = [{name:-1, value:'所有人'}];
    for (var i = 0; i < data.data.length; i++){
        var group = data.data[i];
        groups.push({name:group.id, value:group.value});
    }
    var kvs = {};
    for (var i = 0; i < groups.length; i++){
        var group = groups[i];
        kvs[group.id] = group.value;
    }
    return {
        groups: groups,
        kv: kvs,
        first: (groups.length > 0? groups[0].name : null)
    };
}

/**
 * convert the api reports for reg(sumbit render).
 * @param data is
 *      {
 *          code: 0,
 *          data: [
 *              {
 *                  report_id: 400,
 *                  user_id: 200,
 *                  bug_id: 1670,
 *                  product_id: 100,
 *                  type_id: 300,
 *                  work_hours: 8,
 *                  priority: 0,
 *                  report_content: "编写代码",
 *                  insert_date: "2014-12-09 13:51:32",
 *                  modify_date: "2014-12-09 13:51:32",
 *                  work_date: "2014-12-09 00:00:00"
 *              }
 *          ]
 *      }
 * @returns an array is
 *      [
 *          {
 *              id: 400,
 *              user: 200,
 *              bug: 1670,
 *              product: 100,
 *              type: 300,
 *              time: 8,
 *              content: "编写代码",
 *              editing: false
 *          }
 *      ]
 */
function api_reports_for_reg(products, types, data) {
    var reports = [];
    for (var i = 0; i < data.data.length; i++){
        var report = data.data[i];
        reports.push({
            id: report.report_id,
            user: report.user_id,
            bug: report.bug_id,
            product: report.product_id,
            type: report.type_id,
            time: report.work_hours,
            content: report.report_content,
            editing: false
        });
    }
    return reports;
}

/**
 * parse reports from works to create reports.
 * @param works the works of submit page.
 */
function api_parse_reports_for_create(date, user, works) {
    var reports = [];
    for (var i = 0; i < works.length; i++){
        var report = works[i];
        reports.push({
            report_id: (report.id? report.id:0),
            bug_id: report.bug,
            product_id: report.product,
            type_id: report.type,
            work_hours: report.time,
            report_content: report.content,
            priority: 0
        });
    }
    return {
        user: user,
        date: date,
        items: reports
    };
}

function api_parse_users_for_mgmt(data, admins) {
    var users = [];
    for (var i = 0; i < data.data.length; i++) {
        var user = data.data[i];
        users.push({
            id: user.user_id,
            name: user.user_name,
            email: user.email,
            enabled: user.enabled? true:false,
            editing: false,
            admin: system_array_contains(admins, function(elem){return elem.user_id == user.user_id;})
        });
    }
    users.sort(function(a,b){
        var v = system_array_sort_desc(a.enabled, b.enabled);
        if (v) return v;
        v = system_array_sort_desc(a.admin, b.admin);
        return v? v:system_array_sort_desc(a.id, b.id);
    });
    for (var i = 0; i < users.length; i++) {
        var user = users[i];
        user.index = i + 1;
    }
    return users;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// application level data conversion
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function create_empty_work_item(user_id) {
    return {
        id: null,
        user: user_id,
        bug: null,
        product: null,
        type: null,
        time: null,
        content: null,
        editing: true
    };
}
function reset_report_work_item(works) {
    for (var i = 0; i < works.length; i++) {
        var work = works[i];
        work.editing = false;
    }
}
function object_is_empty(obj) {
    return obj == null || obj == undefined || obj == "";
}

// sort: big to small, desc
function work_hours_sort(a, b){
    return array_sort_desc(a.work_hours, b.work_hours);
}
// sort: user id big to small, desc
function user_id_sort(a, b){
    if(a.length > 0 && b.length > 0){
        return array_sort_desc(a[0].user_id, b[0].user_id);
    }
    return 0;
}
// sort the user object by enabled, then by id, asc
function user_enabled_id_sort_asc(a, b){
    return array_sort_asc(a.user_id, b.user_id);
}
// sort the user object by enabled, then by id, desc
function user_enabled_id_sort_desc(a, b){
    var v = array_sort_desc(a.enabled, b.enabled);
    return v? v:array_sort_desc(a.user_id, b.user_id);
}
// sort: user report id small to big, asc.
function report_sort(a, b){
    return array_sort_desc(a.report_id, b.report_id);
}
// sort: user report insert_date small to big, asc.
function report_first_insert_sort(a, b){
    var da = YYYYmmdd_parse(a.insert_date);
    var db = YYYYmmdd_parse(b.insert_date);
    return array_sort_asc(da.getTime(), db.getTime());
}
// sort: user report modify_date small to big, asc.
function report_modify_date_sort(a, b){
    var da = YYYYmmdd_parse(a.modify_date);
    var db = YYYYmmdd_parse(b.modify_date);
    return array_sort_asc(da.getTime(), db.getTime());
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// control level data conversion
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// http://raphaeljs.com/pie.html
// http://raphaeljs.com/pie.js
Raphael.fn.pieChart = function (hsb_start, cx, cy, r, values, labels, stroke) {
    var stroke_width = 2;
    var text_position_delta = -50;
    var font_text_size = 12;

    var paper = this,
        rad = Math.PI / 180,
        chart = this.set();
    function sector(cx, cy, r, startAngle, endAngle, params) {
        var x1 = cx + r * Math.cos(-startAngle * rad),
            x2 = cx + r * Math.cos(-endAngle * rad),
            y1 = cy + r * Math.sin(-startAngle * rad),
            y2 = cy + r * Math.sin(-endAngle * rad);
        return paper.path(["M", cx, cy, "L", x1, y1, "A", r, r, 0, +(endAngle - startAngle > 180), 0, x2, y2, "z"]).attr(params);
    }

    // draw bg fill when only 1 element
    if(values.length == 1){
        var circle = paper.circle(cx, cy, r);
        color = Raphael.hsb(hsb_start, .75, 1),
            circle.attr("fill", color);
        circle.attr("stroke", stroke);
        circle.attr("stroke-width", stroke_width);

        var label = labels[0] + '\n' + values[0] + '%';
        circle.attr("title", label);
    }

    // draw pie.
    var angle = 0,
        total = 0,
        start = hsb_start,
        process = function (j) {
            var value = values[j],
                angleplus = 360 * value / total,
                popangle = angle + (angleplus / 2),
                color = Raphael.hsb(start, .75, 1),
                ms = 500,
                delta = text_position_delta,
                bcolor = Raphael.hsb(start, 1, 1),
                label = labels[j] + '\n' + value + '%',
                p = sector(cx, cy, r, angle, angle + angleplus, {fill: "90-" + bcolor + "-" + color, stroke: stroke, "stroke-width": stroke_width, "title": label}),
                label_color = Raphael.hsb(start, 1, 0.5),
                txt_cx = cx + (r + delta) * Math.cos(-popangle * rad),
                txt_cy = cy + (r + delta) * Math.sin(-popangle * rad),
                txt = paper.text(txt_cx, txt_cy, label).attr({fill: label_color, stroke: "none", opacity: 1, "font-size": font_text_size, "title": label});
            p.mouseover(function () {
                p.stop().animate({transform: "s1.1 1.1 " + cx + " " + cy}, ms, "elastic");
                txt.stop().animate({opacity: 1}, ms, "elastic");
            }).mouseout(function () {
                    p.stop().animate({transform: ""}, ms, "elastic");
                    txt.stop().animate({opacity: 1}, ms);
                });
            angle += angleplus;
            chart.push(p);
            chart.push(txt);
            start += .1;
        };
    for (var i = 0, ii = values.length; i < ii; i++) {
        total += values[i];
    }
    for (i = 0; i < ii; i++) {
        process(i);
    }
    return chart;
};
