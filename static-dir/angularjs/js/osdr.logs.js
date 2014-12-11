/**
 * depends: jquery1.10 bootstrap2
 */
// singleton
var logs = new Logs();

/**
 * 日志模块
 * 用法：
 *  1. 在页面放置元素：
        <div id="log"></div>
 *  2. 然后调用函数：
        var logs = new Logs();
        logs.render($("#log"));
 */
function Logs() {
    self.__id = 100;
}
/**
 * 日志模板，页面的信息日志和错误日志展示的地方。
 * @param jquery_obj jquery页面容器对象。
 */
Logs.prototype.render = function (jquery_obj) {
    jquery_obj.html(
        '  <!-- for log -->                                                                     ' +
        '  <div class="container" id="__log">                                                   ' +
        '      <!-- for info -->                                                                ' +
        '      <div id="log_info" class="alert alert-info fade in hide">                        ' +
        '          <button type="button" class="close" data-dismiss="alert">×</button>          ' +
        '          <strong><span id="log_title"></span></strong> <span id="log_msg"></span>     ' +
        '      </div>                                                                           ' +
        '      <!-- for warn -->                                                                ' +
        '      <div id="log_warn" class="alert alert-warn fade in hide">                        ' +
        '          <button type="button" class="close" data-dismiss="alert">×</button>          ' +
        '          <strong><span id="log_title"></span></strong> <span id="log_msg"></span>     ' +
        '      </div>                                                                           ' +
    '');
}
Logs.prototype.clear = function() {
    $("#__log").find("#_log_info").remove();
    $("#__log").find("#_log_warn").remove();
}
Logs.prototype.info = function (msg) {
    if($("#__log").find("#_log_info").length == 0) {
        var template = $("#__log").find("#log_info");
        var log = $("<div/>").html(template.html())
            .attr("id", "_log_info")
            .attr("class", "alert alert-info fade in hide");
        $("#__log").append(log);
    }

    $("#__log").find("#_log_info").find("#log_title").html("Info:");
    var desc = '#' + (self.__id++) + ": " + msg;
    $("#__log").find("#_log_info").find("#log_msg").html(desc);

    $("#__log").find("#_log_info").alert().show();
}
Logs.prototype.warn = function (code, msg) {
    if($("#__log").find("#_log_warn").length == 0) {
        var template = $("#__log").find("#log_warn");
        var log = $("<div/>").html(template.html())
            .attr("id", "_log_warn")
            .attr("class", "alert alert-warn fade in hide");
        $("#__log").append(log);
    }

    $("#__log").find("#_log_warn").find("#log_title").html("Warn:");
    var desc = '#' + (self.__id++) + ":" + " code=" + code + ", " + msg;
    $("#__log").find("#_log_warn").find("#log_msg").html(desc);

    $("#__log").find("#_log_warn").alert().show();
}
