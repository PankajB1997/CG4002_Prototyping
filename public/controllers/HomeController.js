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
        var val, true_count, false_count, accuracy, overall_accuracy;
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
            accuracy = Math.round(((true_count*100.0)/(false_count + true_count)) * 100) / 100;
            accuracies.push(accuracy);
            total_true_count += true_count;
            total_false_count += false_count;
        }
        overall_accuracy = Math.round(((total_true_count*100.0)/(total_false_count + total_true_count)) * 100) / 100;
        return { overall_accuracy: overall_accuracy, accuracy_per_testrun: accuracies }
    }

    // Method to draw accuracy chart
    function drawChart(data) {
        document.getElementById("accuracy-chart-caption").innerText = "Accuracy Chart";
        var labels = [];
        for (var i in data) {
            labels.push((parseInt(i)+1).toString());
        }
        var ctx = document.getElementById('accuracy_chart').getContext('2d');
        var chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '  ',
                    data: data,
                    borderColor: '#0E48A1',
                    borderWidth: 3
                }]
            },
            options: {
                legend: {
                    display: false
                },
                scales: {
                    xAxes: [{
                        gridLines: {
                          display: false,
                          color: "#007DFF"
                        },
                        ticks: {
                            fontColor: "#007DFF"
                        }
                    }],
                    yAxes: [{
                        gridLines: {
                          // display: false,
                          color: "#007DFF"
                        },
                        ticks: {
                            fontColor: "#007DFF",
                            beginAtZero: true
                        }
                    }]
                },
                elements: {
                    line: {
                        fill: false
                    }
                }
            }
        });
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
        var analytics = [];
        analytics.push({ name: "Number of test runs", value: testruns.length });
        var accuracies = calculateAccuracyFigures(testruns);
        analytics.push({ name: "Overall prediction accuracy", value: accuracies.overall_accuracy.toString() + " %" })
        drawChart(accuracies.accuracy_per_testrun);
        document.getElementById("metrics-caption").innerText = "Metrics";
        return analytics;
    }

    function HomeController($location, toaster, repository) {
        var vm = this;
        vm.testruns = [];
        vm.filter = {};
        vm.metrics = {};

        vm.selectLogs = [
            { id: null, label: "Filter data", disabled: true },
            { id: 'train', label: "Show only training set dancers" },
            { id: 'test', label: "Show only testing set dancers" },
            { id: 'selected', label: "Show only selected dancers..." },
            { id: 'all', label: "Show all dancers" }
        ];

        repository.getTestruns({}).then(function (result) {
            vm.metrics = runAnalytics(combiner(result.data));
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
            var filters = {};
            // filters.pageSize = vm.filter.x_val;
            // for (logType in vm.selectLogs) {
            //     if (vm.filter.selectLog == vm.selectLogs[logType].label) {
            //         filters.logType = vm.selectLogs[logType].id;
            //         break;
            //     }
            // }
            // if (filters.logType == "selected") {
            //     // Fix?
            //     filters.dancers = vm.filter.selectDancer;
            // }
            // else {
            //     filters.dancers = null;
            // }
            repository.getTestruns(filters).then(function (result) {
                vm.metrics = runAnalytics(combiner(result.data));
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
