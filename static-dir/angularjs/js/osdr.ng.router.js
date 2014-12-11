/**
 * depends: angularjs1.2
 */

// the application, system main object.
var vlbApp = angular.module('vlbApp', ['ngRoute', 'vlbControllers', 'vlbFilters', 'vlbServices']);
// the controllers, used to generate variety controllers for views.
var vlbControllers = angular.module('vlbControllers', []);
// the filters, for system to regenerate data.
var vlbFilters = angular.module('vlbFilters', []);
// the services, system model, RESTful data from backend api.
var vlbServices = angular.module('vlbServices', ['ngResource']);

// links,
var links = {
    index: {
        mount: "/" // ng_index.html
    },
    submit: {
        mount: "/submit", link: "#/submit",
        page: "views/submit.html", controller: "CChannels", text: "填写日报"
    },
    view: {
        mount: "/view", link: "#/view",
        page: "views/view.html", controller: "CPrograms", text: "查看日报"
    }
};

// config the route
vlbApp.config(['$routeProvider', function($routeProvider) {
        $routeProvider
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
// controller: CChannels, for the view submit.html.
vlbControllers.controller('CChannels', ['$scope', '$routeParams', 'MChannel', function($scope, $routeParams, MChannel){
    $scope.$parent.nav_active_submit();
    async_refresh2.stop();
    logs.info("请填写日报");
}]);
// controller: CPrograms, for the view view.html.
vlbControllers.controller('CPrograms', ['$scope', '$routeParams', '$location', 'MProgram', function($scope, $routeParams, $location, MProgram){
    $scope.$parent.nav_active_view();

    async_refresh2.refresh_change(function(){
        logs.info("正在获取日报信息");
        /*MProgram.programs_load({}, function(data){
            $scope.programs = data.data.programs;
            async_refresh2.request();
        });*/
    }, 3000);

    async_refresh2.request(0);
    logs.info("正在获取日报信息");
}]);

// config the filter
// the filter for the main app, the index page.
vlbFilters.filter('sample_filter', function(){
    return function(input) {
        return input? "not-null":"null";
    };
})
.filter('main_nav_active', function() {
    return function(is_active) {
        return is_active? "active": null;
    };
});

// config the services
vlbServices.factory('MChannel', ['$resource', function($resource){
    return $resource('/api/v1/channels', {}, {
        channels_load: {method: 'GET'}
    });
}]);
vlbServices.factory('MProgram', ['$resource', function($resource){
    return $resource('/api/v1/programs', {}, {
        programs_load: {method: 'GET'}
    });
}]);
vlbServices.factory('MHttpInterceptor', function($q){
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
                vlb_on_error(response.data.code, response.status, response.data.desc);
                // the $q.reject, will cause the error function of controller.
                // @see: https://code.angularjs.org/1.2.0-rc.3/docs/api/ng.$q
                return $q.reject(response.data.code);
            }
            return response || $q.when(response);
        },
        'responseError': function(rejection) {
            code = vlb_on_error(Errors.UIApiError, rejection.status, rejection.data);
            return $q.reject(code);
        }
    };
});
