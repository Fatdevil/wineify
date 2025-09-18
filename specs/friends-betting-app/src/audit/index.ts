export function logAction(action: string, details: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Action: ${action}`, details);
}

export function logError(error: Error): void {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] Error: ${error.message}`, error);
}

export function logAdminChange(adminId: string, changeDetails: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Admin Change by ${adminId}`, changeDetails);
}