export const translations = {
  en: {
    // Navigation
    licenses: 'Licenses',
    team: 'Team',
    profile: 'Profile',
    signOut: 'Sign Out',

    // Roles
    superAdmin: 'Super Admin',
    admin: 'Admin',
    user: 'User',

    // Dashboard
    dashboardTitle: 'License Dashboard',
    dashboardSubtitle: 'Manage all system licenses',
    newLicense: 'New License',
    allLicenses: 'All Licenses',
    of: 'of',

    // Stats
    totalLicenses: 'Total Licenses',
    active: 'Active',
    expired: 'Expired',
    paid: 'Paid',
    unpaid: 'Unpaid',
    revenue: 'Revenue',
    trial: 'Trial',

    // Table headers
    license: 'License',
    customer: 'Customer',
    status: 'Status',
    payment: 'Payment',
    expires: 'Expires',
    hwid: 'HWID',
    actions: 'Actions',

    // Status badges
    activeStatus: 'Active',
    inactiveStatus: 'Inactive',
    trialStatus: 'Trial',
    permanent: 'Permanent',
    notActivated: 'Not activated',

    // Payment
    paidStatus: 'Paid',
    unpaidStatus: 'Unpaid',

    // Actions
    viewDetails: 'View details',
    renew: 'Renew',
    markAsPaid: 'Mark as paid',
    resetHwid: 'Reset HWID',
    activate: 'Activate',
    deactivate: 'Deactivate',
    delete: 'Delete',
    edit: 'Edit',
    editName: 'Edit name',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',

    // Forms
    customerName: 'Customer name',
    email: 'Email',
    password: 'Password',
    username: 'Username',
    fullName: 'Full name',
    daysValid: 'Days valid',
    amount: 'Amount',
    paymentMethod: 'Payment method',
    notes: 'Notes',
    role: 'Role',
    daysToAdd: 'Days to add',

    // Create license
    createLicense: 'Create License',
    generateNewLicense: 'Generate a new license for a customer',
    markAsPaidOnCreate: 'Mark as paid',
    registerPaymentOnCreate: 'Register payment on create',
    isTrial: 'Trial license',
    freeTrialPeriod: 'Free trial period',
    licenseCreated: 'License Created',
    createAnother: 'Create Another',
    close: 'Close',

    // Renew
    renewLicense: 'Renew License',
    extendValidity: 'Extend the validity of license',
    currentExpiry: 'Current expiry',
    renewSuccess: 'License renewed until',

    // Payment dialog
    registerPayment: 'Register Payment',
    markLicenseAsPaid: 'Mark license as paid',
    paymentRegistered: 'Payment registered',

    // Team
    teamManagement: 'Team Management',
    manageAdmins: 'Manage all admins and users',
    manageYourTeam: 'Manage your team users',
    teamMembers: 'Team Members',
    totalMembers: 'Total Members',
    admins: 'Admins',
    users: 'Users',
    newAdminUser: 'New Admin/User',
    newUser: 'New User',
    createNewUser: 'Create New User',
    createAdminOrUser: 'Create an admin or user',
    addUserToTeam: 'Add a user to your team',
    makeAdmin: 'Make Admin',
    makeUser: 'Make User',
    userCreated: 'User created successfully',
    userDeleted: 'User deleted',
    roleChanged: 'Role changed to',
    adminsCanCreateUsers: 'Admins can create their own users',

    // Login
    loginTitle: 'License Manager',
    loginSubtitle: 'Sign in to manage licenses',
    usernameOrEmail: 'Username or Email',
    signingIn: 'Signing in...',
    signIn: 'Sign In',

    // Search & Filters
    searchPlaceholder: 'Search by key, name or email...',
    all: 'All',
    activeFilter: 'Active',
    inactiveFilter: 'Inactive',
    paidFilter: 'Paid',
    unpaidFilter: 'Unpaid',
    expiredFilter: 'Expired',
    expiringFilter: 'Expiring soon',
    validFilter: 'Valid',
    permanentFilter: 'Permanent',
    trialFilter: 'Trial',

    // Messages
    copiedToClipboard: 'Copied to clipboard',
    licenseDeactivated: 'License deactivated',
    licenseActivated: 'License activated',
    hwidReset: 'HWID reset successfully',
    licenseDeleted: 'License deleted',
    nameUpdated: 'Name updated',
    errorOccurred: 'An error occurred',
    confirmDelete: 'Delete license',
    noLicenses: 'No licenses registered',
    noTeamMembers: 'No team members',

    // Language
    language: 'Language',
    english: 'English',
    spanish: 'Spanish',

    // Logs
    checkLogs: 'Check Logs',
    checkLogsSubtitle: 'Monitor all license verification attempts',
    logs: 'Logs',
    totalChecks: 'Total Checks',
    successfulChecks: 'Successful',
    failedChecks: 'Failed',
    todayChecks: 'Today',
    time: 'Time',
    location: 'Location',
    ipAddress: 'IP Address',
    message: 'Message',
    valid: 'Valid',
    invalid: 'Invalid',
    searchLogsPlaceholder: 'Search by license, HWID, IP or location...',
    successFilter: 'Success',
    invalidFilter: 'Invalid',
    noLogs: 'No logs found',
    showing: 'Showing',

    // Export
    exportCSV: 'Export CSV',
    exportingCSV: 'Exporting...',
    exportSuccess: 'Export completed',

    // Charts
    revenueChart: 'Revenue Chart',
    monthlyRevenue: 'Monthly Revenue',
    lastMonths: 'Last 6 months',

    // Credits
    credits: 'Credits',
    creditsManagement: 'Credits Management',
    manageCredits: 'Manage admin credits and trial limits',
    totalCreditsCirculating: 'Total Credits Circulating',
    creditsUsedThisMonth: 'Credits Used This Month',
    activeAdmins: 'Active Admins',
    yourCredits: 'Your Credits',
    trialsRemaining: 'Trials Remaining',
    trialLimitReached: 'Trial limit reached',
    insufficientCredits: 'Insufficient credits',
    creditCost: 'Credit Cost',
    permanentLicense: 'Permanent License',
    thirtyDayLicense: '30-Day License',
    trialLicense: 'Trial License',
    free: 'Free',

    // Profile
    profileTitle: 'Profile',
    profileSubtitle: 'Manage your personal information',
    memberSince: 'Member since',
    creditsAndLimits: 'Credits and Limits',
    availableCredits: 'Available credits',
    trialsUsedThisMonth: 'Trials used this month',
    security: 'Security',
    changePassword: 'Change password',
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    passwordsDoNotMatch: 'Passwords do not match',
    passwordUpdated: 'Password updated successfully',
    profileUpdated: 'Profile updated successfully',
    lastUpdate: 'Last update',
    unknown: 'unknown',
  },
  es: {
    // Navigation
    licenses: 'Licencias',
    team: 'Equipo',
    profile: 'Perfil',
    signOut: 'Cerrar Sesión',

    // Roles
    superAdmin: 'Super Admin',
    admin: 'Admin',
    user: 'Usuario',

    // Dashboard
    dashboardTitle: 'Dashboard de Licencias',
    dashboardSubtitle: 'Administra todas las licencias del sistema',
    newLicense: 'Nueva Licencia',
    allLicenses: 'Todas las Licencias',
    of: 'de',

    // Stats
    totalLicenses: 'Total Licencias',
    active: 'Activas',
    expired: 'Expiradas',
    paid: 'Pagadas',
    unpaid: 'Sin Pagar',
    revenue: 'Ingresos',
    trial: 'Prueba',

    // Table headers
    license: 'Licencia',
    customer: 'Cliente',
    status: 'Estado',
    payment: 'Pago',
    expires: 'Expira',
    hwid: 'HWID',
    actions: 'Acciones',

    // Status badges
    activeStatus: 'Activa',
    inactiveStatus: 'Inactiva',
    trialStatus: 'Prueba',
    permanent: 'Permanente',
    notActivated: 'No activada',

    // Payment
    paidStatus: 'Pagada',
    unpaidStatus: 'Sin pagar',

    // Actions
    viewDetails: 'Ver detalles',
    renew: 'Renovar',
    markAsPaid: 'Marcar como pagada',
    resetHwid: 'Resetear HWID',
    activate: 'Activar',
    deactivate: 'Desactivar',
    delete: 'Eliminar',
    edit: 'Editar',
    editName: 'Editar nombre',
    save: 'Guardar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',

    // Forms
    customerName: 'Nombre del cliente',
    email: 'Email',
    password: 'Contraseña',
    username: 'Usuario',
    fullName: 'Nombre completo',
    daysValid: 'Días de validez',
    amount: 'Monto',
    paymentMethod: 'Método de pago',
    notes: 'Notas',
    role: 'Rol',
    daysToAdd: 'Días a agregar',

    // Create license
    createLicense: 'Crear Licencia',
    generateNewLicense: 'Genera una nueva licencia para un cliente',
    markAsPaidOnCreate: 'Marcar como pagada',
    registerPaymentOnCreate: 'Registrar pago al crear',
    isTrial: 'Licencia de prueba',
    freeTrialPeriod: 'Período de prueba gratis',
    licenseCreated: 'Licencia Creada',
    createAnother: 'Crear Otra',
    close: 'Cerrar',

    // Renew
    renewLicense: 'Renovar Licencia',
    extendValidity: 'Extender la validez de la licencia',
    currentExpiry: 'Expira actualmente',
    renewSuccess: 'Licencia renovada hasta',

    // Payment dialog
    registerPayment: 'Registrar Pago',
    markLicenseAsPaid: 'Marcar licencia como pagada',
    paymentRegistered: 'Pago registrado',

    // Team
    teamManagement: 'Gestión de Equipo',
    manageAdmins: 'Administra todos los admins y usuarios',
    manageYourTeam: 'Administra los usuarios de tu equipo',
    teamMembers: 'Miembros del Equipo',
    totalMembers: 'Total Miembros',
    admins: 'Admins',
    users: 'Usuarios',
    newAdminUser: 'Nuevo Admin/Usuario',
    newUser: 'Nuevo Usuario',
    createNewUser: 'Crear Nuevo Usuario',
    createAdminOrUser: 'Crea un admin o usuario',
    addUserToTeam: 'Agrega un usuario a tu equipo',
    makeAdmin: 'Hacer Admin',
    makeUser: 'Hacer Usuario',
    userCreated: 'Usuario creado exitosamente',
    userDeleted: 'Usuario eliminado',
    roleChanged: 'Rol cambiado a',
    adminsCanCreateUsers: 'Los admins pueden crear sus propios usuarios',

    // Login
    loginTitle: 'License Manager',
    loginSubtitle: 'Inicia sesión para administrar licencias',
    usernameOrEmail: 'Usuario o Email',
    signingIn: 'Iniciando sesión...',
    signIn: 'Iniciar Sesión',

    // Search & Filters
    searchPlaceholder: 'Buscar por clave, nombre o email...',
    all: 'Todos',
    activeFilter: 'Activas',
    inactiveFilter: 'Inactivas',
    paidFilter: 'Pagadas',
    unpaidFilter: 'Sin pagar',
    expiredFilter: 'Expiradas',
    expiringFilter: 'Por expirar',
    validFilter: 'Vigentes',
    permanentFilter: 'Permanentes',
    trialFilter: 'Prueba',

    // Messages
    copiedToClipboard: 'Copiado al portapapeles',
    licenseDeactivated: 'Licencia desactivada',
    licenseActivated: 'Licencia activada',
    hwidReset: 'HWID reseteado correctamente',
    licenseDeleted: 'Licencia eliminada',
    nameUpdated: 'Nombre actualizado',
    errorOccurred: 'Ocurrió un error',
    confirmDelete: 'Eliminar licencia',
    noLicenses: 'No hay licencias registradas',
    noTeamMembers: 'No hay miembros en el equipo',

    // Language
    language: 'Idioma',
    english: 'Inglés',
    spanish: 'Español',

    // Logs
    checkLogs: 'Registros de Verificación',
    checkLogsSubtitle: 'Monitorea todos los intentos de verificación de licencias',
    logs: 'Registros',
    totalChecks: 'Total Verificaciones',
    successfulChecks: 'Exitosas',
    failedChecks: 'Fallidas',
    todayChecks: 'Hoy',
    time: 'Hora',
    location: 'Ubicación',
    ipAddress: 'Dirección IP',
    message: 'Mensaje',
    valid: 'Válida',
    invalid: 'Inválida',
    searchLogsPlaceholder: 'Buscar por licencia, HWID, IP o ubicación...',
    successFilter: 'Éxito',
    invalidFilter: 'Inválido',
    noLogs: 'No se encontraron registros',
    showing: 'Mostrando',

    // Export
    exportCSV: 'Exportar CSV',
    exportingCSV: 'Exportando...',
    exportSuccess: 'Exportación completada',

    // Charts
    revenueChart: 'Gráfico de Ingresos',
    monthlyRevenue: 'Ingresos Mensuales',
    lastMonths: 'Últimos 6 meses',

    // Credits
    credits: 'Créditos',
    creditsManagement: 'Gestión de Créditos',
    manageCredits: 'Administra los créditos y límites de prueba de revendedores',
    totalCreditsCirculating: 'Total Créditos en Circulación',
    creditsUsedThisMonth: 'Créditos Usados Este Mes',
    activeAdmins: 'Admins Activos',
    yourCredits: 'Tus Créditos',
    trialsRemaining: 'Pruebas Restantes',
    trialLimitReached: 'Límite de pruebas alcanzado',
    insufficientCredits: 'Créditos insuficientes',
    creditCost: 'Costo en Créditos',
    permanentLicense: 'Licencia Permanente',
    thirtyDayLicense: 'Licencia 30 Días',
    trialLicense: 'Licencia de Prueba',
    free: 'Gratis',

    // Profile
    profileTitle: 'Perfil',
    profileSubtitle: 'Administra tu información personal',
    memberSince: 'Miembro desde',
    creditsAndLimits: 'Créditos y Límites',
    availableCredits: 'Créditos disponibles',
    trialsUsedThisMonth: 'Pruebas usadas este mes',
    security: 'Seguridad',
    changePassword: 'Cambiar contraseña',
    newPassword: 'Nueva contraseña',
    confirmPassword: 'Confirmar contraseña',
    passwordsDoNotMatch: 'Las contraseñas no coinciden',
    passwordUpdated: 'Contraseña actualizada correctamente',
    profileUpdated: 'Perfil actualizado correctamente',
    lastUpdate: 'Última actualización',
    unknown: 'desconocido',
  },
}

export type Language = 'en' | 'es'
export type TranslationKey = keyof typeof translations.en

export function t(key: TranslationKey, lang: Language = 'en'): string {
  return translations[lang][key] || translations.en[key] || key
}
