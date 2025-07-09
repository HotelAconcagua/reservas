import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
// Importa tu archivo CSS tradicional
import './App.css'; 
// Importa el nuevo componente de página de reservas
import ReservationsPage from './ReservationsPage';

// CONFIGURACIÓN DE TU PROYECTO FIREBASE (YA ACTUALIZADA CON TUS DATOS)
const firebaseConfig = {
  apiKey: "AIzaSyBcdH9L1TM3ClkZ1JYIUFB5Sqltgj1dFXo",
  authDomain: "nuevareservarigistro.firebaseapp.com",
  projectId: "nuevareservarigistro",
  storageBucket: "nuevareservarigistro.firebasestorage.app",
  messagingSenderId: "125274697719",
  appId: "1:125274697719:web:db8ccd89e465e49bf288f2"
};

// Define un ID único para tu aplicación dentro de Firestore.
// Este 'appId' se usa en la ruta de la colección de Firestore (ej: /artifacts/{appId}/...)
// Puedes elegir cualquier cadena única para identificar tu aplicación.
const APP_FIRESTORE_ID = "hotel-raices-aconcagua-reservas"; // Por ejemplo, un ID descriptivo para tu aplicación

// Contraseña para acceder a las reservas (¡Solo para demostración! En un entorno real, usarías autenticación segura)
const RESERVATIONS_PASSWORD = "tresfronteras545";

// Componente principal de la aplicación
function App() {
    // Estados para los campos del formulario
    const [cantidadPersonas, setCantidadPersonas] = useState(1);
    const [fechaIngreso, setFechaIngreso] = useState('');
    const [fechaSalida, setFechaSalida] = useState('');
    const [telefonoContacto, setTelefonoContacto] = useState('');
    const [email, setEmail] = useState('');
    const [pais, setPais] = useState(''); // Nuevo estado para País
    const [direccion, setDireccion] = useState(''); // Nuevo estado para Dirección
    const [huespedes, setHuespedes] = useState([]); // Array para los datos de los huéspedes

    // Estados para la lógica de Firebase y UI
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState('');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); // 'success' o 'error'

    // Nuevos estados para mensajes de error específicos de validación
    const [fechaSalidaError, setFechaSalidaError] = useState('');
    const [emailError, setEmailError] = useState('');

    // Nuevo estado para controlar la página actual: 'form' o 'reservations'
    const [currentPage, setCurrentPage] = useState('form');

    // Estados para la autenticación del recepcionista
    const [showPasswordInput, setShowPasswordInput] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');


    // Efecto para inicializar Firebase y autenticar al usuario
    useEffect(() => {
        const initFirebase = async () => {
            try {
                // Inicializar la aplicación Firebase
                const app = initializeApp(firebaseConfig);
                const firestoreDb = getFirestore(app);
                const firebaseAuth = getAuth(app);

                setDb(firestoreDb);
                setAuth(firebaseAuth);

                // Escuchar cambios en el estado de autenticación
                const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                    if (user) {
                        setUserId(user.uid);
                    } else {
                        // Si no hay usuario autenticado, intenta iniciar sesión anónimamente
                        try {
                            await signInAnonymously(firebaseAuth);
                            setUserId(firebaseAuth.currentUser?.uid || crypto.randomUUID()); // Usar uid si existe, sino un UUID random
                        } catch (anonError) {
                            console.error("Error al iniciar sesión anónimamente:", anonError);
                            setMessage("Error de autenticación. No se pueden guardar los datos.");
                            setMessageType('error');
                            setUserId(crypto.randomUUID()); // Asegurar que haya un userId incluso si la autenticación falla
                        }
                    }
                    setLoading(false); // La carga inicial ha terminado
                });

                // Limpiar el listener al desmontar el componente
                return () => unsubscribe();
            } catch (error) {
                console.error("Error al inicializar Firebase:", error);
                setMessage("Error al inicializar la aplicación. Por favor, inténtalo de nuevo más tarde.");
                setMessageType('error');
                setLoading(false);
            }
        };

        initFirebase();
    }, []); // Se ejecuta solo una vez al montar el componente

    // Efecto para generar los campos de los huéspedes dinámicamente
    useEffect(() => {
        const newHuespedes = [];
        for (let i = 0; i < cantidadPersonas; i++) {
            newHuespedes.push({
                apellidoNombre: huespedes[i]?.apellidoNombre || '',
                dniPasaporte: huespedes[i]?.dniPasaporte || '',
                fechaNacimiento: huespedes[i]?.fechaNacimiento || ''
            });
        }
        setHuespedes(newHuespedes);
    }, [cantidadPersonas]); // Se ejecuta cada vez que cambia 'cantidadPersonas'

    /**
     * Maneja el cambio de los inputs de los huéspedes.
     * @param {number} index - Índice del huésped en el array.
     * @param {string} field - Nombre del campo ('apellidoNombre', 'dniPasaporte', 'fechaNacimiento').
     * @param {string} value - Nuevo valor del campo.
     */
    const handleHuespedChange = (index, field, value) => {
        const updatedHuespedes = [...huespedes];
        updatedHuespedes[index] = {
            ...updatedHuespedes[index],
            [field]: value
        };
        setHuespedes(updatedHuespedes);
    };

    /**
     * Valida la fecha de salida en relación con la fecha de ingreso.
     */
    const validateFechaSalida = (currentFechaSalida) => {
        if (!fechaIngreso || !currentFechaSalida) {
            setFechaSalidaError(''); // No hay error si una de las fechas está vacía
            return true;
        }
        const checkInDate = new Date(fechaIngreso);
        const checkOutDate = new Date(currentFechaSalida);
        if (checkOutDate < checkInDate) {
            setFechaSalidaError('La fecha de salida no puede ser anterior a la de ingreso.');
            return false;
        } else {
            setFechaSalidaError('');
            return true;
        }
    };

    /**
     * Valida el formato del email.
     */
    const validateEmail = (currentEmail) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(currentEmail) && currentEmail !== '') { // Solo muestra error si no está vacío y es inválido
            setEmailError('Por favor, ingresa un formato de email válido.');
            return false;
        } else {
            setEmailError('');
            return true;
        }
    };

    /**
     * Maneja el envío del formulario.
     * @param {Event} e - Evento de envío del formulario.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setMessageType('');

        if (!db || !userId) {
            setMessage('La base de datos no está lista o el usuario no está autenticado.');
            setMessageType('error');
            return;
        }

        // Ejecutar validaciones finales antes de enviar
        const isFechaSalidaValid = validateFechaSalida(fechaSalida);
        const isEmailValid = validateEmail(email);

        if (!isFechaSalidaValid || !isEmailValid) {
            setMessage('Por favor, corrige los errores en el formulario antes de enviar.');
            setMessageType('error');
            return;
        }

        setLoading(true);
        setMessage('Enviando reserva...');
        setMessageType('');

        try {
            // Crear el objeto de la reserva
            const reservaData = {
                cantidadPersonas: parseInt(cantidadPersonas, 10),
                fechaIngreso: fechaIngreso,
                fechaSalida: fechaSalida,
                telefonoContacto: telefonoContacto,
                email: email,
                pais: pais,
                direccion: direccion,
                huespedes: huespedes,
                timestamp: serverTimestamp(), // Marca de tiempo del servidor para la creación del documento
                userId: userId // ID del usuario que realizó la reserva
            };

            // Guardar en Firestore en la colección pública de reservas
            // Path: /artifacts/{APP_FIRESTORE_ID}/public/data/reservas
            const docRef = await addDoc(collection(db, `artifacts/${APP_FIRESTORE_ID}/public/data/reservas`), reservaData);

            setMessage('¡Reserva enviada con éxito!');
            setMessageType('success');
            // Limpiar el formulario
            setCantidadPersonas(1);
            setFechaIngreso('');
            setFechaSalida('');
            setTelefonoContacto('');
            setEmail('');
            setPais('');
            setDireccion('');
            setHuespedes([]); // Limpiar huéspedes también
            setLoading(false);
            console.log("Documento escrito con ID: ", docRef.id);

        } catch (error) {
            console.error("Error al añadir documento: ", error);
            setMessage('Error al enviar la reserva. Inténtalo de nuevo.');
            setMessageType('error');
            setLoading(false);
        }
    };

    // Función para manejar el clic en "Ver Reservas"
    const handleViewReservationsClick = () => {
        setShowPasswordInput(true); // Muestra el campo de contraseña
        setPassword(''); // Limpia cualquier contraseña anterior
        setPasswordError(''); // Limpia cualquier error anterior
        setCurrentPage('form'); // Asegúrate de que el contenedor de la contraseña se muestre en la "página" del formulario
    };

    // Función para manejar el envío de la contraseña
    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        if (password === RESERVATIONS_PASSWORD) {
            setCurrentPage('reservations'); // Cambia a la página de reservas
            setShowPasswordInput(false); // Oculta el campo de contraseña
            setPasswordError(''); // Limpia el error
        } else {
            setPasswordError('Contraseña incorrecta. Inténtalo de nuevo.');
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <p className="loading-text">Cargando aplicación...</p>
            </div>
        );
    }

    return (
        <div className="main-container">
            {/* Flecha indicadora de scroll - Solo visible en la página del formulario y si no se pide contraseña */}
            {currentPage === 'form' && !showPasswordInput && <div className="scroll-down-arrow"></div>}
            
            <div className="navigation-buttons">
                <button 
                    className={`nav-button ${currentPage === 'form' && !showPasswordInput ? 'active' : ''}`}
                    onClick={() => {
                        setCurrentPage('form');
                        setShowPasswordInput(false); // Asegúrate de ocultar el input de contraseña si vuelves al formulario
                    }}
                >
                    Nueva Reserva
                </button>
                <button 
                    className={`nav-button ${currentPage === 'reservations' || showPasswordInput ? 'active' : ''}`}
                    onClick={handleViewReservationsClick}
                >
                    Ver Reservas
                </button>
            </div>

            {/* Renderizado condicional del formulario */}
            {currentPage === 'form' && !showPasswordInput && (
                <div className="form-wrapper">
                    <h2 className="form-title">
                        Hotel Raíces Aconcagua
                        <span className="subtitle">Nueva Reserva</span>
                    </h2>
                    {/* La línea del ID de Usuario ha sido comentada para ocultarla */}
                    {/* <p className="user-id-display">ID de Usuario: <span className="user-id-value">{userId}</span></p> */}

                    {/* Mensaje de éxito/error movido aquí */}
                    {message && (
                        <div className={`message-display ${messageType}`}>
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Sección de Datos Principales */}
                        <div className="form-section-grid">
                            <div className="form-group">
                                <label htmlFor="cantidadPersonas" className="form-label">Cantidad de personas:</label>
                                <input
                                    type="number"
                                    id="cantidadPersonas"
                                    name="cantidadPersonas"
                                    min="1"
                                    value={cantidadPersonas}
                                    onChange={(e) => setCantidadPersonas(parseInt(e.target.value) || 0)}
                                    required
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="fechaIngreso" className="form-label">Fecha de Ingreso (Check In):</label>
                                <input
                                    type="date"
                                    id="fechaIngreso"
                                    name="fechaIngreso"
                                    value={fechaIngreso}
                                    onChange={(e) => {
                                        setFechaIngreso(e.target.value);
                                        validateFechaSalida(fechaSalida); // Revalidar fecha de salida al cambiar la de ingreso
                                    }}
                                    required
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="fechaSalida" className="form-label">Fecha de Salida (Check Out):</label>
                                <input
                                    type="date"
                                    id="fechaSalida"
                                    name="fechaSalida"
                                    value={fechaSalida}
                                    onChange={(e) => {
                                        setFechaSalida(e.target.value);
                                        validateFechaSalida(e.target.value); // Validar instantáneamente
                                    }}
                                    required
                                    className="form-input"
                                />
                                {fechaSalidaError && <p className="input-error-message">{fechaSalidaError}</p>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="telefonoContacto" className="form-label">Teléfono de Contacto:</label>
                                <input
                                    type="text"
                                    id="telefonoContacto"
                                    name="telefonoContacto"
                                    value={telefonoContacto}
                                    onChange={(e) => setTelefonoContacto(e.target.value)}
                                    required
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group full-width"> {/* Ocupa ambas columnas en pantallas medianas */}
                                <label htmlFor="email" className="form-label">Email:</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        validateEmail(e.target.value); // Validar instantáneamente
                                    }}
                                    required
                                    className="form-input"
                                />
                                {emailError && <p className="input-error-message">{emailError}</p>}
                            </div>
                            {/* Nuevos campos: País y Dirección */}
                            <div className="form-group">
                                <label htmlFor="pais" className="form-label">País:</label>
                                <input
                                    type="text"
                                    id="pais"
                                    name="pais"
                                    value={pais}
                                    onChange={(e) => setPais(e.target.value)}
                                    required
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="direccion" className="form-label">Dirección:</label>
                                <input
                                    type="text"
                                    id="direccion"
                                    name="direccion"
                                    value={direccion}
                                    onChange={(e) => setDireccion(e.target.value)}
                                    required
                                    className="form-input"
                                />
                            </div>
                        </div>

                        <div className="separator"></div>

                        {/* Sección de Huéspedes Dinámica */}
                        <div id="huespedesContainer">
                            {huespedes.map((huesped, index) => (
                                <div key={index} className="guest-section">
                                    <h3 className="guest-title">Huésped {index + 1}</h3>
                                    <div className="form-group">
                                        <label htmlFor={`apellidoNombre_${index}`} className="form-label">Apellido y Nombre:</label>
                                        <input
                                            type="text"
                                            id={`apellidoNombre_${index}`}
                                            name={`huesped_${index}_apellidoNombre`}
                                            value={huesped.apellidoNombre}
                                            onChange={(e) => handleHuespedChange(index, 'apellidoNombre', e.target.value)}
                                            required
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor={`dniPasaporte_${index}`} className="form-label">DNI / Pasaporte:</label>
                                        <input
                                            type="text"
                                            id={`dniPasaporte_${index}`}
                                            name={`huesped_${index}_dniPasaporte`}
                                            value={huesped.dniPasaporte}
                                            onChange={(e) => handleHuespedChange(index, 'dniPasaporte', e.target.value)}
                                            required
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor={`fechaNacimiento_${index}`} className="form-label">Fecha de Nacimiento:</label>
                                        <input
                                            type="date"
                                            id={`fechaNacimiento_${index}`}
                                            name={`huesped_${index}_fechaNacimiento`}
                                            value={huesped.fechaNacimiento}
                                            onChange={(e) => handleHuespedChange(index, 'fechaNacimiento', e.target.value)}
                                            required
                                            className="form-input"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            type="submit"
                            className="submit-button"
                            disabled={loading}
                        >
                            {loading ? 'Enviando...' : 'Enviar Reserva'}
                        </button>
                    </form>
                </div>
            )}

            {/* Campo de contraseña para "Ver Reservas" */}
            {showPasswordInput && currentPage === 'form' && (
                <div className="password-input-container">
                    <form onSubmit={handlePasswordSubmit}>
                        <label htmlFor="password-field" className="form-label">Ingresa la clave de recepcionista:</label>
                        <input
                            type="password"
                            id="password-field"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        {passwordError && <p className="input-error-message">{passwordError}</p>}
                        <button type="submit" className="submit-button password-submit-button">Acceder a Reservas</button>
                    </form>
                </div>
            )}

            {/* Renderiza la página de reservas solo si currentPage es 'reservations' y db está inicializado */}
            {currentPage === 'reservations' && db && (
                <ReservationsPage db={db} appFirestoreId={APP_FIRESTORE_ID} />
            )}
        </div>
    );
}

export default App;