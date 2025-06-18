// Global variables
(function() {
    // Encapsulate all variables and logic to avoid polluting global scope
    let habits = [];
    const maxHabits = 5;
    let selectedGender = null;
    const maleHabits = ['Exercise', 'Shave', 'Take vitamins', 'Read', 'Meditate'];
    const femaleHabits = ['Skincare routine', 'Take vitamins', 'Exercise', 'Meditate', 'Journal'];
    let currentUser = JSON.parse(localStorage.getItem('currentUser'));
    let combinedChart = null;
    let chartRange = 7;
    // Goal-setting framework
    let userGoals = {};

    function initApp() {
        // Set up event listeners
        document.getElementById('male-habits-btn').addEventListener('click', () => selectGender('male'));
        document.getElementById('female-habits-btn').addEventListener('click', () => selectGender('female'));
        document.getElementById('date').addEventListener('change', loadDataForDate);
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', setMood);
        });
        document.getElementById('add-habit-btn').addEventListener('click', addHabit);
        document.getElementById('save-entry-btn').addEventListener('click', saveEntry);
        document.getElementById('prev-date').addEventListener('click', () => changeDate(-1));
        document.getElementById('next-date').addEventListener('click', () => changeDate(1));
        const toggleRangeBtn = document.getElementById('toggle-range');
        if (toggleRangeBtn) {
            toggleRangeBtn.addEventListener('click', function() {
                chartRange = chartRange === 7 ? 30 : 7;
                toggleRangeBtn.textContent = chartRange + ' Days';
                updateCombinedChart();
                generateWeeklyReport();
            });
        }

        // Reset form fields
        resetForm();

        // Load data from local storage
        loadData();

        // Initial render
        updateCombinedChart();
        generateWeeklyReport();
        loadDataForDate(); // Load data for the current date
        loadGoalOptions();
        loadGoals();
        const goalForm = document.getElementById('goal-form');
        if (goalForm) goalForm.addEventListener('submit', saveGoal);
    }

    function resetForm() {
        document.getElementById('date').valueAsDate = new Date();
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.getElementById('male-habits-btn').classList.remove('selected');
        document.getElementById('female-habits-btn').classList.remove('selected');
        selectedGender = null;
        document.getElementById('habits-list').innerHTML = '';
        document.getElementById('custom-habits-list').innerHTML = '';
    }

    function loadData() {
        const storedHabits = localStorage.getItem(`habits_${currentUser.email}`);
        habits = storedHabits ? JSON.parse(storedHabits) : [];
        selectedGender = localStorage.getItem(`selectedGender_${currentUser.email}`);
    }

    function saveData() {
        localStorage.setItem(`habits_${currentUser.email}`, JSON.stringify(habits));
        localStorage.setItem(`selectedGender_${currentUser.email}`, selectedGender);
    }

    function selectGender(gender) {
        selectedGender = gender;
        document.getElementById('male-habits-btn').classList.toggle('selected', gender === 'male');
        document.getElementById('female-habits-btn').classList.toggle('selected', gender === 'female');
        saveData();
        loadDataForDate();
    }

    /**
     * Load mood and habit data for the selected date from Firestore.
     */
    async function loadDataForDate() {
        const selectedDate = document.getElementById('date').value;
        const user = auth.currentUser;
        if (!user) return;
        try {
            const doc = await db.collection('users').doc(user.uid).collection('entries').doc(selectedDate).get();
            if (doc.exists) {
                const data = doc.data();
                updateMoodButtons(selectedDate, data.mood);
                renderHabits(selectedDate, data.habits);
            } else {
                updateMoodButtons(selectedDate, null);
                renderHabits(selectedDate, {});
            }
            updateCombinedChart();
        } catch (error) {
            showEntryAlert('entry-alert', 'Error loading entry: ' + error.message);
        }
    }

    /**
     * Update mood buttons based on Firestore data.
     * @param {string} date
     * @param {number|null} mood
     */
    function updateMoodButtons(date, mood) {
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.mood === (mood ? mood.toString() : ''));
        });
    }

    // Calendar-based date navigation
    function changeDate(offset) {
        const dateInput = document.getElementById('date');
        if (!dateInput.value) return;
        const current = new Date(dateInput.value);
        current.setDate(current.getDate() + offset);
        dateInput.valueAsDate = current;
        loadDataForDate();
    }

    function setMood(event) {
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.classList.remove('selected', 'fade-in');
        });
        event.target.classList.add('selected', 'fade-in');
    }

    function addHabit() {
        if (habits.length >= maxHabits) {
            showEntryAlert('entry-alert', 'You can only track up to 5 custom habits.');
            return;
        }

        const habitName = prompt('Enter the name of the new habit:');
        if (habitName) {
            habits.push({ name: habitName, data: {} });
            saveData();
            loadDataForDate();
            updateCombinedChart();
            showEntryAlert('entry-alert', 'Custom habit added!', 'success');
        }
    }

    /**
     * Render habits and their checked state from Firestore data.
     * @param {string} date
     * @param {Object} habitsData
     */
    function renderHabits(date, habitsData = {}) {
        const habitsList = document.getElementById('habits-list');
        const customHabitsList = document.getElementById('custom-habits-list');
        habitsList.innerHTML = '';
        customHabitsList.innerHTML = '';

        const genderHabits = selectedGender ? (selectedGender === 'male' ? maleHabits : femaleHabits) : [];

        genderHabits.forEach((habitName, index) => {
            const habitItem = createHabitItem(habitName, index, date, false, habitsData[habitName]);
            habitsList.appendChild(habitItem);
        });

        habits.forEach((habit, index) => {
            const habitItem = createHabitItem(habit.name, index, date, true, habitsData[habit.name]);
            customHabitsList.appendChild(habitItem);
        });
    }

    function createHabitItem(habitName, index, date, isCustom, checked = false) {
        const habitItem = document.createElement('div');
        habitItem.className = 'habit-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `habit-${isCustom ? 'custom-' : ''}${index}`;
        checkbox.checked = checked;

        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = habitName;

        habitItem.appendChild(checkbox);
        habitItem.appendChild(label);

        if (isCustom) {
            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove';
            removeBtn.className = 'remove-habit-btn';
            removeBtn.addEventListener('click', () => removeHabit(index));
            habitItem.appendChild(removeBtn);
        }

        return habitItem;
    }

    // Modal-based delete confirmation for custom habits
    let habitToDeleteIndex = null;
    function removeHabit(index) {
        habitToDeleteIndex = index;
        const modal = new bootstrap.Modal(document.getElementById('deleteHabitModal'));
        modal.show();
    }
    document.addEventListener('DOMContentLoaded', function() {
        const confirmDeleteBtn = document.getElementById('confirmDeleteHabit');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', function() {
                if (habitToDeleteIndex !== null) {
                    habits.splice(habitToDeleteIndex, 1);
                    saveData();
                    loadDataForDate();
                    updateCombinedChart();
                    showEntryAlert('entry-alert', 'Custom habit removed.', 'success');
                    habitToDeleteIndex = null;
                    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteHabitModal'));
                    if (modal) modal.hide();
                }
            });
        }
    });

    // Firestore-based data logic (Firebase-ready)
    /**
     * Save mood and habit entry to Firestore for the current user.
     */
    async function saveEntry() {
        const date = document.getElementById('date').value;
        const mood = document.querySelector('.mood-btn.selected')?.dataset.mood;
        hideEntryAlert('entry-alert');
        if (!mood) {
            showEntryAlert('entry-alert', 'Please select a mood before saving.');
            return;
        }
        const user = auth.currentUser;
        if (!user) {
            showEntryAlert('entry-alert', 'You must be logged in to save entries.');
            return;
        }
        try {
            // Gather habit data
            const genderHabits = selectedGender === 'male' ? maleHabits : femaleHabits;
            const habitStatus = {};
            genderHabits.forEach((habit, index) => {
                const checkbox = document.getElementById(`habit-${index}`);
                habitStatus[habit] = checkbox && checkbox.checked;
            });
            habits.forEach((habit, index) => {
                const checkbox = document.getElementById(`habit-custom-${index}`);
                habitStatus[habit.name] = checkbox && checkbox.checked;
            });
            // Save to Firestore
            await db.collection('users').doc(user.uid).collection('entries').doc(date).set({
                mood: parseInt(mood),
                habits: habitStatus,
                gender: selectedGender || null,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            showEntryAlert('entry-alert', 'Entry saved successfully!', 'success');
            updateCombinedChart();
            generateWeeklyReport();
            loadDataForDate();
        } catch (error) {
            showEntryAlert('entry-alert', 'Error saving entry: ' + error.message);
        }
    }

    /**
     * Update the combined chart with data from Firestore for the last 7 days.
     */
    async function updateCombinedChart() {
        const ctx = document.getElementById('combined-chart').getContext('2d');
        const user = auth.currentUser;
        if (!user) return;
        const dates = getLastNDays(chartRange);
        const moodData = [];
        const allHabits = [...new Set([...maleHabits, ...femaleHabits, ...habits.map(h => h.name)])];
        const habitDataMap = {};
        allHabits.forEach(h => habitDataMap[h] = []);
        for (const date of dates) {
            const doc = await db.collection('users').doc(user.uid).collection('entries').doc(date).get();
            if (doc.exists) {
                const data = doc.data();
                moodData.push(data.mood || null);
                allHabits.forEach(habit => {
                    habitDataMap[habit].push(data.habits && data.habits[habit] ? 1 : 0);
                });
            } else {
                moodData.push(null);
                allHabits.forEach(habit => habitDataMap[habit].push(0));
            }
        }
        const datasets = [
            {
                label: 'Mood',
                data: moodData,
                type: 'line',
                borderColor: 'rgb(75, 192, 192)',
                yAxisID: 'y-axis-mood',
            }
        ];
        allHabits.forEach((habitName, index) => {
            datasets.push({
                label: habitName,
                data: habitDataMap[habitName],
                type: 'bar',
                backgroundColor: `hsl(${index * 30}, 70%, 50%)`,
                yAxisID: 'y-axis-habits',
            });
        });
        const chartConfig = {
            type: 'bar',
            data: {
                labels: dates,
                datasets: datasets
            },
            options: {
                responsive: true,
                scales: {
                    'y-axis-mood': {
                        type: 'linear',
                        position: 'left',
                        beginAtZero: true,
                        max: 5,
                        title: {
                            display: true,
                            text: 'Mood'
                        }
                    },
                    'y-axis-habits': {
                        type: 'linear',
                        position: 'right',
                        beginAtZero: true,
                        max: 1,
                        title: {
                            display: true,
                            text: 'Habits'
                        },
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        };
        if (combinedChart) {
            combinedChart.data.labels = chartConfig.data.labels;
            combinedChart.data.datasets = chartConfig.data.datasets;
            combinedChart.update();
        } else {
            combinedChart = new Chart(ctx, chartConfig);
        }
    }

    function getHabitData(habitName) {
        const habitData = JSON.parse(localStorage.getItem(`habitData_${currentUser.email}`)) || {};
        return getLastNDays(chartRange).map(date => {
            return habitData[date] && habitData[date][habitName] ? 1 : 0;
        });
    }

    function getLastNDays(n) {
        const dates = [];
        for (let i = n - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dates.push(d.toISOString().split('T')[0]);
        }
        return dates;
    }

    function getMoodData() {
        const moodData = JSON.parse(localStorage.getItem(`moodData_${currentUser.email}`)) || {};
        return getLastNDays(chartRange).map(date => moodData[date] || null);
    }

    /**
     * Generate weekly report using Firestore data for the last 7 days.
     */
    async function generateWeeklyReport() {
        const dates = getLastNDays(chartRange);
        const user = auth.currentUser;
        if (!user) return;
        const moodData = [];
        const habitDataMap = {};
        const allHabits = [...new Set([...maleHabits, ...femaleHabits, ...habits.map(h => h.name)])];
        allHabits.forEach(h => habitDataMap[h] = []);
        for (const date of dates) {
            const doc = await db.collection('users').doc(user.uid).collection('entries').doc(date).get();
            if (doc.exists) {
                const data = doc.data();
                moodData.push(data.mood || null);
                allHabits.forEach(habit => {
                    habitDataMap[habit].push(data.habits && data.habits[habit] ? 1 : 0);
                });
            } else {
                moodData.push(null);
                allHabits.forEach(habit => habitDataMap[habit].push(0));
            }
        }
        const reportContent = document.getElementById('report-content');
        let report = '<h3>Mood Summary</h3>';
        const validMoods = moodData.filter(mood => mood !== null);
        const averageMood = validMoods.length ? (validMoods.reduce((sum, mood) => sum + mood, 0) / validMoods.length) : 0;
        report += `<p>Average mood for the week: ${averageMood.toFixed(2)}</p>`;
        const moodMode = calculateMode(validMoods);
        report += `<p>Most common mood: ${moodMode}</p>`;
        report += '<h3>Habit Summary</h3>';
        allHabits.forEach(habit => {
            const habitCompletionRate = habitDataMap[habit].filter(completed => completed === 1).length / chartRange * 100;
            report += `<p>${habit}: Completed ${habitCompletionRate.toFixed(2)}% of the time</p>`;
        });
        const mostProminentHabit = Object.entries(habitDataMap).reduce((a, b) =>
            b[1].filter(completed => completed === 1).length > a[1].filter(completed => completed === 1).length ? b : a
        )[0];
        report += `<p>Most prominent habit: ${mostProminentHabit}</p>`;
        report += calculateHabitMoodCorrelation(moodData, habitDataMap);
        reportContent.innerHTML = report;
    }

    /**
     * Calculate and display habit vs. mood correlation in the report.
     */
    function calculateHabitMoodCorrelation(moodData, habitDataMap) {
        let correlationReport = '<h4>Habit vs. Mood Correlation</h4>';
        Object.keys(habitDataMap).forEach(habit => {
            const habitArr = habitDataMap[habit];
            let moodSum = 0, moodCount = 0;
            for (let i = 0; i < habitArr.length; i++) {
                if (habitArr[i] === 1 && moodData[i] !== null) {
                    moodSum += moodData[i];
                    moodCount++;
                }
            }
            if (moodCount > 0) {
                const avgMood = (moodSum / moodCount).toFixed(2);
                correlationReport += `<p>When <b>${habit}</b> is completed, average mood: <b>${avgMood}</b></p>`;
            }
        });
        return correlationReport;
    }

    function calculateMode(arr) {
        return arr.sort((a,b) =>
            arr.filter(v => v === a).length - arr.filter(v => v === b).length
        ).pop();
    }

    function getHabitDataForAllHabits() {
        const allHabits = [...new Set([...maleHabits, ...femaleHabits, ...habits.map(h => h.name)])];
        const habitData = {};
        allHabits.forEach(habit => {
            habitData[habit] = getHabitData(habit);
        });
        return habitData;
    }

    /**
     * Show a Bootstrap alert message near the entry form.
     * @param {string} id - The alert div id.
     * @param {string} message - The message to display.
     * @param {string} type - Bootstrap alert type (danger, success, etc).
     */
    function showEntryAlert(id, message, type = 'danger') {
        const alertDiv = document.getElementById(id);
        if (alertDiv) {
            alertDiv.textContent = message;
            alertDiv.className = `alert alert-${type}`;
            alertDiv.classList.remove('d-none');
        }
    }

    /**
     * Hide a Bootstrap alert message.
     * @param {string} id - The alert div id.
     */
    function hideEntryAlert(id) {
        const alertDiv = document.getElementById(id);
        if (alertDiv) {
            alertDiv.classList.add('d-none');
            alertDiv.textContent = '';
        }
    }

    // Goal-setting logic
    async function loadGoalOptions() {
        const goalHabitSelect = document.getElementById('goal-habit');
        if (!goalHabitSelect) return;
        goalHabitSelect.innerHTML = '';
        const allHabits = [...new Set([...maleHabits, ...femaleHabits, ...habits.map(h => h.name)])];
        allHabits.forEach(habit => {
            const opt = document.createElement('option');
            opt.value = habit;
            opt.textContent = habit;
            goalHabitSelect.appendChild(opt);
        });
    }

    async function saveGoal(event) {
        event.preventDefault();
        const user = auth.currentUser;
        if (!user) return;
        const habit = document.getElementById('goal-habit').value;
        const freq = parseInt(document.getElementById('goal-frequency').value, 10);
        userGoals[habit] = freq;
        await db.collection('users').doc(user.uid).set({ goals: userGoals }, { merge: true });
        showGoalProgress();
    }

    async function loadGoals() {
        const user = auth.currentUser;
        if (!user) return;
        const doc = await db.collection('users').doc(user.uid).get();
        userGoals = (doc.exists && doc.data().goals) ? doc.data().goals : {};
        showGoalProgress();
    }

    async function showGoalProgress() {
        const user = auth.currentUser;
        if (!user) return;
        const goalDiv = document.getElementById('goal-progress');
        if (!goalDiv) return;
        let html = '';
        for (const habit in userGoals) {
            const freq = userGoals[habit];
            // Calculate completions in last 7 days
            const dates = getLastNDays(7);
            let completed = 0;
            for (const date of dates) {
                const doc = await db.collection('users').doc(user.uid).collection('entries').doc(date).get();
                if (doc.exists && doc.data().habits && doc.data().habits[habit]) completed++;
            }
            const percent = Math.min(100, Math.round((completed / freq) * 100));
            html += `<div class="mb-2"><b>${habit}</b>: ${completed}/${freq} <div class="progress"><div class="progress-bar bg-success" role="progressbar" style="width: ${percent}%" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">${percent}%</div></div></div>`;
        }
        goalDiv.innerHTML = html || '<span class="text-muted">No goals set yet.</span>';
    }

    document.addEventListener('DOMContentLoaded', initApp);
})();