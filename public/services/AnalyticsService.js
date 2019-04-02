(function (app) {
    "use strict";

    app.service("AnalyticsService", AnalyticsService);

    AnalyticsService.$inject = [];

    function AnalyticsService() {
        var svc = this;

        svc.runAnalytics = runAnalytics;

        // Initialise constants mapping to various column indices (zero-based) in the testrun csv files
        const PREDICTED_MOVE_IDX = 1;
        const ACTUAL_MOVE_IDX = 2;
        const PREDICTION_TIME_IDX = 3;
        const ACCURACY_IDX = 4;
        const VOLTAGE_IDX = 5;
        const CURRENT_IDX = 6;
        const POWER_IDX = 7;
        const ENERGY_IDX = 8;
        const LOCATION_DANCER_1_IDX = 9;
        const LOCATION_DANCER_2_IDX = 10;
        const LOCATION_DANCER_3_IDX = 11;

        // Initialise constants for various keys in real-time data
        const PREDICTED_MOVE_IDX_R = 0;
        const VOLTAGE_IDX_R = 1;
        const CURRENT_IDX_R = 2;
        const POWER_IDX_R = 3;
        const ENERGY_IDX_R = 4;
        const EMG_VALUES_R = 5;

        // Method to return average of a list of numbers
        function average(list) {
            var sum = 0;
            for (var i in list) {
                sum += list[i];
            }
            return Math.round((sum/list.length) * 100) / 100;
        }

        // Returns overall accuracy across all testruns as well as a list of accuracy values corresponding to each testrun
        function calculateMetrics(testruns) {
            var accuracies = [];
            var prediction_times = [];
            var voltages = [];
            var currents = [];
            var powers = [];
            var energies = [];
            var correct, true_count, false_count, total_true_count = 0, total_false_count = 0;
            var total_prediction_time, total_voltage, total_current, total_power, total_energy;
            var avg_accuracy, avg_prediction_time, avg_voltage, avg_current, avg_power, avg_energy;
            for (var row in testruns) {
                true_count = false_count = 0;
                total_prediction_time = total_voltage = total_current = total_power = total_energy = 0;
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
                accuracies.push(Math.round(((true_count*100.0)/(false_count + true_count)) * 100) / 100);
                prediction_times.push(Math.round((total_prediction_time/(testruns[row].length - 1)) * 100) / 100);
                voltages.push(Math.round((total_voltage/(testruns[row].length - 1)) * 100) / 100);
                currents.push(Math.round((total_current/(testruns[row].length - 1)) * 100) / 100);
                powers.push(Math.round((total_power/(testruns[row].length - 1)) * 100) / 100);
                energies.push(Math.round((total_energy/(testruns[row].length - 1)) * 100) / 100);
                total_true_count += true_count;
                total_false_count += false_count;
            }
            // avg_accuracy = Math.round(((total_true_count*100.0)/(total_false_count + total_true_count)) * 100) / 100;
            avg_accuracy = average(accuracies);
            avg_prediction_time = average(prediction_times);
            avg_voltage = average(voltages);
            avg_current = average(currents);
            avg_power = average(powers);
            avg_energy = average(energies);
            return {
                accuracy_per_testrun: accuracies,
                avg_accuracy: (avg_accuracy !== avg_accuracy) ? 0 : avg_accuracy,
                avg_prediction_time: (avg_prediction_time !== avg_prediction_time) ? 0 : avg_prediction_time,
                avg_voltage: (avg_voltage !== avg_voltage) ? 0 : avg_voltage,
                avg_current: (avg_current !== avg_current) ? 0 : avg_current,
                avg_power: (avg_power !== avg_power) ? 0 : avg_power,
                avg_energy: (avg_energy !== avg_energy) ? 0 : avg_energy
            }
        }

        function determineTopConfusingMoves(testruns) {
            // Initialise dictionary of the form { ACTUAL_MOVE_1: { PREDICTED_MOVE_1: count, ... }, ... }
            var moveErrorCounts = [];
            // Initialise list of dictionaries, with each one of form { move: movename, totalConfusions: count, listOfConfusions: [ { move: move_1, count: count_1 }, ... ] }
            var confusingMoves = [];
            var confusingMovesString = [];
            var actual_move, predicted_move, confusingMove, moveString, moveDict;
            for (var row in testruns) {
                for (var i=1; i<testruns[row].length; i++) {
                    actual_move = testruns[row][i][ACTUAL_MOVE_IDX].toLowerCase().trim();
                    predicted_move = testruns[row][i][PREDICTED_MOVE_IDX].toLowerCase().trim();
                    if (actual_move !== predicted_move && predicted_move !== "none") {
                        if (!(actual_move in moveErrorCounts)) {
                            moveErrorCounts[actual_move] = {};
                            moveErrorCounts[actual_move].totalCount = 0;
                        }
                        if (!(predicted_move in moveErrorCounts[actual_move])) {
                            moveErrorCounts[actual_move][predicted_move] = 0;
                        }
                        moveErrorCounts[actual_move][predicted_move] += 1;
                        moveErrorCounts[actual_move].totalCount += 1;
                    }
                }
            }
            for (var key in moveErrorCounts) {
                confusingMove = {};
                confusingMove.move = key;
                confusingMove.totalConfusions = moveErrorCounts[key].totalCount;
                confusingMove.listOfConfusions = [];
                for (var move in moveErrorCounts[key]) {
                    if (move !== "totalCount") {
                        confusingMove.listOfConfusions.push({ move: move, count: moveErrorCounts[key][move] });
                    }
                }
                // Sort listOfConfusions by count property of each dict
                confusingMove.listOfConfusions.sort(function(first, second) {
                    return second.count - first.count;
                });
                confusingMoves.push(confusingMove);
            }
            // Sort confusingMoves by totalCount property of each dictionary
            confusingMoves.sort(function(first, second) {
                return second.totalConfusions - first.totalConfusions;
            });
            // Generate string representation of each dict in confusingMoves
            for (var i in confusingMoves) {
                moveDict = {};
                moveDict.move = confusingMoves[i].move;
                moveDict.string = "confused " + confusingMoves[i].totalConfusions + " times with ";
                for (var j in confusingMoves[i].listOfConfusions) {
                    moveDict.string += confusingMoves[i].listOfConfusions[j].move + " (" + confusingMoves[i].listOfConfusions[j].count + "), ";
                }
                moveDict.string = moveDict.string.substring(0, moveDict.string.length - 2);
                confusingMovesString.push(moveDict);
            }
            return confusingMovesString;
        }

        // Method to draw accuracy/emg chart
        // data is a list of double type values
        function drawChart(data) {
            var labels = [];
            for (var i in data) {
                labels.push((parseInt(i)+1).toString());
            }
            var ctx = document.getElementById('trend_chart').getContext('2d');
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
                    },
                    animation: false
                }
            });
        }

        /***
         *** Calculate and return the following as a dictionary:
         *** 1. Number of test runs
         *** 2. Overall prediction accuracy
         *** 3. JSON for Accuracy Chart
         *** 4. Average prediction time per dance move
         *** 5. Average Voltage
         *** 6. Average Current
         *** 7. Average Power
         *** 8. Average Energy
         *** 9. (Upto) Top 3 confusing moves with detailed count
        **/
        function runAnalytics(data, isRealTime) {
            var analytics = [];
            var confusing_moves = [];
            console.log(data);
            if (isRealTime == false) {
                var results = calculateMetrics(data);
                console.log(results);
                analytics.push({ name: "Number of test runs", value: data.length });
                analytics.push({ name: "Overall prediction accuracy", value: results.avg_accuracy.toString() + " %" });
                analytics.push({ name: "Average prediction time per dance move", value: results.avg_prediction_time.toString() + " seconds" });
                analytics.push({ name: "Average voltage", value: results.avg_voltage.toString() + " V" });
                analytics.push({ name: "Average current", value: results.avg_current.toString() + " A" });
                analytics.push({ name: "Average power", value: results.avg_power.toString() + " W" });
                analytics.push({ name: "Average energy", value: results.avg_energy.toString() + " J" });
                drawChart(results.accuracy_per_testrun);
                confusing_moves = determineTopConfusingMoves(data);
                if (confusing_moves.length > 0)
                    document.getElementById("confusing-moves-caption").innerText = "Top Confusing Moves";
                else if (parseInt(results.avg_accuracy) != 100 || results.avg_accuracy !== results.avg_accuracy)
                    document.getElementById("confusing-moves-caption").innerText = "No Confusing Moves, but 'none' was sent for some moves";
                else
                    document.getElementById("confusing-moves-caption").innerText = "No Confusing Moves yet!";
                return { analytics: analytics, confusing_moves: confusing_moves };
            }
            else {
                return {};
            }
        }

    };
})(angular.module("coachingDashboard"));
