import React from 'react';
import ReservasList from './ReservasList'; // Importa el componente de la lista de reservas

/**
 * Componente ReservationsPage
 * Esta es una "página" que contiene y muestra la lista de reservas.
 * @param {object} props - Las propiedades del componente.
 * @param {object} props.db - La instancia de Firestore database.
 * @param {string} props.appFirestoreId - El ID de la aplicación en Firestore.
 */
function ReservationsPage({ db, appFirestoreId }) {
    return (
        <div className="reservations-page-container">
            {/* Aquí puedes añadir un título o cualquier otro elemento específico de esta página */}
            <h2 className="page-title">Administración de Reservas</h2>
            {/* El componente ReservasList se encarga de cargar y mostrar las reservas */}
            <ReservasList db={db} appFirestoreId={appFirestoreId} />
        </div>
    );
}

export default ReservationsPage;

