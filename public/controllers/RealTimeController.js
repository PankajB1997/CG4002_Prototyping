(function (app) {
    "use strict";

    app.controller("RealTimeController", RealTimeController);

    RealTimeController.$inject = ["$location", "$interval", "$scope", "toaster", "RepositoryService", "AnalyticsService"];

    function RealTimeController($location, $interval, $scope, toaster, repository, analytics) {
        var vm = this;

        repository.getRealTimeData().then(function (result) {
            document.getElementById("emg-chart-caption").innerText = "EMG Trends";
            document.getElementById("metrics-caption").innerText = "Metrics";
            vm.model = analytics.runAnalytics(result.data, true);
        });

        /*
        vm.model should have a JSON with the keys:
            avg. voltage, avg. current, avg. power, avg. energy,
            the values for the EMG line chart
        */
        vm.model = {};

        var intervalListener = $interval(function() {
            repository.getRealTimeData().then(function (result) {
                vm.model = analytics.runAnalytics(result.data, true);
            });
        }, 2500);

        $scope.$on('$destroy', function() {
            $interval.cancel(intervalListener);
            repository.deleteExistingRealTimeData().then(function (result) {
                analytics.drawChart([]);
                vm.model = {};
            });
        });

        $scope.refreshRealTime = function () {
            repository.deleteExistingRealTimeData().then(function (result) {
                analytics.drawChart([]);
                vm.model = {};
            });
        };
    };
})(angular.module("coachingDashboard"));
