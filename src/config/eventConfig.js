// config/eventConfig.js

// Este archivo define la configuración global del evento actual.
// Cambiar el CURRENT_EVENT moverá todas las operaciones de la base de datos (stands, invitados, etc.)
// a una nueva subcolección para ese año específico, manteniendo la colección 'users' de forma global.

export const CURRENT_EVENT = '2026';

// Helper function to get the current event's base path
export const getEventBasePath = () => `events/${CURRENT_EVENT}`;
