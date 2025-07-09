import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, deleteDoc } from 'firebase/firestore';

/**
 * Calcula la edad de una persona a partir de su fecha de nacimiento.
 * @param {string} fechaNacimiento - La fecha de nacimiento en formato 'YYYY-MM-DD'.
 * @returns {number|string} La edad en años o 'N/A' si la fecha no es válida.
 */
const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return 'N/A';
    const fechaNac = new Date(fechaNacimiento);
    if (isNaN(fechaNac.getTime())) return 'N/A'; // Verifica si la fecha es válida

    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const mes = hoy.getMonth() - fechaNac.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
        edad--;
    }
    return edad;
};

/**
 * Componente ReservasList
 * Muestra una lista de reservas obtenidas de Firebase Firestore en tiempo real.
 * @param {object} props - Las propiedades del componente.
 * @param {object} props.db - La instancia de Firestore database.
 * @param {string} props.appFirestoreId - El ID de la aplicación en Firestore.
 */
function ReservasList({ db, appFirestoreId }) {
    const [reservas, setReservas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [reservaToDeleteId, setReservaToDeleteId] = useState(null);
    const [deleteMessage, setDeleteMessage] = useState('');
    const [deleteMessageType, setDeleteMessageType] = useState(''); // 'success' or 'error'

    useEffect(() => {
        if (!db) {
            setError("La base de datos de Firestore no está inicializada.");
            setLoading(false);
            return;
        }

        // Construir la ruta de la colección de reservas
        const reservasCollectionRef = collection(db, `artifacts/${appFirestoreId}/public/data/reservas`);

        // Crear una consulta para obtener las reservas.
        // Se ordena por timestamp descendente para ver las más recientes primero.
        const q = query(reservasCollectionRef);

        // Suscribirse a los cambios en tiempo real de la colección de reservas
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedReservas = [];
            snapshot.forEach((doc) => {
                fetchedReservas.push({
                    id: doc.id, // El ID del documento de Firestore
                    ...doc.data() // Todos los datos del documento
                });
            });

            // Ordenar las reservas por timestamp en memoria (descendente)
            fetchedReservas.sort((a, b) => {
                if (a.timestamp && b.timestamp) {
                    // Convertir Firebase Timestamp a Date para comparación
                    const dateA = a.timestamp.toDate();
                    const dateB = b.timestamp.toDate();
                    return dateB - dateA; // Orden descendente (más reciente primero)
                }
                return 0; // Mantener el orden si no hay timestamp
            });

            setReservas(fetchedReservas);
            setLoading(false);
        }, (err) => {
            console.error("Error al obtener reservas:", err);
            setError("Error al cargar las reservas. Inténtalo de nuevo.");
            setLoading(false);
        });

        // Limpiar la suscripción cuando el componente se desmonte
        return () => unsubscribe();
    }, [db, appFirestoreId]); // Dependencias: se ejecuta cuando 'db' o 'appFirestoreId' cambian

    /**
     * Maneja el clic en el botón de eliminar, mostrando el modal de confirmación.
     * @param {string} reservaId - El ID de la reserva a eliminar.
     */
    const handleDeleteClick = (reservaId) => {
        setReservaToDeleteId(reservaId);
        setShowConfirmModal(true);
        setDeleteMessage(''); // Clear previous messages
        setDeleteMessageType('');
    };

    /**
     * Confirma y ejecuta la eliminación de la reserva.
     */
    const confirmDelete = async () => {
        if (!reservaToDeleteId || !db) {
            setDeleteMessage('Error: No se pudo identificar la reserva a eliminar.');
            setDeleteMessageType('error');
            setShowConfirmModal(false);
            return;
        }

        try {
            // Construir la referencia al documento a eliminar
            const docRef = doc(db, `artifacts/${appFirestoreId}/public/data/reservas`, reservaToDeleteId);
            await deleteDoc(docRef);
            setDeleteMessage('Reserva eliminada con éxito.');
            setDeleteMessageType('success');
            setShowConfirmModal(false);
            setReservaToDeleteId(null); // Clear the ID
        } catch (error) {
            console.error("Error al eliminar la reserva:", error);
            setDeleteMessage('Error al eliminar la reserva. Inténtalo de nuevo.');
            setDeleteMessageType('error');
            setShowConfirmModal(false);
        }
    };

    /**
     * Cancela la eliminación y cierra el modal.
     */
    const cancelDelete = () => {
        setShowConfirmModal(false);
        setReservaToDeleteId(null);
        setDeleteMessage('');
        setDeleteMessageType('');
    };

    if (loading) {
        return <div className="reservas-loading">Cargando reservas...</div>;
    }

    if (error) {
        return <div className="reservas-error">{error}</div>;
    }

    return (
        <div className="reservas-list-container">
            <h3 className="reservas-list-title">Reservas Existentes</h3>
            {deleteMessage && (
                <div className={`delete-message-display ${deleteMessageType}`}>
                    {deleteMessage}
                </div>
            )}
            {reservas.length === 0 ? (
                <p className="no-reservas-message">No hay reservas registradas aún.</p>
            ) : (
                <div className="reservas-grid-wrapper"> {/* Contenedor para todas las tarjetas de reserva */}
                    {reservas.map((reserva) => (
                        <div key={reserva.id} className="reserva-card">
                            {/* Sección de Información Principal de la Reserva */}
                            <div className="reserva-main-info">
                                <p><strong>ID de Reserva:</strong> <span className="reserva-id">{reserva.id}</span></p>
                                <p><strong>Ingreso:</strong> {reserva.fechaIngreso}</p>
                                <p><strong>Salida:</strong> {reserva.fechaSalida}</p>
                                <p><strong>Personas:</strong> {reserva.cantidadPersonas}</p>
                                <p><strong>Email:</strong> {reserva.email}</p>
                                <p>
                                    <strong>Teléfono:</strong>
                                    {/* Enlace a WhatsApp */}
                                    <a 
                                        href={`https://wa.me/${reserva.telefonoContacto.replace(/\D/g, '')}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="whatsapp-link" // Clase para estilos opcionales
                                    >
                                        {reserva.telefonoContacto}
                                    </a>
                                </p>
                                <p><strong>País:</strong> {reserva.pais}</p>
                                <p><strong>Dirección:</strong> {reserva.direccion}</p>
                                <p><strong>Fecha y hora de la reserva:</strong> {reserva.timestamp ? reserva.timestamp.toDate().toLocaleString() : 'N/A'}</p>
                            </div>

                            {/* Sección de Huéspedes */}
                            {reserva.huespedes && reserva.huespedes.length > 0 && (
                                <div className="huespedes-section">
                                    <h4 className="huespedes-section-title">Detalles de Huéspedes</h4>
                                    <div className="huespedes-grid">
                                        {reserva.huespedes.map((huesped, idx) => (
                                            <div key={idx} className="huesped-card">
                                                <h5>Huésped {idx + 1}</h5>
                                                <p><strong>Apellido y Nombre:</strong> {huesped.apellidoNombre}</p>
                                                <p><strong>DNI / Pasaporte:</strong> {huesped.dniPasaporte}</p>
                                                <p><strong>Fecha de Nacimiento:</strong> {huesped.fechaNacimiento}</p>
                                                <p><strong>Edad:</strong> {calcularEdad(huesped.fechaNacimiento)}</p> {/* Campo de edad */}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <button 
                                className="delete-reserva-button"
                                onClick={() => handleDeleteClick(reserva.id)}
                            >
                                Eliminar Reserva
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Confirmación de Eliminación */}
            {showConfirmModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Confirmar Eliminación</h3>
                        <p>¿Estás seguro de que quieres eliminar esta reserva?</p>
                        <div className="modal-actions">
                            <button className="modal-button confirm" onClick={confirmDelete}>Sí, Eliminar</button>
                            <button className="modal-button cancel" onClick={cancelDelete}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ReservasList;