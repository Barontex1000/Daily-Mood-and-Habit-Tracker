// Global variables
let habits = [];
const maxHabits = 5;
let selectedGender = null;
const maleHabits = ['Exercise', 'Shave', 'Take vitamins', 'Read', 'Meditate'];
const femaleHabits = ['Skincare routine', 'Take vitamins', 'Exercise', 'Meditate', 'Journal'];
let currentUser = JSON.parse(localStorage.getItem('currentUser'));
let combinedChart = null;

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

    // Reset form fields
    resetForm();

    // Load data from local storage
    loadData();

    // Initial render
    updateCombinedChart();
    generateWeeklyReport();
    loadDataForDate(); // Load data for the current date
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

function loadDataForDate() {
    const selectedDate = document.getElementById('date').value;
    updateMoodButtons(selectedDate);
    renderHabits(selectedDate);
    updateCombinedChart();
}

function updateMoodButtons(date) {
    const moodData = JSON.parse(localStorage.getItem(`moodData_${currentUser.email}`)) || {};
    const mood = moodData[date];
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.mood === mood?.toString());
    });
}

function setMood(event) {
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');
}

function addHabit() {
    if (habits.length >= maxHabits) {
        alert('You can only track up to 5 custom habits.');
        return;
    }

    const habitName = prompt('Enter the name of the new habit:');
    if (habitName) {
        habits.push({ name: habitName, data: {} });
        saveData();
        loadDataForDate();
        updateCombinedChart();
    }
}

function renderHabits(date) {
    const habitsList = document.getElementById('habits-list');
    const customHabitsList = document.getElementById('custom-habits-list');
    habitsList.innerHTML = '';
    customHabitsList.innerHTML = '';

    const genderHabits = selectedGender ? (selectedGender === 'male' ? maleHabits : femaleHabits) : [];

    genderHabits.forEach((habitName, index) => {
        const habitItem = createHabitItem(habitName, index, date, false);
        habitsList.appendChild(habitItem);
    });

    habits.forEach((habit, index) => {
        const habitItem = createHabitItem(habit.name, index, date, true);
        customHabitsList.appendChild(habitItem);
    });
}

function createHabitItem(habitName, index, date, isCustom) {
    const habitItem = document.createElement('div');
    habitItem.className = 'habit-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `habit-${isCustom ? 'custom-' : ''}${index}`;
    checkbox.checked = getHabitStatus(habitName, date);

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

function getHabitStatus(habitName, date) {
    const habitData = JSON.parse(localStorage.getItem(`habitData_${currentUser.email}`)) || {};
    return habitData[date] && habitData[date][habitName] || false;
}

function removeHabit(index) {
    habits.splice(index, 1);
    saveData();
    loadDataForDate();
    updateCombinedChart();
}

function saveEntry() {
    const date = document.getElementById('date').value;
    const mood = document.querySelector('.mood-btn.selected')?.dataset.mood;
    
    if (!mood) {
        alert('Please select a mood before saving.');
        return;
    }

    let moodData = JSON.parse(localStorage.getItem(`moodData_${currentUser.email}`)) || {};
    moodData[date] = parseInt(mood);
    localStorage.setItem(`moodData_${currentUser.email}`, JSON.stringify(moodData));

    const genderHabits = selectedGender === 'male' ? maleHabits : femaleHabits;
    let habitData = JSON.parse(localStorage.getItem(`habitData_${currentUser.email}`)) || {};
    habitData[date] = habitData[date] || {};

    genderHabits.forEach((habit, index) => {
        const checkbox = document.getElementById(`habit-${index}`);
        habitData[date][habit] = checkbox.checked;
    });

    habits.forEach((habit, index) => {
        const checkbox = document.getElementById(`habit-custom-${index}`);
        habitData[date][habit.name] = checkbox.checked;
    });

    localStorage.setItem(`habitData_${currentUser.email}`, JSON.stringify(habitData));

    updateCombinedChart();
    generateWeeklyReport();

    alert('Entry saved successfully!');
    loadDataForDate(); // Reload the data for the current date
}

function updateCombinedChart() {
    const ctx = document.getElementById('combined-chart').getContext('2d');
    const dates = getLast7Days();
    const moodData = getMoodData();
    const allHabits = [...new Set([...maleHabits, ...femaleHabits, ...habits.map(h => h.name)])];
    
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
            data: getHabitData(habitName),
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
    return getLast7Days().map(date => {
        return habitData[date] && habitData[date][habitName] ? 1 : 0;
    });
}

function getLast7Days() {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
}

function getMoodData() {
    const moodData = JSON.parse(localStorage.getItem(`moodData_${currentUser.email}`)) || {};
    return getLast7Days().map(date => moodData[date] || null);
}

function generateWeeklyReport() {
    const dates = getLast7Days();
    const moodData = getMoodData();
    const habitData = getHabitDataForAllHabits();
    const reportContent = document.getElementById('report-content');

    let report = '<h3>Mood Summary</h3>';
    const averageMood = moodData.filter(mood => mood !== null).reduce((sum, mood) => sum + mood, 0) / moodData.filter(mood => mood !== null).length;
    report += `<p>Average mood for the week: ${averageMood.toFixed(2)}</p>`;
    
    const moodMode = calculateMode(moodData.filter(mood => mood !== null));
    report += `<p>Most common mood: ${moodMode}</p>`;

    report += '<h3>Habit Summary</h3>';
    const allHabits = [...new Set([...maleHabits, ...femaleHabits, ...habits.map(h => h.name)])];
    
    allHabits.forEach(habit => {
        const habitCompletionRate = habitData[habit].filter(completed => completed === 1).length / 7 * 100;
        report += `<p>${habit}: Completed ${habitCompletionRate.toFixed(2)}% of the time</p>`;
    });

    const mostProminentHabit = Object.entries(habitData).reduce((a, b) => 
        b[1].filter(completed => completed === 1).length > a[1].filter(completed => completed === 1).length ? b : a
    )[0];

    report += `<p>Most prominent habit: ${mostProminentHabit}</p>`;

    reportContent.innerHTML = report;
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

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);