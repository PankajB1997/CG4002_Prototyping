(function (app) {
    "use strict";

    app.controller("HomeController", HomeController);

    HomeController.$inject = ["$location", "toaster", "RepositoryService"];

    // Returns overall accuracy across all testruns as well as a list of accuracy values corresponding to each testrun
    function calculateAccuracyFigures(testruns) {
        // Initialise constant to store column index at which all true/false values are stored for each testrun
        const ACCURACY_IDX = 4;
        // Initialise variable to store the counts of True and False across individual testruns
        var accuracies = [];
        var total_true_count = 0;
        var total_false_count = 0;
        var val, true_count, false_count;
        for (var row in testruns) {
            true_count = 0;
            false_count = 0;
            for (var i=1; i<testruns[row].length; i++) {
                val = testruns[row][i][ACCURACY_IDX].toLowerCase().trim();
                if (val === "true") {
                    true_count += 1;
                } else {
                    false_count += 1;
                }
            }
            accuracies.push(((true_count*100.0)/(false_count + true_count)));
            total_true_count += true_count;
            total_false_count += false_count;
        }
        return { overall_accuracy: ((total_true_count*100.0)/(total_false_count + total_true_count)), accuracy_per_testrun: accuracies }
    }

    // Combine testruns of different dancers into one list
    function combiner(data) {
        var testruns = [];
        for (var dancer in data) {
            testruns = testruns.concat(data[dancer].data);
        }
        return testruns;
    }

    /***
     *** Calculate and return the following as a dictionary:
     *** 1. Number of test runs
     *** 2. Overall prediction accuracy
     *** 3. JSON for Accuracy Chart
     *** 4. Average prediction time per dance move
     *** 5. (Upto) Top 3 confusing moves with detailed count
     *** 6. Average Voltage
     *** 7. Average Current
     *** 8. Average Power
     *** 9. Average Energy
    **/
    function runAnalytics(testruns) {
        var analytics = {};
        analytics.num_testruns = testruns.length;
        var accuracies = calculateAccuracyFigures(testruns);
        analytics.overall_accuracy = accuracies.overall_accuracy;
        analytics.accuracy_chart = accuracies.accuracy_per_testrun;
        return analytics;
    }

    function HomeController($location, toaster, repository) {
        var vm = this;
        vm.testruns = [];
        vm.metrics = {};
        vm.filter = {};

        vm.selectLogs = [
            { id: null, label: "Filter data", disabled: true },
            { id: 'train', label: "Show only training set dancers" },
            { id: 'test', label: "Show only testing set dancers" },
            { id: 'selected', label: "Show only selected dancers..." },
            { id: 'all', label: "Show all dancers" }
        ];

        repository.getTestruns({}).then(function (result) {
            vm.metrics = runAnalytics(combiner(result.data));
            console.log(vm.metrics);
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
            vm.selectDancers.unshift({ label: "Select Dancer(s)", "disabled": true });
            vm.filter.selectDancer = vm.selectDancers[0].label;
            vm.filter.selectLog = vm.selectLogs[0].label;
        });

        vm.filter = function () {
            var filterString = {};
            filterString.pageSize = vm.filter.x_val;
            for (logType in vm.selectLogs) {
                if (vm.filter.selectLog == vm.selectLogs[logType].label) {
                    filterString.logType = vm.selectLogs[logType].id;
                    break;
                }
            }
            if (filterString.logType == "selected") {
                // Fix?
                filterString.dancers = vm.filter.selectDancer;
            }
            else {
                filterString.dancers = null;
            }
            repository.getTestruns(filterString).then(function (result) {
                vm.testruns = result.data;
            });
        };

        vm.clearFilter = function() {
            vm.filter.x_val = null;
            vm.filter.selectDancer = "Select Dancer(s)";
            vm.filter.selectLog = "Filter logs";
            repository.getTestruns({}).then(function (result) {
                vm.testruns = result.data;
            });
        }
    }

})(angular.module("coachingDashboard"));
