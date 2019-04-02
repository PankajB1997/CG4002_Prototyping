(function (app) {
    "use strict";

    app.controller("RealTimeController", RealTimeController);

    RealTimeController.$inject = ["$location", "$interval", "$scope", "toaster", "RepositoryService", "AnalyticsService"];

    function RealTimeController($location, $interval, $scope, toaster, repository, analytics) {
        var vm = this;

        /*
        vm.model should have a JSON with the keys:
            accuracy, avg. prediction time per move, avg. voltage, avg. current,
            avg. power, avg. energy, top confusing moves and the values for the
            EMG line chart
        */
        vm.model = {};

        var intervalListener = $interval(function() {
            repository.getRealTimeData().then(function (result) {
                document.getElementById("emg-chart-caption").innerText = "EMG Trends";
                document.getElementById("metrics-caption").innerText = "Metrics";
                vm.model = analytics.runAnalytics(result.data);
                console.log(result.data);
            });
        }, 5000);

        $scope.$on('$destroy', function() {
            $interval.cancel(intervalListener);
        });
    };
})(angular.module("coachingDashboard"));
