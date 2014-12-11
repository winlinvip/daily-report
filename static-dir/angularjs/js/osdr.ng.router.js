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
osdrControllers.controller('CSubmit', ['$scope', '$routeParams', 'MUser', 'MProduct', 'MTypes', function($scope, $routeParams, MUser, MProduct, MTypes){
    // add new report object.
    $scope.report_reg = {
        user_id: null,
        date: absolute_seconds_to_YYYYmmdd(new Date().getTime() / 1000)
    };
    // the users return by server.
    $scope.users = {};
    // the products return by server.
    $scope.products = {};
    // the work types return by server.
    $scope.types = {};
    // the work items return by server or added by user.
    $scope.works = [];
    // when select user.
    $scope.on_change_user = function() {
    };
    // when change date
    $scope.on_change_date_today = function() {
        $scope.report_reg.date = absolute_seconds_to_YYYYmmdd(new Date().getTime() / 1000)
    };
    $scope.on_change_date_yesterday = function() {
        var date = new Date();
        date.setDate(date.getDate() - 1);
        $scope.report_reg.date = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000)
    };
    $scope.on_change_date_previous_friday = function() {
        var date = new Date();
        date.setDate(date.getDate() - 2 - date.getDay());
        $scope.report_reg.date = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000)
    };
    // when remove specified work item
    $scope.on_remove_work = function(work) {
    };
    $scope.on_modify_work = function(work) {
        if (!work.product && $scope.products) {
            work.product = $scope.products.first;
        }
        work.editing = true;
    };
    $scope.on_finish_work = function(work) {
        work.editing = false;
    };
    $scope.on_add_empty_work = function(work) {
        $scope.works.push(create_empty_work_item($scope.products, $scope.types));
    };
    // when initialize ok
    $scope.initialized = false;
    $scope.on_initialized = function() {
        if ($scope.initialized) {
            return;
        }
        if ($scope.users.first && $scope.products.first && $scope.types.first) {
            $scope.works.push(create_empty_work_item($scope.products, $scope.types));
            $scope.initialized = true;
        }
    }

    $scope.$parent.nav_active_submit();
    MUser.users_load({}, function(data){
        var users = api_users_for_select(data);
        $scope.report_reg.user_id = users.first;
        $scope.users = users;
        $scope.on_initialized();
    });
    MProduct.products_load({}, function(data){
        $scope.products = api_products_for_select(data);
        $scope.on_initialized();
    });
    MTypes.types_load({}, function(data){
        $scope.types = api_types_for_select(data);
        $scope.on_initialized();
    });

    logs.info("请填写日报");
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
