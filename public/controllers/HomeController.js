(function (app) {
    "use strict";

    app.controller("HomeController", HomeController);

    HomeController.$inject = ["$location", "toaster", "RepositoryService", "AnalyticsService"];

    function HomeController($location, toaster, repository, analytics) {
        var vm = this;
        vm.testruns = [];
        vm.filter = {};
        vm.metrics = {};

        vm.selectLogs = [
            { id: null, label: "Filter by dancers' type", disabled: true },
            { id: 'Training set dancer', label: "Only training set dancers" },
            { id: 'Unseen/test dancer', label: "Only testing set dancers" },
            // { id: 'selected', label: "Show only selected dancers..." },
            // { id: 'all', label: "Show all dancers" }
        ];

        repository.getTestruns({}).then(function (result) {
            document.getElementById("accuracy-chart-caption").innerText = "Accuracy Chart";
            document.getElementById("metrics-caption").innerText = "Metrics";
            var results = analytics.runAnalytics(result.data);
            vm.metrics = results.analytics;
            vm.confusing_moves = results.confusing_moves;
        });

        vm.selectDancers = [];
        repository.getMasterData().then(function (result) {
            for (var row in result.data) {
                var dancer = result.data[row]["name"] + " (" + result.data[row]["type"] + ")";
                if (vm.selectDancers.includes(dancer) == false) {
                    vm.selectDancers.push(dancer);
                }
            }
            vm.selectDancers.sort();
            for (var val in vm.selectDancers) {
                vm.selectDancers[val] = { label: vm.selectDancers[val] };
            }
            // vm.selectDancers.unshift({ label: "Select Dancer(s)", "disabled": true });
            vm.filter.selectDancer = [];
            vm.filter.selectLog = vm.selectLogs[0].label;
        });

        vm.search = function () {
            repository.getTestruns(vm.filter).then(function (result) {
                console.log(result.data);
                var results = analytics.runAnalytics(result.data);
                vm.metrics = results.analytics;
                vm.confusing_moves = results.confusing_moves;
            });
        };

        vm.clearFilter = function() {
            vm.filter.pageSize = null;
            vm.filter.selectDancer = [];
            vm.filter.selectLog = vm.selectLogs[0].label;
            repository.getTestruns({}).then(function (result) {
                var results = analytics.runAnalytics(result.data);
                vm.metrics = results.analytics;
                vm.confusing_moves = results.confusing_moves;
            });
        }
    }

})(angular.module("coachingDashboard"));
