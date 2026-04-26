
//Autenticación - Login/Logout

// Verificar si el usuario ya está autenticado en páginas protegidas
function verificarAutenticacion() {
    const token = getToken();
    const user = getUserData();

    if (!token || !user) {
        // Redirigir al login
        if (window.location.pathname.includes('/pages/')) {
            window.location.href = '../index.html';
            return false;
        } else {
            window.location.href = 'index.html';
            return false;
        }
    }

    return true;
}

// Cerrar sesión
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Redirigir al login 
    if (window.location.pathname.includes('/pages/')) {
        window.location.href = '../index.html';
    } else {
        window.location.href = 'index.html';
    }
}

// Para manejar el formulario del login
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const btnLogin = document.getElementById('btnLogin');

        // Deshabilitar botón
        btnLogin.disabled = true;
        btnLogin.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Iniciando...';

        try {
            const response = await AuthAPI.login(email, password);

            if (response.success) {
                // Guardar token y datos del usuario
                localStorage.setItem('token', response.data.access_token);
                localStorage.setItem('user', JSON.stringify(response.data.user));

                // Mostrar mensaje de éxito
                Swal.fire({
                    icon: 'success',
                    title: '¡Bienvenido!',
                    text: response.data.user.nombre_completo,
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    // Redirigir al dashboard
                    window.location.href = 'pages/dashboard.html';
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error de autenticación',
                text: error.message || 'Credenciales inválidas'
            });

            // Rehabilitar botón
            btnLogin.disabled = false;
            btnLogin.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Iniciar Sesión';
        }
    });
}

// Mostrar información del usuario en el encabezado
function mostrarInfoUsuario() {
    const user = getUserData();
    if (!user) return;

    const userInfoElement = document.getElementById('userInfo');
    if (userInfoElement) {
        userInfoElement.innerHTML = `
            <span class="user-info">
                <i class="bi bi-person-circle"></i> ${user.nombre_completo} 
                | <i class="bi bi-shop"></i> ${user.nombre_caja}
            </span>
        `;
    }
}

// Cosas a ejecutar al cargar la pagina
if (window.location.pathname.includes('/pages/')) {
    verificarAutenticacion();
    mostrarInfoUsuario();
}
