var module = angular.module("coachingDashboard", [
    "ngRoute",
    "ngAnimate",
    "toaster",
    "ngFileUpload",
    "localytics.directives"
]);

(function (app) {
    app.config(function ($routeProvider) {
        var base = "/views/";

        $routeProvider
            .when("/master/add", {
                templateUrl: base + "master/add.html",
                controller: "MasterAddController",
                controllerAs: "vm"
            })
            .when("/master/edit/:id", {
                templateUrl: base + "master/edit.html",
                controller: "MasterEditController",
                controllerAs: "vm"
            })
            .when("/", {
                templateUrl: base + "testrun/index.html",
                controller: "HomeController",
                controllerAs: "vm"
            })
            .when("/testrun/add", {
                templateUrl: base + "testrun/add.html",
                controller: "AddController",
                controllerAs: "vm"
            })
            .when("/testrun/details/:id", {
                templateUrl: base + "testrun/details.html",
                controller: "DetailsController",
                controllerAs: "vm"
            })
            .when("/testrun/edit/:id", {
                templateUrl: base + "testrun/edit.html",
                controller: "EditController",
                controllerAs: "vm"
            })
            .when("/testrun/remove/:id", {
                templateUrl: base + "testrun/remove.html",
                controller: "RemoveController",
                controllerAs: "vm"
            });
    });
})(angular.module("coachingDashboard"));
