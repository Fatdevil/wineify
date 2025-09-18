export function generateJoinCode(length: number = 6): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let joinCode = '';
    for (let i = 0; i < length; i++) {
        joinCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return joinCode;
}

export function validateJoinCode(code: string, validCodes: string[]): boolean {
    return validCodes.includes(code);
}