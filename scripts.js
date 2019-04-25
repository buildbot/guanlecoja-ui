angular.module("guanlecoja.ui", ["ui.bootstrap", "ui.router", "ngAnimate"]);

/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// a simple service to abstract breadcrumb configuration
class glBreadcrumb {
    constructor($rootScope) { this.$rootScope = $rootScope; ({}); }

    setBreadcrumb(breadcrumb) {
        return this.$rootScope.$broadcast("glBreadcrumb", breadcrumb);
    }
}



angular.module('guanlecoja.ui')
.service('glBreadcrumbService', ['$rootScope', glBreadcrumb]);

/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
class GlMenu {
    static initClass() {

        this.prototype.appTitle = "set AppTitle using GlMenuServiceProvider.setAppTitle";

        this.prototype.$get = ["$state", function($state) {
            let group;
            for (let state of Array.from($state.get().slice(1))) {
                ({ group } = state.data);
                if (group == null) {
                    continue;
                }

                if (!this.groups.hasOwnProperty(group)) {
                    throw Error(`group ${group} has not been defined with glMenuProvider.group(). has: ${_.keys(this.groups)}`);
                }

                this.groups[group].items.push({
                    caption: state.data.caption || _.capitalize(state.name),
                    sref: state.name
                });
            }

            for (let name in this.groups) {
                // if a group has only no item, we juste delete it
                group = this.groups[name];
                if ((group.items.length === 0) && !group.separator) {
                    delete this.groups[name];
                // if a group has only one item, then we put the group == the item
                } else if (group.items.length === 1) {
                    const item = group.items[0];
                    group.caption = item.caption;
                    group.sref = item.sref;
                    group.items = [];
                } else {
                    group.sref = ".";
                }
            }
            const groups = _.values(this.groups);
            groups.sort((a,b) => a.order - b.order);
            const self = this;
            return {
                getGroups() { return groups; },
                getDefaultGroup() { return self.defaultGroup; },
                getFooter() { return self.footer; },
                getAppTitle() { return self.appTitle; }
            };
        }
        ];
    }
    constructor() {
        this.groups = {};
        this.defaultGroup = null;
        this.footer = [];
    }

    addGroup(group) {
        group.items = [];
        if (group.order == null) { group.order = 99; }
        this.groups[group.name] = group;
        return this.groups;
    }

    setDefaultGroup(group) {
        return this.defaultGroup = group;
    }

    setFooter(footer) {
        return this.footer = footer;
    }

    setAppTitle(title) {
        return this.appTitle = title;
    }
}
GlMenu.initClass();


angular.module('guanlecoja.ui')
.provider('glMenuService', [GlMenu]);

/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// I intercept the http errors and put them in the notification service
// in order to enable it, please add following code in you config:

//class AddInterceptor extends Config
//    constructor: ($httpProvider) ->
//        $httpProvider.responseInterceptors.push('glHttpInterceptor')


class glHttpInterceptor {
    constructor(glNotificationService, $q, $timeout) {
        return function(promise) {
            const errorHandler =  function(res) {
                let msg;
                try {
                    msg = `${res.status}:${res.data.error} ` +
                    `when:${res.config.method} ${res.config.url}`;
                } catch (e) {
                    msg = res.toString();
                }
                $timeout((() => glNotificationService.network(msg)), 100);
                return $q.reject(res);
            };

            return promise.then(angular.identity, errorHandler);
        };
    }
}


angular.module('guanlecoja.ui')
.factory('glHttpInterceptor', ['glNotificationService', '$q', '$timeout', glHttpInterceptor]);

/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
class glNotification {
    constructor($rootScope, $timeout) {
        this.$rootScope = $rootScope;
        this.$timeout = $timeout;
        this.notifications = [];
        this.curid = 0;
        null;
    }

    notify(opts) {
        this.curid += 1;
        if (opts.title == null) { opts.title = "Info"; }
        opts.id = this.curid;
        let id = this.curid;
        if (opts.group != null) {
            for (let i in this.notifications) {
                const n = this.notifications[i];
                if (opts.group === n.group) {
                    id = i;
                    n.msg += `\n${opts.msg}`;
                }
            }
        }
        if (id === this.curid) {
            this.notifications.push(opts);
        }
        return null;
    }

    // some shortcuts...
    error(opts) {
        if (opts.title == null) { opts.title = "Error"; }
        return this.notify(opts);
    }

    network(opts) {
        if (opts.title == null) { opts.title = "Network issue"; }
        if (opts.group == null) { opts.group = "Network"; }
        return this.notify(opts);
    }

    dismiss(id) {
        for (let i in this.notifications) {
            const n = this.notifications[i];
            if (n.id === id) {
                this.notifications.splice(i, 1);
                return null;
            }
        }
        return null;
    }
}


angular.module('guanlecoja.ui')
.service('glNotificationService', ['$rootScope', '$timeout', glNotification]);

/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
class GlNotification {
    constructor() {
        return {
            replace: true,
            transclude: true,
            restrict: 'E',
            scope: false,
            controllerAs: "n",
            templateUrl: "guanlecoja.ui/views/notification.html",
            controller: "_glNotificationController"
        };
    }
}

class _glNotification {

    constructor($scope, glNotificationService) {
        this.$scope = $scope;
        this.glNotificationService = glNotificationService;
        this.notifications = this.glNotificationService.notifications;
        null;
    }

    dismiss(id, e) {
        this.glNotificationService.dismiss(id);
        e.stopPropagation();
        return null;
    }
}


angular.module('guanlecoja.ui')
.directive('glNotification', [GlNotification])
.controller('_glNotificationController', ['$scope', 'glNotificationService', _glNotification]);
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
class GlPageWithSidebar {
    constructor() {
        return {
            replace: true,
            transclude: true,
            restrict: 'E',
            scope: false,
            controllerAs: "page",
            templateUrl: "guanlecoja.ui/views/page_with_sidebar.html",
            controller: "_glPageWithSidebarController"
        };
    }
}

class _glPageWithSidebar {
    constructor($scope, glMenuService, $timeout, $window) {

        // by default, pin sidebar only if window is wide enough (collapse by default if narrow)
        this.$scope = $scope;
        this.$timeout = $timeout;
        this.$window = $window;
        this.sidebarPinned = this.$window.innerWidth > 800;
        // If user has previously pinned or unpinned the sidebar, use the saved value from localStorage
        const sidebarWasPinned = this.$window.localStorage.sidebarPinned;
        if ( (sidebarWasPinned === "true") || (sidebarWasPinned === "false") ) { // note -- localstorage only stores strings,  converts bools to string.
            this.sidebarPinned = sidebarWasPinned !== "false";
        }

        this.groups = glMenuService.getGroups();
        this.footer = glMenuService.getFooter();
        this.appTitle = glMenuService.getAppTitle();
        this.activeGroup = glMenuService.getDefaultGroup();
        this.inSidebar = false;
        this.sidebarActive = this.sidebarPinned;
    }

    toggleSidebarPinned() {
        this.sidebarPinned=!this.sidebarPinned;
        return this.$window.localStorage.sidebarPinned = this.sidebarPinned;
    }

    toggleGroup(group) {
        if (this.activeGroup!==group) {
            return this.activeGroup=group;
        } else {
            return this.activeGroup=null;
        }
    }

    enterSidebar() {
        return this.inSidebar = true;
    }

    hideSidebar() {
        this.sidebarActive = false;
        return this.inSidebar = false;
    }

    leaveSidebar() {
        this.inSidebar = false;
        if (this.timeout != null) {
            this.$timeout.cancel(this.timeout);
            this.timeout = undefined;
        }
        return this.timeout = this.$timeout((() => {
            if (!this.inSidebar && !this.sidebarPinned) {
                this.sidebarActive = false;
                return this.activeGroup = null;
            }
        }
            ), 500);
    }
}


angular.module('guanlecoja.ui')
.directive('glPageWithSidebar', [GlPageWithSidebar])
.controller('_glPageWithSidebarController', ['$scope', 'glMenuService', '$timeout', '$window', _glPageWithSidebar]);
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
class GlTopbar {
    constructor() {
        return {
            replace: true,
            transclude: true,
            restrict: 'E',
            scope: false,
            controllerAs: "page",
            templateUrl: "guanlecoja.ui/views/topbar.html",
            controller: "_glTopbarController"
        };
    }
}

class _glTopbar {
    constructor($scope, glMenuService, $location) {
        let groups = glMenuService.getGroups();
        groups = _.zipObject(_.map(groups, g => g.name), groups);
        $scope.appTitle = glMenuService.getAppTitle();

        $scope.$on("$stateChangeStart", function(ev, state) {
            $scope.breadcrumb = [];
            if ((state.data != null ? state.data.group : undefined) && ((state.data != null ? state.data.caption : undefined) !== groups[state.data.group].caption)) {
                $scope.breadcrumb.push({
                    caption: groups[state.data.group].caption});
            }
            return $scope.breadcrumb.push({
                caption: (state.data != null ? state.data.caption : undefined) || _.capitalize(state.name),
                href: `#${$location.hash()}`
            });
        });

        $scope.$on("glBreadcrumb", (e, data) => $scope.breadcrumb = data);
    }
}


angular.module('guanlecoja.ui')
.directive('glTopbar', [GlTopbar])
.controller('_glTopbarController', ['$scope', 'glMenuService', '$location', _glTopbar]);

/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
class GlTopbarContextualActions {
    constructor() {
        return {
            replace: true,
            restrict: 'E',
            scope: true,
            templateUrl: "guanlecoja.ui/views/topbar-contextual-actions.html",
            controller: "_glTopbarContextualActionsController"
        };
    }
}


class _glTopbarContextualActions {
    constructor($scope, $sce) {

        $scope.$on("$stateChangeStart", (ev, state) => $scope.actions = []);

        $scope.$on("glSetContextualActions", function(e, data) {
            for (let item of Array.from(data)) {
                if (item.extra_class == null) { item.extra_class = ""; }
            }

            return $scope.actions = data;
        });
    }
}

// a simple service to abstract TopbarContextualActions configuration
class glTopbarContextualActions {
    constructor($rootScope) { this.$rootScope = $rootScope; ({}); }

    setContextualActions(actions) {
        return this.$rootScope.$broadcast("glSetContextualActions", actions);
    }
}


angular.module('guanlecoja.ui')
.directive('glTopbarContextualActions', [GlTopbarContextualActions])
.controller('_glTopbarContextualActionsController', ['$scope', '$sce', _glTopbarContextualActions])
.service('glTopbarContextualActionsService', ['$rootScope', glTopbarContextualActions]);
angular.module("guanlecoja.ui").run(["$templateCache", function($templateCache) {$templateCache.put("guanlecoja.ui/views/notification.html","<li class=\"dropdown notifications\" uib-dropdown=\"uib-dropdown\"><a uib-dropdown-toggle=\"uib-dropdown-toggle\"><i class=\"fa fa-bell-o fa-lg\" ng-class=\"{\'fa-ringing\': n.notifications.length &gt; 0 }\"></i></a><ul class=\"uib-dropdown-menu dropdown-menu dropdown-menu-right\" dropdown-toggle=\"dropdown-toggle\"><li class=\"dropdown-header\">Notifications</li><li class=\"divider\"></li><div ng-repeat=\"msg in n.notifications\"><li><div class=\"item\"><button class=\"close\" ng-click=\"n.dismiss(msg.id, $event)\">&times;</button><div class=\"title\">{{msg.title}}:</div><div class=\"msg\">{{msg.msg}}</div></div></li><li class=\"divider\"></li></div><li ng-hide=\"n.notifications.length&gt;0\"><div class=\"item\"><small class=\"msg\"> all caught up!</small></div></li></ul></li>");
$templateCache.put("guanlecoja.ui/views/page_with_sidebar.html","<div class=\"gl-page-with-sidebar\" ng-class=\"{\'active\': page.sidebarActive, \'pinned\': page.sidebarPinned}\"><div class=\"sidebar sidebar-blue\" ng-mouseenter=\"page.enterSidebar()\" ng-mouseleave=\"page.leaveSidebar()\" ng-click=\"page.sidebarActive=true\"><ul><li class=\"sidebar-main\"><a href=\"javascript:\">{{page.appTitle}}<span class=\"menu-icon fa fa-bars\" ng-hide=\"page.sidebarActive\" ng-click=\"page.sidebarActive=!page.sidebarActive\"></span><span class=\"menu-icon fa fa-thumb-tack\" ng-show=\"page.sidebarActive\" ng-click=\"page.toggleSidebarPinned()\" ng-class=\"{\'fa-45\': !page.sidebarPinned}\"></span></a></li><li class=\"sidebar-title\"><span>NAVIGATION</span></li><div ng-repeat=\"group in page.groups\"><div ng-if=\"group.items.length &gt; 0\"><li class=\"sidebar-list\"><a ng-click=\"page.toggleGroup(group)\"><i class=\"fa fa-angle-right\"></i>&nbsp;{{group.caption}}<span class=\"menu-icon fa\" ng-class=\"\'fa-\' + group.icon\"></span></a></li><li class=\"sidebar-list subitem\" ng-class=\"{\'active\': page.activeGroup==group}\" ng-repeat=\"item in group.items\"><a ui-sref=\"{{item.sref}}\" ng-click=\"page.hideSidebar()\">{{item.caption}}</a></li></div><div ng-if=\"group.items.length == 0\"><div ng-if=\"group.separator\"><li class=\"sidebar-title\"><span>{{group.caption}}</span></li></div><div ng-if=\"!group.separator\"><li class=\"sidebar-separator\" ng-if=\"!$first\"></li><li class=\"sidebar-list\"><a ui-sref=\"{{group.sref}}\" ng-click=\"page.toggleGroup(group)\">{{group.caption}}<span class=\"menu-icon fa\" ng-class=\"\'fa-\' + group.icon\"></span></a></li></div></div></div></ul><div class=\"sidebar-footer\"><div class=\"col-xs-4\" ng-repeat=\"item in page.footer\"><a ng-href=\"{{item.href}}\">{{item.caption}}</a></div></div></div><div class=\"content\"><div ng-transclude=\"ng-transclude\"></div></div></div>");
$templateCache.put("guanlecoja.ui/views/topbar.html","<nav class=\"navbar navbar-default\"><div class=\"container-fluid\"><div class=\"navbar-header\"><button class=\"navbar-toggle collapsed\" type=\"button\" ng-click=\"collapse=!collapse\" ng-init=\"collapse=1\" aria-expanded=\"false\"><span class=\"sr-only\">Toggle navigation</span><span class=\"icon-bar\"></span><span class=\"icon-bar\"></span><span class=\"icon-bar\"></span></button><a class=\"navbar-brand\">{{appTitle}}</a><ol class=\"breadcrumb\"><li ng-repeat=\"b in breadcrumb\"><a ng-if=\"b.sref\" ui-sref=\"{{b.sref}}\">{{b.caption}}</a><a ng-if=\"b.href\" ng-href=\"{{b.href}}\">{{b.caption}}</a><span ng-if=\"b.href == undefined &amp;&amp; b.sref == undefined\" ng-href=\"{{b.href}}\">{{b.caption}}</span></li></ol></div><div class=\"navbar-collapse collapse pull-right\" ng-class=\"{&quot;in&quot;: !collapse}\"><ul class=\"nav navbar-nav\" ng-transclude=\"ng-transclude\"></ul></div></div></nav>");
$templateCache.put("guanlecoja.ui/views/topbar-contextual-actions.html","<form class=\"navbar-form navbar-left\"><div class=\"form-group\" ng-repeat=\"a in actions\"><button class=\"btn btn-default\" type=\"button\" ng-class=\"a.extra_class\" ng-click=\"a.action()\" title=\"{{a.help}}\"><i class=\"fa\" ng-if=\"a.icon\" ng-class=\"\'fa-\' + a.icon\"></i><span ng-if=\"a.icon&amp;&amp;a.caption\">&nbsp;</span>{{::a.caption}}</button>&nbsp;</div></form>");}]);
//# sourceMappingURL=scripts.js.map
