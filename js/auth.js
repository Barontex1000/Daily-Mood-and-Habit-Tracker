// Simulating a simple authentication system using localStorage
// In a real application, you'd use a backend server for authentication

function signup(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (password !== confirmPassword) {
        alert("Passwords don't match!");
        return;
    }

    const users = JSON.parse(localStorage.getItem('users')) || [];
    if (users.some(user => user.email === email)) {
        alert('Email already exists!');
        return;
    }

    users.push({ username, email, password });
    localStorage.setItem('users', JSON.stringify(users));
    alert('Signup successful! Please log in.');
    window.location.href = 'login.html';
}

function login(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        window.location.href = 'index.html';
    } else {
        alert('Invalid email or password!');
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup');
    const loginForm = document.getElementById('login');
    const logoutBtn = document.getElementById('logout-btn');

    if (signupForm) {
        signupForm.addEventListener('submit', signup);
    }

    if (loginForm) {
        loginForm.addEventListener('submit', login);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});