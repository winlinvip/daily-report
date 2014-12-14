/**
 * depends: angularjs1.2
 */

// the application, system main object.
var osdrApp = angular.module('osdrApp', ['ngRoute', 'osdrControllers', 'osdrFilters', 'osdrServices', 'osdrDirectives']);
// the controllers, used to generate variety controllers for views.
var osdrControllers = angular.module('osdrControllers', []);
// the filters, for system to regenerate data.
var osdrFilters = angular.module('osdrFilters', []);
// the services, system model, RESTful data from backend api.
var osdrServices = angular.module('osdrServices', ['ngResource']);
// the directives, for some special features.
var osdrDirectives = angular.module('osdrDirectives', []);

// links,
var links = {
    index: {
        mount: "/" // ng_index.html
    },
    login: {
        mount: "/login", link: "#/login",
        page: "views/login.html", controller: "CLogin", text: "登录"
    },
    user: {
        mount: "/user", link: "#/user",
        page: "views/user.html", controller: "CUser", text: "用户管理"
    },
    user_group: {
        mount: "/user/:userId", link: "#/user/:userId",
        page: "views/user_group.html", controller: "CUserGroup", text: "用户所属组管理"
    },
    group: {
        mount: "/group", link: "#/group",
        page: "views/group.html", controller: "CGroup", text: "组管理"
    },
    category: {
        mount: "/category", link: "#/category",
        page: "views/category.html", controller: "CCategory", text: "分类管理"
    },
    group_user: {
        mount: "/group/:groupId", link: "#/group/:groupId",
        page: "views/group_user.html", controller: "CGroupUser", text: "组的用户管理"
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
        .when(links.user.mount, {
            templateUrl: links.user.page, controller: links.user.controller
        })
        .when(links.category.mount, {
            templateUrl: links.category.page, controller: links.category.controller
        })
        .when(links.user_group.mount, {
            templateUrl: links.user_group.page, controller: links.user_group.controller
        })
        .when(links.group_user.mount, {
            templateUrl: links.group_user.page, controller: links.group_user.controller
        })
        .when(links.group.mount, {
            templateUrl: links.group.page, controller: links.group.controller
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
        view: {mount: links.view.mount, url: links.view.link, text: links.view.text, target:"_self"},
        user: {mount: links.user.mount, url: links.user.link, text: links.user.text, target:"_self"},
        category: {mount: links.category.mount, url: links.category.link, text: links.category.text, target:"_self"},
        group: {mount: links.group.mount, url: links.group.link, text: links.group.text, target:"_self"}
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
    $scope.nav_active_user = function() {
        $scope.__nav_active = $scope.navs.user;
    };
    $scope.nav_active_category = function() {
        $scope.__nav_active = $scope.navs.category;
    };
    $scope.nav_active_group = function() {
        $scope.__nav_active = $scope.navs.group;
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
// controller: CCategory, for the view category.html.
osdrControllers.controller('CCategory', ['$scope', '$routeParams', 'MAdmin', function($scope, $routeParams, MAdmin){
    $scope.url = links.category.mount;
    $scope.products = [];
    $scope.types = [];
    // user actions for products
    $scope.add_product = function(){
        logs.info("添加新分类");
        $scope.products.splice(0, 0, {
            editing: true,
            name: null,
            index: $scope.products.length + 1
        });
    };
    $scope.on_modify_product = function(product) {
        product.editing = true;
    };
    $scope.on_submit_product = function(product) {
        if (!product.name) {
            logs.warn(0, "请输入分类名称");
            return;
        }

        if (!product.id) {
            logs.info("添加新分类");
            MAdmin.admins_load({
                action: "create_product",
                name: product.name
            }, function(data){
                product.id = parseInt(data.data);
                product.editing = false;
                logs.info("分类创建成功");
            });
            return;
        }

        logs.info("修改分类信息");
        MAdmin.admins_load({
            action: "set_product",
            id: product.id,
            name: product.name
        }, function(data){
            product.editing = false;
            logs.info("修改分类信息成功");
        });
    };
    $scope.on_cancel_product = function(product) {
        system_array_remove($scope.products, product);
    };
    // user actions for types
    $scope.add_type = function(){
        logs.info("添加新分类");
        $scope.types.splice(0, 0, {
            editing: true,
            name: null,
            index: $scope.types.length + 1
        });
    };
    $scope.on_modify_type = function(type) {
        type.editing = true;
    };
    $scope.on_submit_type = function(type) {
        if (!type.name) {
            logs.warn(0, "请输入分类名称");
            return;
        }

        if (!type.id) {
            logs.info("添加新分类");
            MAdmin.admins_load({
                action: "create_type",
                name: type.name
            }, function(data){
                type.id = parseInt(data.data);
                type.editing = false;
                logs.info("分类创建成功");
            });
            return;
        }

        logs.info("修改分类信息");
        MAdmin.admins_load({
            action: "set_type",
            id: type.id,
            name: type.name
        }, function(data){
            type.editing = false;
            logs.info("修改分类信息成功");
        });
    };
    $scope.on_cancel_type = function(type) {
        system_array_remove($scope.types, type);
    };

    MAdmin.admins_load({
        action: "get_products"
    }, function(data) {
        $scope.products = api_parse_products_for_mgmt(data);
    });
    MAdmin.admins_load({
        action: "get_types"
    }, function(data) {
        $scope.types = api_parse_types_for_mgmt(data);
    });

    $scope.$parent.nav_active_category();
    logs.info("正在加载分类信息");
}]);
// controller: CGroup, for the view group.html.
osdrControllers.controller('CGroup', ['$scope', '$routeParams', 'MAdmin', function($scope, $routeParams, MAdmin){
    $scope.url = links.group.mount;
    $scope.groups = [];

    // user actions.
    $scope.on_modify_group = function(group){
        logs.info("编辑组信息");
        group.editing = true;
    };
    $scope.on_cancel_group = function(group){
        logs.info("取消新建组");
        system_array_remove($scope.groups, group);
    };
    $scope.on_submit_group = function(group){
        if (!group.name) {
            logs.warn(0, "请输入组名称");
            return;
        }

        if (!group.id) {
            logs.info("添加新组");
            MAdmin.admins_load({
                action: "create_group",
                name: group.name
            }, function(data){
                group.id = parseInt(data.data);
                group.editing = false;
                logs.info("组创建成功");
            });
            return;
        }

        logs.info("修改组信息");
        MAdmin.admins_load({
            action: "set_group",
            id: group.id,
            name: group.name
        }, function(data){
            group.editing = false;
            logs.info("修改组信息成功");
        });
    };
    $scope.add_group = function(){
        logs.info("添加新组");
        $scope.groups.splice(0, 0, {
            editing: true,
            name: null,
            index: $scope.groups.length + 1
        });
    };

    MAdmin.admins_load({
        action: "get_groups"
    }, function(data){
        $scope.groups = api_parse_groups_for_mgmt(data);
        if ($routeParams.add) {
            $scope.add_group();
        }
        logs.info("组信息加载成功");
    });

    $scope.$parent.nav_active_group();
    logs.info("正在加载组信息");
}]);
// controller: CGroupUser, for the view group_user.html.
osdrControllers.controller('CGroupUser', ['$scope', '$routeParams', 'MAdmin', function($scope, $routeParams, MAdmin){
    $scope.user_url = links.user.link + "?add";
    $scope.url = links.group_user.mount;
    $scope.group = null;

    $scope.on_change_group = function(user){
        MAdmin.admins_load({
            action: "set_user_group",
            in: user.in,
            group_id: $scope.group.group_id,
            user_id: user.id
        }, function(data){
            logs.info("更新用户组成功");
        });
    };

    var init_group = function(group, group_users, users) {
        group.users = [];
        for (var i = 0; i < users.length; i++) {
            var user = users[i];
            group.users.push({
                id: user.user_id,
                name: user.user_name,
                email: user.email,
                enabled: user.enabled == 1? true: false,
                in: system_array_contains(group_users, function(elem){return elem.user_id == user.user_id})
            });
        }
        group.users.sort(function(a,b){
            var v = system_array_sort_desc(a.in, b.in);
            if (v) return v;
            v = system_array_sort_desc(a.enabled, b.enabled);
            return v? v : system_array_sort_desc(a.id, b.id);
        });
        $scope.group = group;
    };

    MAdmin.admins_load({
        action: "get_group",
        group_id: $routeParams.groupId
    }, function(group){
        logs.info("组信息加载成功");
        MAdmin.admins_load({
            action: "get_group_user",
            group_id: $routeParams.groupId
        }, function(group_users){
            logs.info("组用户信息加载成功");
            MAdmin.admins_load({
                action: "get_users"
            }, function(users){
                logs.info("用户信息加载成功");
                init_group(group.data, group_users.data, users.data);
            });
        });
    });

    $scope.$parent.nav_active_group();
    logs.info("正在加载组和用户信息");
}]);
// controller: CUserGroup, for the view user_group.html.
osdrControllers.controller('CUserGroup', ['$scope', '$routeParams', 'MAdmin', function($scope, $routeParams, MAdmin){
    $scope.group_url = links.group.link + "?add";
    $scope.url = links.user_group.mount;
    $scope.user = null;

    $scope.on_change_group = function(group) {
        MAdmin.admins_load({
            action: "set_user_group",
            in: group.in,
            group_id: group.group_id,
            user_id: $scope.user.user_id
        }, function(data){
            logs.info("更新用户组成功");
        });
    };

    var init_user_groups = function(user, user_groups, groups){
        user.groups = [];
        for (var i = 0; i < groups.length; i++) {
            var group = groups[i];
            user.groups.push({
                group_id: group.group_id,
                group_name: group.group_name,
                in: system_array_contains(user_groups, function(elem){
                    return elem.group_id == group.group_id;
                })
            });
        }
        user.groups.sort(function(a,b){
            var v = array_sort_desc(a.in, b.in);
            return v? v: array_sort_desc(a.group_id, b.group_id);
        });
        $scope.user = user;
    };

    MAdmin.admins_load({
        action: "get_user",
        id: $routeParams.userId
    }, function(user){
        logs.info("用户信息加载成功");
        MAdmin.admins_load({
            action: "get_user_group",
            id: $routeParams.userId
        }, function(user_groups) {
            logs.info("用户组信息加载成功");
            MAdmin.admins_load({
                action: "get_groups"
            }, function(groups) {
                logs.info("组信息加载成功");
                init_user_groups(user.data, user_groups.data, groups.data);
            });
        });
    });

    $scope.$parent.nav_active_user();
    logs.info("正在加载用户和组信息");
}]);
// controller: CUser, for the view user.html.
osdrControllers.controller('CUser', ['$scope', '$routeParams', 'MAdmin', function($scope, $routeParams, MAdmin){
    $scope.url = links.user.mount;
    $scope.users = [];
    // utility functions.
    var update_user_admin = function(user) {
        MAdmin.admins_load({
            action: "set_admin",
            admin: user.admin,
            user_id: user.id
        }, function(data){
            logs.info("更新用户管理员身份成功");
        });
    };
    var update_user_info = function(user, callback) {
        if (!user.name) {
            logs.warn(0, "请输入用户名");
            return;
        }
        // create user.
        if (!user.id) {
            MAdmin.admins_load({
                action: "create_user",
                name: user.name,
                email: user.email,
                enabled: user.enabled
            }, function(data){
                logs.info("创建用户成功, id=" + data.data);
                user.id = parseInt(data.data);
                if (callback) callback();
                update_user_admin(user);
            });
            return;
        }
        // update user
        MAdmin.admins_load({
            action: "set_user",
            name: user.name,
            email: user.email,
            enabled: user.enabled,
            id: user.id
        }, function(data){
            logs.info("更新用户信息成功");
            if (callback) callback();
            update_user_admin(user);
        });
    };
    // for user actions.
    $scope.add_user = function() {
        $scope.users.splice(0, 0, {
            editing: true,
            enabled: true,
            email: null,
            name: null,
            index: $scope.users.length + 1
        });
    };
    $scope.on_cancel_user = function(user) {
        system_array_remove($scope.users, user);
        logs.info("取消添加用户");
    };
    $scope.on_modify_user = function(user) {
        user.editing = true;
    };
    $scope.on_submit_user = function(user) {
        update_user_info(user, function(){
            user.editing = false;
        });
    };
    $scope.on_disable_user = function(user) {
        user.enabled = false;
        update_user_info(user, function(){
            user.editing = false;
        });
    };
    $scope.on_enable_user = function(user) {
        user.enabled = true;
        update_user_info(user, function(){
            user.editing = false;
        });
    };

    // loads all users
    MAdmin.admins_load({
        action: "get_users"
    }, function(users){
        logs.info("获取了" + users.data.length + "个用户");
        MAdmin.admins_load({
            action: "get_admins"
        }, function(admins){
            $scope.users = api_parse_users_for_mgmt(users, admins.data);
            logs.info("加载管理员信息成功");
            if ($routeParams.add) {
                $scope.add_user();
            }
        });
    });

    $scope.$parent.nav_active_user();
    logs.info("管理用户");
}]);
// controller: CLogin, for the view login.html.
osdrControllers.controller('CLogin', ['$scope', '$routeParams', function($scope, $routeParams){
    var qq_auth_url = function() {
        // 应用的APPID
        var appID = get_qq_oauth_app_id();
        // 成功授权后的回调地址
        var redirectURI = get_qq_oauth_redirect_url();
        // 透传的状态
        var state = get_qq_oauth_state();

        var path = 'https://graph.qq.com/oauth2.0/authorize?';
        var queryParams = ['client_id=' + appID,
            'redirect_uri=' + redirectURI,
            'scope=' + 'get_user_info',
            'response_type=token',
            'state=' + state];

        var query = queryParams.join('&');
        var url = path + query;

        return url;
    };

    $scope.auth = enable_auth();
    $scope.title = get_system_title();
    $scope.url = qq_auth_url();
    $scope.use_angularjs = use_angularjs;

    logs.info("请登录系统");
}]);
// controller: CSubmit, for the view submit.html.
osdrControllers.controller('CSubmit', ['$scope', '$routeParams', 'MUser', 'MProduct', 'MType', 'MReport', 'MRedmine',
    function($scope, $routeParams, MUser, MProduct, MType, MReport, MRedmine){
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
    $scope.enable_issue = enable_bug_id();
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
        if (work.bug != 0 && object_is_empty(work.bug)) {
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
    MProduct.products_load({}, function(data){
        $scope.products = api_products_for_select(data);
        logs.info("产品类型加载成功");
        // request types
        MType.types_load({}, function(data){
            $scope.types = api_types_for_select(data);
            logs.info("工作类别加载成功");
            // request users
            MUser.users_load({}, function(data){
                $scope.users = api_users_for_select(data);
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
osdrControllers.controller('CView', ['$scope', '$routeParams', '$location', 'MGroup', 'MUser', 'MProduct', 'MType', 'MReport',
    function($scope, $routeParams, $location, MGroup, MUser, MProduct, MType, MReport) {
    // the query conditions.
    $scope.query = {
        group: null,
        all: true,
        date: absolute_seconds_to_YYYYmmdd(new Date().getTime() / 1000)
    };
    // consts
    $scope.const_time_unit = get_view_sum_unit_label();
    // the groups from server.
    $scope.groups = {};
    // the users of group in query.
    $scope.users = {};
    // the products of group in query.
    $scope.products = {};
    // the types of group in query.
    $scope.types = {};
    // the report of query
    $scope.reports = {};
    // when change date
    $scope.on_change_date_previous = function() {
        var date = YYYYmmdd_parse($scope.query.date);
        date.setDate(date.getDate() - 1);
        $scope.query.date = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
    };
    $scope.on_change_date_next = function() {
        var date = YYYYmmdd_parse($scope.query.date);
        date.setDate(date.getDate() + 1);
        $scope.query.date = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
    };
    $scope.on_change_date_today = function() {
        $scope.query.date = absolute_seconds_to_YYYYmmdd(new Date().getTime() / 1000);
    };
    $scope.on_change_date_yesterday = function() {
        var date = new Date();
        date.setDate(date.getDate() - 1);
        $scope.query.date = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
    };
    $scope.on_change_date_previous_friday = function() {
        var date = new Date();
        date.setDate(date.getDate() - 2 - date.getDay());
        $scope.query.date = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
    };
    // query report info from server.
    $scope.on_query = function() {
        $scope.reports.user_data = [];
        $scope.reports.day_product_data = [];
        $scope.reports.day_type_data = [];
        $scope.reports.month_product_data = [];
        $scope.reports.month_type_data = [];
        $scope.reports.quarter_product_data = [];
        $scope.reports.quarter_type_data = [];
        $scope.reports.year_product_data = [];
        $scope.reports.year_type_data = [];
        // render data
        $scope.reports.years = [];
        $scope.reports.quarters = [];
        $scope.reports.months = [];
        $scope.reports.days = [];
        $scope.reports.summaries = [];
        $scope.reports.users = [];

        MUser.users_load({
            query_all: $scope.query.all,
            group: $scope.query.group
        }, function(data){
            $scope.users = api_users_for_select(data);
            logs.info("组用户加载成功");
            MProduct.products_load({}, function(data){
                $scope.products = api_products_for_select(data);
                logs.info("产品类型加载成功");
                // request types
                MType.types_load({}, function(data){
                    $scope.types = api_types_for_select(data);
                    logs.info("工作类别加载成功");
                    $scope.query_report_user_detail();
                });
            });
        });
    };
    $scope.query_report_user_detail = function(){
        if (!$scope.users.first) {
            logs.warn(0, "选择的组没有用户");
            return;
        }

        logs.info("请求日期" + $scope.query.date + "的日报数据");
        var responsed_count = 0;
        for(var i = 0; i < $scope.users.users.length; i++){
            var user = $scope.users.users[i];
            logs.info("请求用户" + user.value + "在" + $scope.query.date + "的数据");
            var do_request = function(user){
                MReport.reports_load({
                    summary: 0,
                    query_all: $scope.query.all,
                    group: $scope.query.group,
                    start_time: $scope.query.date,
                    end_time: $scope.query.date,
                    user_id: user.name
                }, function(data){
                    if (data.data.length > 0) {
                        $scope.reports.user_data.push(data.data);
                    }
                    logs.info("加载" + user.value + "日报数据成功，共" + data.data.length + "条日报");
                    // if all data requested, request other messages.
                    if(++responsed_count == $scope.users.users.length){
                        logs.info("加载用户日报成功");
                        $scope.query_report_day_product_summary();
                        return;
                    }
                });
            };
            do_request(user);
        }
    };
    $scope.query_report_day_product_summary = function() {
        logs.info("请求当天日报product汇总数据");

        var date = YYYYmmdd_parse($scope.query.date);
        var start_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
        var end_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);

        logs.info("请求当天日报product汇总数据" + "，" + start_time + "至" + end_time);
        var responsed_count = 0;
        for(var i = 0; i < $scope.products.products.length; i++){
            var product = $scope.products.products[i];
            logs.info("请求产品" + product.value + "在" + $scope.query.date + "的数据");
            var do_request = function(product){
                MReport.reports_load({
                    summary: 1,
                    query_all: $scope.query.all,
                    group: $scope.query.group,
                    start_time: start_time,
                    end_time: end_time,
                    product_id: product.name
                }, function(data){
                    if (data.data.work_hours != null) {
                        $scope.reports.day_product_data.push(data.data);
                    }
                    // if all data requested, request other messages.
                    if(++responsed_count == $scope.products.products.length){
                        logs.info("加载当天日报product汇总数据成功");
                        $scope.query_report_day_type_summary();
                        return;
                    }
                });
            };
            do_request(product);
        }
    };
    $scope.query_report_day_type_summary = function() {
        logs.info("请求当天日报type汇总数据");

        var date = YYYYmmdd_parse($scope.query.date);
        var start_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
        var end_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);

        logs.info("请求当天日报type汇总数据" + "，" + start_time + "至" + end_time);
        var responsed_count = 0;
        for(var i = 0; i < $scope.types.types.length; i++){
            var type = $scope.types.types[i];
            logs.info("请求类型" + type.value + "在" + $scope.query.date + "的数据");
            var do_request = function(type){
                MReport.reports_load({
                    summary: 1,
                    query_all: $scope.query.all,
                    group: $scope.query.group,
                    start_time: start_time,
                    end_time: end_time,
                    type_id: type.name
                }, function(data){
                    if (data.data.work_hours != null) {
                        $scope.reports.day_type_data.push(data.data);
                    }
                    // if all data requested, request other messages.
                    if(++responsed_count == $scope.types.types.length){
                        logs.info("加载当天日报type汇总数据成功");
                        $scope.query_report_month_product_summary();
                        return;
                    }
                });
            };
            do_request(type);
        }
    };
    $scope.query_report_month_product_summary = function() {
        logs.info("请求月度日报product汇总数据");

        var date = YYYYmmdd_parse($scope.query.date);
        date.setDate(1);
        var start_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
        date.setMonth(date.getMonth() + 1);
        date.setDate(date.getDate() - 1);
        var end_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);

        logs.info("请求月度日报product汇总数据" + "，" + start_time + "至" + end_time);
        var responsed_count = 0;
        for(var i = 0; i < $scope.products.products.length; i++){
            var product = $scope.products.products[i];
            logs.info("请求产品" + product.value + "在" + start_time + "至" + end_time + "的数据");
            var do_request = function(product){
                MReport.reports_load({
                    summary: 1,
                    query_all: $scope.query.all,
                    group: $scope.query.group,
                    start_time: start_time,
                    end_time: end_time,
                    product_id: product.name
                }, function(data){
                    if (data.data.work_hours != null) {
                        $scope.reports.month_product_data.push(data.data);
                    }
                    // if all data requested, request other messages.
                    if(++responsed_count == $scope.products.products.length){
                        logs.info("加载月度日报product汇总数据成功");
                        $scope.query_report_month_type_summary();
                    }
                });
            };
            do_request(product);
        }
    };
    $scope.query_report_month_type_summary = function() {
        logs.info("请求月度日报type汇总数据");

        var date = YYYYmmdd_parse($scope.query.date);
        date.setDate(1);
        var start_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
        date.setMonth(date.getMonth() + 1);
        date.setDate(date.getDate() - 1);
        var end_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);

        logs.info("请求月度日报type汇总数据" + "，" + start_time + "至" + end_time);
        var responsed_count = 1;
        for(var i = 0; i < $scope.types.types.length; i++){
            var type = $scope.types.types[i];
            logs.info("请求类型" + type.value + "在" + start_time + "至" + end_time + "的数据");
            var do_request = function(type){
                MReport.reports_load({
                    summary: 1,
                    query_all: $scope.query.all,
                    group: $scope.query.group,
                    start_time: start_time,
                    end_time: end_time,
                    type_id: type.name
                }, function(data){
                    if (data.data.work_hours != null) {
                        $scope.reports.month_type_data.push(data.data);
                    }
                    // if all data requested, request other messages.
                    if(++responsed_count == $scope.types.types.length){
                        logs.info("加载月度日报type汇总数据成功");
                        $scope.query_report_quarter_product_summary();
                        return;
                    }
                });
            };
            do_request(type);
        }
    };
    $scope.query_report_quarter_product_summary = function() {
        logs.info("请求季度日报product汇总数据");

        var date = YYYYmmdd_parse($scope.query.date);
        date.setDate(1);
        date.setMonth(parseInt(date.getMonth() / 3) * 3);
        var start_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
        date.setMonth(parseInt(date.getMonth() / 3 + 1) * 3);
        date.setDate(date.getDate() - 1);
        var end_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);

        logs.info("请求季度日报product汇总数据" + "，" + start_time + "至" + end_time);
        var responsed_count = 0;
        for(var i = 0; i < $scope.products.products.length; i++){
            var product = $scope.products.products[i];
            logs.info("请求产品" + product.value + "在" + start_time + "至" + end_time + "的数据");
            var do_request = function(product){
                MReport.reports_load({
                    summary: 1,
                    query_all: $scope.query.all,
                    group: $scope.query.group,
                    start_time: start_time,
                    end_time: end_time,
                    product_id: product.name
                }, function(data){
                    if (data.data.work_hours != null) {
                        $scope.reports.quarter_product_data.push(data.data);
                    }
                    // if all data requested, request other messages.
                    if(++responsed_count == $scope.products.products.length){
                        logs.info("加载季度日报product汇总数据成功");
                        $scope.query_report_quarter_type_summary();
                    }
                });
            };
            do_request(product);
        }
    };
    $scope.query_report_quarter_type_summary = function() {
        logs.info("请求季度日报type汇总数据");

        var date = YYYYmmdd_parse($scope.query.date);
        date.setDate(1);
        date.setMonth(parseInt(date.getMonth() / 3) * 3);
        var start_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
        date.setMonth(parseInt(date.getMonth() / 3 + 1) * 3);
        date.setDate(date.getDate() - 1);
        var end_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);

        logs.info("请求季度日报type汇总数据" + "，" + start_time + "至" + end_time);
        var responsed_count = 0;
        for(var i = 0; i < $scope.types.types.length; i++){
            var type = $scope.types.types[i];
            logs.info("请求类型" + type.value + "在" + start_time + "至" + end_time + "的数据");
            var do_request = function(type){
                MReport.reports_load({
                    summary: 1,
                    query_all: $scope.query.all,
                    group: $scope.query.group,
                    start_time: start_time,
                    end_time: end_time,
                    type_id: type.name
                }, function(data){
                    if (data.data.work_hours != null) {
                        $scope.reports.quarter_type_data.push(data.data);
                    }
                    // if all data requested, request other messages.
                    if(++responsed_count == $scope.types.types.length){
                        logs.info("加载季度日报type汇总数据成功");
                        $scope.query_report_year_product_summary();
                        return;
                    }
                });
            };
            do_request(type);
        }
    };
    $scope.query_report_year_product_summary = function() {
        logs.info("请求年度日报product汇总数据");

        var date = YYYYmmdd_parse($scope.query.date);
        date.setMonth(0);
        date.setDate(1);
        date.setMonth(parseInt(date.getMonth() / 3) * 3);
        var start_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
        date.setFullYear(date.getFullYear() + 1);
        date.setDate(date.getDate() - 1);
        var end_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);

        logs.info("请求年度日报product汇总数据" + "，" + start_time + "至" + end_time);
        var responsed_count = 0;
        for(var i = 0; i < $scope.products.products.length; i++){
            var product = $scope.products.products[i];
            logs.info("请求产品" + product.value + "在" + start_time + "至" + end_time + "的数据");
            var do_request = function(product){
                MReport.reports_load({
                    summary: 1,
                    query_all: $scope.query.all,
                    group: $scope.query.group,
                    start_time: start_time,
                    end_time: end_time,
                    product_id: product.name
                }, function(data){
                    if (data.data.work_hours != null) {
                        $scope.reports.year_product_data.push(data.data);
                    }
                    // if all data requested, request other messages.
                    if(++responsed_count == $scope.products.products.length){
                        logs.info("加载年度日报product汇总数据成功");
                        $scope.query_report_year_type_summary();
                    }
                });
            };
            do_request(product);
        }
    };
    $scope.query_report_year_type_summary = function() {
        logs.info("请求年度日报type汇总数据");

        var date = YYYYmmdd_parse($scope.query.date);
        date.setMonth(0);
        date.setDate(1);
        date.setMonth(parseInt(date.getMonth() / 3) * 3);
        var start_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
        date.setFullYear(date.getFullYear() + 1);
        date.setDate(date.getDate() - 1);
        var end_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);

        logs.info("请求年度日报type汇总数据" + "，" + start_time + "至" + end_time);
        var responsed_count = 0;
        for(var i = 0; i < $scope.types.types.length; i++){
            var type = $scope.types.types[i];
            logs.info("请求类型" + type.value + "在" + start_time + "至" + end_time + "的数据");
            var do_request = function(type){
                MReport.reports_load({
                    summary: 1,
                    query_all: $scope.query.all,
                    group: $scope.query.group,
                    start_time: start_time,
                    end_time: end_time,
                    type_id: type.name
                }, function(data){
                    if (data.data.work_hours != null) {
                        $scope.reports.year_type_data.push(data.data);
                    }
                    // if all data requested, request other messages.
                    if(++responsed_count == $scope.types.types.length){
                        logs.info("加载年度日报type汇总数据成功");
                        $scope.render_report();
                        return;
                    }
                });
            };
            do_request(type);
        }
    };
    $scope.render_report = function() {
        logs.info("数据查询完毕，展示日报");
        $scope.render_year();
        $scope.render_quarter();
        $scope.render_month();
        $scope.render_day();
        $scope.render_summary();
        $scope.render_user();
    };
    $scope.render_year = function() {
        logs.info("展示年度汇总数据");

        $scope.reports.year_product_data.sort(work_hours_sort);
        if($scope.reports.year_product_data.length <= 0){
            return;
        }

        $scope.reports.year_type_data.sort(work_hours_sort);
        if($scope.reports.year_type_data.length <= 0){
            return;
        }

        var year = {
            text: YYYYmmdd_parse($scope.query.date).getFullYear(),
            product: {
                text: get_product_label(),
                labels: [],
                values: [],
                total_value: 0
            },
            type: {
                text: get_type_label(),
                labels: [],
                values: [],
                total_value: 0
            }
        };
        for(var i = 0; i < $scope.reports.year_product_data.length; i++){
            year.product.labels.push($scope.products.kv[$scope.reports.year_product_data[i].product_id]);
            year.product.total_value += $scope.reports.year_product_data[i].work_hours;
        }
        for(var i = 0; i < $scope.reports.year_product_data.length; i++){
            var percent = $scope.reports.year_product_data[i].work_hours * 100 / year.product.total_value;
            percent = Number(Number(percent).toFixed(1));
            year.product.values.push(percent);
        }
        for(var i = 0; i < $scope.reports.year_type_data.length; i++){
            year.type.labels.push($scope.types.kv[$scope.reports.year_type_data[i].type_id]);
            year.type.total_value += $scope.reports.year_type_data[i].work_hours;
        }
        for(var i = 0; i < $scope.reports.year_type_data.length; i++){
            var percent = $scope.reports.year_type_data[i].work_hours * 100 / year.type.total_value;
            percent = Number(Number(percent).toFixed(1));
            year.type.values.push(percent);
        }
        $scope.reports.years.push(year);
    };
    $scope.render_quarter = function() {
        logs.info("展示季度汇总数据");

        $scope.reports.quarter_product_data.sort(work_hours_sort);
        if($scope.reports.quarter_product_data.length <= 0){
            return;
        }

        $scope.reports.quarter_type_data.sort(work_hours_sort);
        if($scope.reports.quarter_type_data.length <= 0){
            return;
        }

        var quarter = {
            text: YYYYmmdd_parse($scope.query.date).getFullYear(),
            product: {
                text: get_product_label(),
                labels: [],
                values: [],
                total_value: 0
            },
            type: {
                text: get_type_label(),
                labels: [],
                values: [],
                total_value: 0
            }
        };
        for(var i = 0; i < $scope.reports.quarter_product_data.length; i++){
            quarter.product.labels.push($scope.products.kv[$scope.reports.quarter_product_data[i].product_id]);
            quarter.product.total_value += $scope.reports.quarter_product_data[i].work_hours;
        }
        for(var i = 0; i < $scope.reports.quarter_product_data.length; i++){
            var percent = $scope.reports.quarter_product_data[i].work_hours * 100 / quarter.product.total_value;
            percent = Number(Number(percent).toFixed(1));
            quarter.product.values.push(percent);
        }
        for(var i = 0; i < $scope.reports.quarter_type_data.length; i++){
            quarter.type.labels.push($scope.types.kv[$scope.reports.quarter_type_data[i].type_id]);
            quarter.type.total_value += $scope.reports.quarter_type_data[i].work_hours;
        }
        for(var i = 0; i < $scope.reports.quarter_type_data.length; i++){
            var percent = $scope.reports.quarter_type_data[i].work_hours * 100 / quarter.type.total_value;
            percent = Number(Number(percent).toFixed(1));
            quarter.type.values.push(percent);
        }
        $scope.reports.quarters.push(quarter);
    };
    $scope.render_month = function() {
        logs.info("展示月度汇总数据");

        $scope.reports.month_product_data.sort(work_hours_sort);
        if($scope.reports.month_product_data.length <= 0){
            return;
        }

        $scope.reports.month_type_data.sort(work_hours_sort);
        if($scope.reports.month_type_data.length <= 0){
            return;
        }

        var month = {
            text: YYYYmmdd_parse($scope.query.date).getFullYear(),
            product: {
                text: get_product_label(),
                labels: [],
                values: [],
                total_value: 0
            },
            type: {
                text: get_type_label(),
                labels: [],
                values: [],
                total_value: 0
            }
        };
        for(var i = 0; i < $scope.reports.month_product_data.length; i++){
            month.product.labels.push($scope.products.kv[$scope.reports.month_product_data[i].product_id]);
            month.product.total_value += $scope.reports.month_product_data[i].work_hours;
        }
        for(var i = 0; i < $scope.reports.month_product_data.length; i++){
            var percent = $scope.reports.month_product_data[i].work_hours * 100 / month.product.total_value;
            percent = Number(Number(percent).toFixed(1));
            month.product.values.push(percent);
        }
        for(var i = 0; i < $scope.reports.month_type_data.length; i++){
            month.type.labels.push($scope.types.kv[$scope.reports.month_type_data[i].type_id]);
            month.type.total_value += $scope.reports.month_type_data[i].work_hours;
        }
        for(var i = 0; i < $scope.reports.month_type_data.length; i++){
            var percent = $scope.reports.month_type_data[i].work_hours * 100 / month.type.total_value;
            percent = Number(Number(percent).toFixed(1));
            month.type.values.push(percent);
        }
        $scope.reports.months.push(month);
    };
    $scope.render_day = function() {
        logs.info("展示当天汇总数据");

        $scope.reports.day_product_data.sort(work_hours_sort);
        if($scope.reports.day_product_data.length <= 0){
            return;
        }

        $scope.reports.day_type_data.sort(work_hours_sort);
        if($scope.reports.day_type_data.length <= 0){
            return;
        }

        var day = {
            text: YYYYmmdd_parse($scope.query.date).getFullYear(),
            product: {
                text: get_product_label(),
                labels: [],
                values: [],
                total_value: 0
            },
            type: {
                text: get_type_label(),
                labels: [],
                values: [],
                total_value: 0
            }
        };
        for(var i = 0; i < $scope.reports.day_product_data.length; i++){
            day.product.labels.push($scope.products.kv[$scope.reports.day_product_data[i].product_id]);
            day.product.total_value += $scope.reports.day_product_data[i].work_hours;
        }
        for(var i = 0; i < $scope.reports.day_product_data.length; i++){
            var percent = $scope.reports.day_product_data[i].work_hours * 100 / day.product.total_value;
            percent = Number(Number(percent).toFixed(1));
            day.product.values.push(percent);
        }
        for(var i = 0; i < $scope.reports.day_type_data.length; i++){
            day.type.labels.push($scope.types.kv[$scope.reports.day_type_data[i].type_id]);
            day.type.total_value += $scope.reports.day_type_data[i].work_hours;
        }
        for(var i = 0; i < $scope.reports.day_type_data.length; i++){
            var percent = $scope.reports.day_type_data[i].work_hours * 100 / day.type.total_value;
            percent = Number(Number(percent).toFixed(1));
            day.type.values.push(percent);
        }
        $scope.reports.days.push(day);
    };
    $scope.render_summary = function() {
        logs.info("展示当天摘要数据");

        // generate the users array specified by submited or not submited.
        var users_submited = [], users_submited_ids = [], users_not_submited = [];
        var build_users_specified_by_submited = function() {
            for(var i = 0; i < $scope.users.users.length; i++){
                var user = $scope.users.users[i];
                var user_reported = false;

                for(var j = 0; j < $scope.reports.user_data.length; j++){
                    if(user.name == $scope.reports.user_data[j][0].user_id){
                        users_submited.push(user.value);
                        users_submited_ids.push(user.name);
                        user_reported = true;
                    }
                }

                if(!user_reported){
                    users_not_submited.push(user.value);
                }
            }
        };
        build_users_specified_by_submited();

        var delay_users = [];
        var get_delayied_report_summary = function() {
            for(var i = 0; i < users_submited_ids.length; i++){
                var user_id = users_submited_ids[i];

                for(var j = 0; j < $scope.reports.user_data.length; j++){
                    var user_data = $scope.reports.user_data[j];

                    if(user_id != user_data[0].user_id){
                        continue;
                    }

                    var work_date = user_data[0].work_date;

                    user_data.sort(report_first_insert_sort);
                    var first_insert = user_data[0].insert_date;

                    user_data.sort(report_modify_date_sort);
                    var last_modify = user_data[0].modify_date;

                    // detect the delayed reports
                    if(!is_report_delayed(YYYYmmdd_parse(work_date), YYYYmmdd_parse(first_insert))){
                        continue;
                    }

                    delay_users.push({
                        name: $scope.users.kv[user_id],
                        submit_time: first_insert,
                        last_modify: last_modify,
                        insert_date: first_insert,
                        modify_date: last_modify
                    });
                }
            }
        };
        get_delayied_report_summary();
        delay_users.sort(report_first_insert_sort);

        var summary = {
            text: YYYYmmdd_parse($scope.query.date).getFullYear(),
            total: $scope.users.users.length,
            ok: $scope.reports.user_data.length,
            ok_users: users_submited,
            failed: $scope.users.users.length - $scope.reports.user_data.length,
            failed_users: users_not_submited,
            delay: delay_users.length,
            delay_users: delay_users
        };
        $scope.reports.summaries.push(summary);
    };
    $scope.render_user = function() {
        logs.info("展示用户详细数据");
        $scope.reports.user_data.sort(user_id_sort);

        if($scope.reports.user_data.length <= 0){
            return;
        }

        for(var i = 0; i < $scope.reports.user_data.length; i++){
            var user_data = $scope.reports.user_data[i];
            user_data.sort(report_sort);

            var user = {
                text: YYYYmmdd_parse($scope.query.date).getFullYear(),
                works: [],
                summary: {
                    total: null,
                    insert: null,
                    modify: null
                },
                product: {
                    text: null,
                    labels: [],
                    values: [],
                    total_value: 0
                },
                type: {
                    text: null,
                    labels: [],
                    values: [],
                    total_value: 0
                }
            };

            for(var j = 0; j < user_data.length; j++) {
                var o = user_data[j];
                user.name = $scope.users.kv[o.user_id];
                user.works.push({
                    bug: o.bug_id,
                    time: o.work_hours,
                    type: $scope.types.kv[o.type_id],
                    product: $scope.products.kv[o.product_id],
                    content: o.report_content
                });
            }

            if(1){
                var total_value = 0;
                var products_merged = {};
                for(var j = 0; j < user_data.length; j++){
                    var o = user_data[j];
                    products_merged[$scope.products.kv[o.product_id]] = 0;
                }
                for(var j = 0; j < user_data.length; j++){
                    var o = user_data[j];
                    total_value += o.work_hours;
                    products_merged[$scope.products.kv[o.product_id]] += o.work_hours;
                }

                // dump to object array for sort
                var products_merged_object_array = [];
                for(var key in products_merged){
                    products_merged_object_array.push({name:key, work_hours:products_merged[key]});
                }
                products_merged_object_array.sort(work_hours_sort);

                // summaries
                user_data.sort(report_first_insert_sort);
                var first_insert = user_data[0].insert_date;
                user_data.sort(report_modify_date_sort);
                var last_modify = user_data[0].modify_date;
                user.summary.total = Number(Number(total_value).toFixed(1));
                user.summary.insert = first_insert;
                user.summary.modify = last_modify;

                var values = [];
                var labels = [];
                for(var j = 0; j < products_merged_object_array.length; j++){
                    var key = products_merged_object_array[j].name;
                    var work_hours = products_merged_object_array[j].work_hours;

                    labels.push(key);
                    var percent = work_hours * 100 / total_value;
                    percent = Number(Number(percent).toFixed(1));
                    values.push(percent);
                }

                user.product.total_value = total_value;
                user.product.labels = labels;
                user.product.values = values;
            }

            if(1){
                var total_value = 0;
                var types_merged = {};
                for(var j = 0; j < user_data.length; j++){
                    var o = user_data[j];
                    types_merged[$scope.types.kv[o.type_id]] = 0;
                }
                for(var j = 0; j < user_data.length; j++){
                    var o = user_data[j];
                    total_value += o.work_hours;
                    types_merged[$scope.types.kv[o.type_id]] += o.work_hours;
                }

                // dump to object array for sort
                var types_merged_object_array = [];
                for(var key in types_merged){
                    types_merged_object_array.push({name:key, work_hours:types_merged[key]});
                }
                types_merged_object_array.sort(work_hours_sort);

                var values = [];
                var labels = [];
                for(var j = 0; j < types_merged_object_array.length; j++){
                    var key = types_merged_object_array[j].name;
                    var work_hours = types_merged_object_array[j].work_hours;

                    labels.push(key);
                    var percent = work_hours * 100 / total_value;
                    percent = Number(Number(percent).toFixed(1));
                    values.push(percent);
                }

                user.type.total_value = total_value;
                user.type.labels = labels;
                user.type.values = values;
            }

            $scope.reports.users.push(user);
        }
    };

    // loads groups info.
    MGroup.groups_load({}, function(data){
        logs.info("加载用户组成功");
        $scope.groups = api_groups_for_select(data);
        $scope.query.group = $scope.groups.first;
    });

    $scope.$parent.nav_active_view();
    logs.info("数据加载中");
}]);

// directives.
/**
 * bsmPopover(bsm-popover), the popover component
 * @see: http://v2.bootcss.com/javascript.html#popovers
 * @see: http://subliminalsources.com/9/building-angularjs-bootstrap-components-popover-directive-part-1/
 * use the expression of angularjs, the attr must use the osdr- prefixed:
        <div ng-repeat="year in data.years">
            <div osdr-pie osdr-labels="year.product.labels" osdr-values="year.product.values"></div>
        </div>
 * we will use the scope.year.product.labels as labels and scope.year.product.values as values.
 */
osdrDirectives.directive('osdrPie', function(){ // bsm-popover
    return {
        restrict: 'A', // 'A': attribute osdr-pie required.
        replace: false,
        transclude: false,
        scope: false,
        link: function(scope, element, attrs) {
            var labels = scope;
            var labels_objs = attrs.osdrLabels.split(".");
            for (var i = 0; i < labels_objs.length; i++) {
                labels = labels[labels_objs[i]];
            }

            var values = scope;
            var values_objs = attrs.osdrValues.split(".");
            for (var i = 0; i < values_objs.length; i++) {
                values = values[values_objs[i]];
            }

            var id = "raphael_id_" + labels.length + "_" + values.length + "_" + Number(new Date().getTime() * 1000).toFixed(0);
            element.attr("id", id);
            Raphael(id, 220, 220).pieChart(0.1/*hsb_start*/, 110, 110, 100, values, labels, "#fff");
        }
    };
});

// config the filter
// the filter for the main app, the index page.
osdrFilters
.filter('unsafe', function($sce) {
    return function(val) {
        return $sce.trustAsHtml(val);
    };
})
.filter('brjoin', function() {
    return function(val) {
        return String(val.join('<br/>'));
    };
})
.filter('cmjoin', function() {
    return function(val) {
        return String(val.join(','));
    };
})
.filter('sample_filter', function() {
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
.filter('filter_div_empty_warn_class', function() {
    return function(v) {
        return v? "": "warning";
    };
})
.filter('filter_div_null_class', function() {
    return function(v) {
        return (v == null || v == undefined)? "error": "";
    };
})
.filter('filter_user_tr_class', function() {
    return function(user) {
        if (!user.enabled) return "error";
        return user.admin? "success": "";
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
.filter('filter_data_text', function() {
    return function(data) {
        var ret = [];
        for(var i = 0; i < data.values.length; i++){
            ret.push(data.labels[i] + ": " + data.values[i] + "%");
        }
        if(enable_view_sum()){
            ret.push(get_view_sum_label() + Number(Number(data.total_value).toFixed(1)) + get_view_sum_unit_label());
        }
        return ret;
    };
})
;

// config the services
osdrServices.factory('MUser', ['$resource', function($resource){
    return $resource('/users', {}, {
        users_load: {method: 'GET'}
    });
}]);
osdrServices.factory('MAdmin', ['$resource', function($resource){
    return $resource('/admins', {}, {
        admins_load: {method: 'POST'}
    });
}]);
osdrServices.factory('MGroup', ['$resource', function($resource){
    return $resource('/groups', {}, {
        groups_load: {method: 'GET'}
    });
}]);
osdrServices.factory('MProduct', ['$resource', function($resource){
    return $resource('/products', {}, {
        products_load: {method: 'GET'}
    });
}]);
osdrServices.factory('MType', ['$resource', function($resource){
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
