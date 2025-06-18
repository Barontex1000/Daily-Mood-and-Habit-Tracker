// Simulating a simple authentication system using localStorage
// In a real application, you'd use a backend server for authentication

/**
 * Show a Bootstrap alert message near the form.
 * @param {string} id - The alert div id.
 * @param {string} message - The message to display.
 * @param {string} type - Bootstrap alert type (danger, success, etc).
 */
function showAlert(id, message, type = 'danger') {
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
function hideAlert(id) {
    const alertDiv = document.getElementById(id);
    if (alertDiv) {
        alertDiv.classList.add('d-none');
        alertDiv.textContent = '';
    }
}

/**
 * Sign up a new user using Firebase Auth.
 * @param {Event} event
 */
async function signup(event) {
    event.preventDefault();
    hideAlert('signup-alert');
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!/^\S+@\S+\.\S+$/.test(email)) {
        showAlert('signup-alert', 'Please enter a valid email address.');
        return;
    }
    if (password.length < 6) {
        showAlert('signup-alert', 'Password must be at least 6 characters.');
        return;
    }
    if (password !== confirmPassword) {
        showAlert('signup-alert', "Passwords don't match!");
        return;
    }
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await userCredential.user.updateProfile({ displayName: username });
        showAlert('signup-alert', 'Signup successful! Please log in.', 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1200);
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            showAlert('signup-alert', 'Email already exists!');
        } else if (error.code === 'auth/invalid-email') {
            showAlert('signup-alert', 'Invalid email address!');
        } else if (error.code === 'auth/weak-password') {
            showAlert('signup-alert', 'Password is too weak!');
        } else {
            showAlert('signup-alert', error.message);
        }
    }
}

/**
 * Log in a user using Firebase Auth.
 * @param {Event} event
 */
async function login(event) {
    event.preventDefault();
    hideAlert('login-alert');
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!/^\S+@\S+\.\S+$/.test(email)) {
        showAlert('login-alert', 'Please enter a valid email address.');
        return;
    }
    if (!password) {
        showAlert('login-alert', 'Please enter your password.');
        return;
    }
    try {
        await auth.signInWithEmailAndPassword(email, password);
        window.location.href = 'index.html';
    } catch (error) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            showAlert('login-alert', 'Invalid email or password!');
        } else {
            showAlert('login-alert', error.message);
        }
    }
}

/**
 * Log out the current user using Firebase Auth.
 */
function logout() {
    auth.signOut().then(() => {
        window.location.href = 'login.html';
    });
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
    // Redirect to login if not authenticated (for index.html)
    if (window.location.pathname.endsWith('index.html') && !auth.currentUser) {
        auth.onAuthStateChanged(user => {
            if (!user) {
                window.location.href = 'login.html';
            }
        });
    }
});