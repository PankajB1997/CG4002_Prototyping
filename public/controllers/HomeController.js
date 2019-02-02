(function (app) {
    "use strict";

    app.controller("HomeController", HomeController);

    HomeController.$inject = ["$location", "toaster", "RepositoryService"];

    // Initialise constants mapping to various column indices (zero-based) in the testrun csv file
    const PREDICTION_TIME_IDX = 3;
    const ACCURACY_IDX = 4;
    const VOLTAGE_IDX = 5;
    const CURRENT_IDX = 6;
    const POWER_IDX = 7;
    const ENERGY_IDX = 8;

    // Returns overall accuracy across all testruns as well as a list of accuracy values corresponding to each testrun
    function calculateMetrics(testruns) {
        var accuracies = [];
        var true_count, false_count, total_true_count = 0, total_false_count = 0;
        var correct, accuracy, overall_accuracy;
        var total_prediction_time = 0, total_voltage = 0, total_current = 0, total_power = 0, total_energy = 0;
        var total_count = 0;
        for (var row in testruns) {
            true_count = 0;
            false_count = 0;
            for (var i=1; i<testruns[row].length; i++) {
                correct = testruns[row][i][ACCURACY_IDX].toLowerCase().trim();
                if (correct === "true") {
                    true_count += 1;
                } else {
                    false_count += 1;
                }
                total_prediction_time += parseFloat(testruns[row][i][PREDICTION_TIME_IDX].trim());
                total_voltage += parseFloat(testruns[row][i][VOLTAGE_IDX].trim());
                total_current += parseFloat(testruns[row][i][CURRENT_IDX].trim());
                total_power += parseFloat(testruns[row][i][POWER_IDX].trim());
                total_energy += parseFloat(testruns[row][i][ENERGY_IDX].trim());
            }
            accuracy = Math.round(((true_count*100.0)/(false_count + true_count)) * 100) / 100;
            accuracies.push(accuracy);
            total_true_count += true_count;
            total_false_count += false_count;
            total_count += testruns[row].length - 1;
        }
        overall_accuracy = Math.round(((total_true_count*100.0)/(total_false_count + total_true_count)) * 100) / 100;
        return {
            overall_accuracy: overall_accuracy,
            accuracy_per_testrun: accuracies,
            avg_prediction_time: Math.round((total_prediction_time/total_count) * 100) / 100,
            avg_voltage: Math.round((total_voltage/total_count) * 100) / 100,
            avg_current: Math.round((total_current/total_count) * 100) / 100,
            avg_power: Math.round((total_power/total_count) * 100) / 100,
            avg_energy: Math.round((total_energy/total_count) * 100) / 100
        }
    }

    function determineTopConfusingMoves(testruns) {
        return ["Chicken", "Turnclap", "Wipers"];
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
        // TODO: Sort testruns in ascending order of date on which they were added
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
        var results = calculateMetrics(testruns);
        analytics.push({ name: "Number of test runs", value: testruns.length });
        analytics.push({ name: "Overall prediction accuracy", value: results.overall_accuracy.toString() + " %" });
        analytics.push({ name: "Average prediction time per dance move", value: results.avg_prediction_time.toString() + " seconds" });
        analytics.push({ name: "Average voltage", value: results.avg_voltage.toString() + " V" });
        analytics.push({ name: "Average current", value: results.avg_current.toString() + " A" });
        analytics.push({ name: "Average power", value: results.avg_power.toString() + " W" });
        analytics.push({ name: "Average energy", value: results.avg_energy.toString() + " J" });
        drawChart(results.accuracy_per_testrun);
        document.getElementById("metrics-caption").innerText = "Metrics";
        var confusing_moves = determineTopConfusingMoves(testruns);
        document.getElementById("confusing-moves-caption").innerText = "(Upto) Top 3 Confusing Moves";
        return { analytics: analytics, confusing_moves: confusing_moves };
    }

    function HomeController($location, toaster, repository) {
        var vm = this;
        vm.testruns = [];
        vm.filter = {};
        vm.metrics = {};

        vm.selectLogs = [
            { id: null, label: "Filter data", disabled: true },
            { id: 'Training set dancer', label: "Show only training set dancers" },
            { id: 'Unseen/test dancer', label: "Show only testing set dancers" },
            { id: 'selected', label: "Show only selected dancers..." },
            { id: 'all', label: "Show all dancers" }
        ];

        repository.getTestruns({}).then(function (result) {
            var results = runAnalytics(combiner(result.data));
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
                var results = runAnalytics(combiner(result.data));
                vm.metrics = results.analytics;
                vm.confusing_moves = results.confusing_moves;
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
