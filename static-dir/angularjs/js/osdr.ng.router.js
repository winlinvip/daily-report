/**
 * depends: angularjs1.2
 */

// the application, system main object.
var osdrApp = angular.module('osdrApp', ['ngRoute', 'osdrControllers', 'osdrFilters', 'osdrServices']);
// the controllers, used to generate variety controllers for views.
var osdrControllers = angular.module('osdrControllers', []);
// the filters, for system to regenerate data.
var osdrFilters = angular.module('osdrFilters', []);
// the services, system model, RESTful data from backend api.
var osdrServices = angular.module('osdrServices', ['ngResource']);

// links,
var links = {
    index: {
        mount: "/" // ng_index.html
    },
    login: {
        mount: "/login", link: "#/login",
        page: "views/login.html", controller: "CLogin", text: "登录"
    },
    submit: {
        mount: "/submit", link: "#/submit",
        page: "views/submit.html", controller: "CSubmit", text: "填写日报"
    },
    view: {
        mount: "/view", link: "#/view",
        page: "views/view.html", controller: "CView", text: "查看日报"
    }
};

// for authentication jump
function jmp_to_user_login_page($location) {
    $location.path(links.login.mount);
}

// config the route
osdrApp.config(['$routeProvider', function($routeProvider) {
        $routeProvider
        .when(links.login.mount, {
            templateUrl: links.login.page, controller: links.login.controller
        })
        .when(links.submit.mount, {
            templateUrl: links.submit.page, controller: links.submit.controller
        })
        .when(links.view.mount, {
            templateUrl: links.view.page, controller: links.view.controller
        })
        .otherwise({
            redirectTo: links.submit.mount
        });
    }])
// config the http interceptor.
.config(['$httpProvider', function($httpProvider){
    $httpProvider.interceptors.push('MHttpInterceptor');
}])
//  controllers for app
.controller('CMain', ['$scope', '$location', function($scope, $location) {
    $scope.nav_brand_title = get_system_name() + "(v" + version + ")";
    $scope.__nav_active = null;

    // the navigator bind and update.
    $scope.navs = {
        submit: {mount: links.submit.mount, url: links.submit.link, text: links.submit.text, target:"_self"},
        view: {mount: links.view.mount, url: links.view.link, text: links.view.text, target:"_self"}
    };
    $scope.get_nav_active = function() {
        return $scope.__nav_active? $scope.__nav_active: $scope.navs.servers;
    };
    $scope.nav_active_submit = function() {
        $scope.__nav_active = $scope.navs.submit;
    };
    $scope.nav_active_view = function() {
        $scope.__nav_active = $scope.navs.view;
    };
    $scope.is_nav_selected = function(nav_or_navs) {
        if ($scope.__nav_active == nav_or_navs) {
            return true;
        }
        for (var i = 0; i < nav_or_navs.length; i++) {
            var nav = nav_or_navs[i];
            if ($scope.__nav_active == nav) {
                return true;
            }
        }
        return false;
    }
}]);
// controller: CLogin, for the view login.html.
osdrControllers.controller('CLogin', ['$scope', '$routeParams', 'MUser', function($scope, $routeParams, MUser){
    logs.info("请登录系统");
}]);
// controller: CSubmit, for the view submit.html.
osdrControllers.controller('CSubmit', ['$scope', '$routeParams', 'MUser', 'MProduct', 'MTypes', 'MReport', 'MRedmine',
    function($scope, $routeParams, MUser, MProduct, MTypes, MReport, MRedmine){
    // add new report object.
    $scope.report_reg = {
        user_id: null,
        date: absolute_seconds_to_YYYYmmdd(new Date().getTime() / 1000),
        modified: false,
        works: []
    };
    // consts
    $scope.const_product = get_product_label();
    $scope.const_type = get_type_label();
    $scope.enabled_redmine = enable_redmine_retieve();
    // the users return by server.
    $scope.users = {};
    // the products return by server.
    $scope.products = {};
    // the work types return by server.
    $scope.types = {};
    // when select user.
    $scope.on_change_user = function() {
        $scope.refresh_page(null);
    };
    // check
    $scope.check_for_change_date = function() {
        if ($scope.report_reg.modified) {
            logs.warn(0, "您修改了日报尚未提交，不能切换日期。您可以选择：<br/>" +
                "<li>手动修改日期后提交日报</li>" +
                "<li>或刷新页面，放弃所做的所有修改</li>");
            return false;
        }
        return true;
    }
    $scope.check_for_work = function(work) {
        if (!$scope.report_reg.user_id) {
            logs.warn("请选择填报人");
            return false;
        }
        if ($scope.report_reg.date == "") {
            logs.warn("请输入填报日期，格式为：年-月-日");
            return false;
        }
        if (object_is_empty(work.bug)) {
            logs.warn("请输入Issue号");
            return false;
        }
        if(isNaN(work.bug)){
            logs.warn("Issue号必须是整数");
            return false;
        }
        if (object_is_empty(work.product)) {
            logs.warn("请选择工作项所属的产品");
            return false;
        }
        if (object_is_empty(work.type)) {
            logs.warn("请选择工作项的类型");
            return false;
        }
        if (object_is_empty(work.time)) {
            logs.warn("请输入工作项所花的时间");
            return false;
        }
        if(isNaN(work.time) || Number(work.time) <= 0){
            logs.warn("工作项所花的时间必须是非零的数字");
            return false;
        }
        if(isNaN(work.time) || Number(work.time) > 12){
            logs.warn("工作项所花的时间不能大于12小时");
            return false;
        }
        if (object_is_empty(work.content)) {
            logs.warn("请输入工作项的内容");
            return false;
        }
        return true;
    }
    // when change date
    $scope.on_change_date_previous = function() {
        if (!$scope.check_for_change_date()) return;
        var date = YYYYmmdd_parse($scope.report_reg.date);
        date.setDate(date.getDate() - 1);
        $scope.report_reg.date = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
        $scope.refresh_page(null);
    };
    $scope.on_change_date_next = function() {
        if (!$scope.check_for_change_date()) return;
        var date = YYYYmmdd_parse($scope.report_reg.date);
        date.setDate(date.getDate() + 1);
        $scope.report_reg.date = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
        $scope.refresh_page(null);
    };
    $scope.on_change_date_today = function() {
        if (!$scope.check_for_change_date()) return;
        $scope.report_reg.date = absolute_seconds_to_YYYYmmdd(new Date().getTime() / 1000);
        $scope.refresh_page(null);
    };
    $scope.on_change_date_yesterday = function() {
        if (!$scope.check_for_change_date()) return;
        var date = new Date();
        date.setDate(date.getDate() - 1);
        $scope.report_reg.date = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
        $scope.refresh_page(null);
    };
    $scope.on_change_date_previous_friday = function() {
        if (!$scope.check_for_change_date()) return;
        var date = new Date();
        date.setDate(date.getDate() - 2 - date.getDay());
        $scope.report_reg.date = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
        $scope.refresh_page(null);
    };
    // when remove specified work item
    $scope.on_remove_work = function(work) {
        $scope.report_reg.modified = true;
        system_array_remove($scope.report_reg.works, work);
        logs.info("删除工作项" + (work.id? work.id:""));
    };
    $scope.on_modify_work = function(work) {
        work.editing = true;
        $scope.report_reg.modified = true;
        logs.info("修改工作项" + (work.id? work.id:""));
    };
    $scope.on_finish_work = function(work) {
        if (!$scope.check_for_work(work)) return;
        work.editing = false;
        $scope.report_reg.modified = true;
        logs.info("完成编辑工作项" + (work.id? work.id:""));
    };
    $scope.on_retrieve_work = function(work) {
        MRedmine.redmine_load({
            id: work.bug
        }, function(data){
            var report_content = data.issue.subject;
            if (report_content.lastIndexOf("。") == -1) {
                report_content += "。";
            }
            if(data.issue.status.name != "新建" && data.issue.status.name != "进行中"){
                report_content += data.issue.status.name + "。";
            }
            work.content = report_content;
            $scope.report_reg.modified = true;
            logs.info("获取Issue信息成功");
        });
    };
    $scope.on_add_empty_work = function() {
        $scope.report_reg.works.push(create_empty_work_item($scope.users.first));
    };
    $scope.on_submit_work = function() {
        for (var i = 0; i < $scope.report_reg.works.length; i++) {
            var work = $scope.report_reg.works[i];
            if (!$scope.check_for_work(work)) return;
        }
        if (object_is_empty($scope.report_reg.works) || $scope.report_reg.works.length <= 0) {
            logs.warn("请填写日报后提交");
            return;
        }
        var params = api_parse_reports_for_create(
            $scope.report_reg.date,
            $scope.report_reg.user_id,
            $scope.report_reg.works
        );
        MReport.reports_create(params, function(data){
            reset_report_work_item($scope.report_reg.works);
            $scope.report_reg.modified = false;
            alert("日报填写成功");
            logs.info("日报填写成功");
        });
    };
    $scope.refresh_page = function(callback) {
        MReport.reports_load({
            summary: 0,
            query_all: 1,
            start_time: $scope.report_reg.date,
            end_time: $scope.report_reg.date,
            user_id: $scope.report_reg.user_id
        }, function(data) {
            // parse the daily reports.
            $scope.report_reg.works = api_reports_for_reg($scope.products, $scope.types, data);
            // call the callback handler.
            if (callback) {
                callback(data);
            }
        });
    };

    $scope.$parent.nav_active_submit();

    // request products
    MProduct.products_load({}, function(products){
        $scope.products = api_products_for_select(products);
        logs.info("产品类型加载成功");
        // request types
        MTypes.types_load({}, function(types){
            $scope.types = api_types_for_select(types);
            logs.info("工作类别加载成功");
            // request users
            MUser.users_load({}, function(users){
                $scope.users = api_users_for_select(users);
                $scope.report_reg.user_id = $scope.users.first;
                logs.info("用户信息加载成功");
                $scope.refresh_page(function(data){
                    logs.info("日报信息加载成功");
                });
            });
        });
    });

    logs.info("数据加载中");
}]);
// controller: CView, for the view view.html.
osdrControllers.controller('CView', ['$scope', '$routeParams', '$location', 'MProgram', function($scope, $routeParams, $location, MProgram){
    $scope.$parent.nav_active_view();
    logs.info("正在获取日报信息");
}]);

// config the filter
// the filter for the main app, the index page.
osdrFilters
.filter('sample_filter', function(){
    return function(input) {
        return input? "not-null":"null";
    };
})
.filter('main_nav_active', function() {
    return function(is_active) {
        return is_active? "active": null;
    };
})
.filter('filter_div_empty_class', function() {
    return function(v) {
        return v? "": "error";
    };
})
.filter('filter_div_null_class', function() {
    return function(v) {
        return (v == null || v == undefined)? "error": "";
    };
})
.filter('filter_bug_url', function() {
    return function(bug_id) {
        return get_redmine_issue_url() + "/" + bug_id;
    };
})
.filter('filter_redmine_url', function() {
    return function(bug_id) {
        return get_origin_redmine_url() + "/" + bug_id;
    };
})
;

// config the services
osdrServices.factory('MUser', ['$resource', function($resource){
    return $resource('/users', {}, {
        users_load: {method: 'GET'}
    });
}]);
osdrServices.factory('MProduct', ['$resource', function($resource){
    return $resource('/products', {}, {
        products_load: {method: 'GET'}
    });
}]);
osdrServices.factory('MTypes', ['$resource', function($resource){
    return $resource('/work_types', {}, {
        types_load: {method: 'GET'}
    });
}]);
osdrServices.factory('MReport', ['$resource', function($resource){
    return $resource('/reports', {}, {
        reports_load: {method: 'GET'},
        reports_create: {method: 'POST'}
    });
}]);
osdrServices.factory('MRedmine', ['$resource', function($resource){
    return $resource('/redmines/:id', {}, {
        redmine_load: {method: 'GET'}
    });
}]);
osdrServices.factory('MHttpInterceptor', function($q, $location){
    // register the interceptor as a service
    // @see: https://code.angularjs.org/1.2.0-rc.3/docs/api/ng.$http
    // @remark: the function($q) should never add other params.
    return {
        'request': function(config) {
            return config || $q.when(config);
        },
        'requestError': function(rejection) {
            return $q.reject(rejection);
        },
        'response': function(response) {
            if (response.data.code && response.data.code != Errors.Success) {
                osdr_on_error($location, response.data.code, response.status, response.data.desc);
                // the $q.reject, will cause the error function of controller.
                // @see: https://code.angularjs.org/1.2.0-rc.3/docs/api/ng.$q
                return $q.reject(response.data.code);
            }
            return response || $q.when(response);
        },
        'responseError': function(rejection) {
            code = osdr_on_error($location, Errors.UIApiError, rejection.status, rejection.data);
            return $q.reject(code);
        }
    };
});
