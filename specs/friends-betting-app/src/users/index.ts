export interface User {
    id: string;
    username: string;
    displayName: string;
    passwordHash: string;
    role: 'admin' | 'bettor';
}

export function createUser(username: string, displayName: string, password: string): User {
    // Implementation for creating a new user
}

export function updateUser(userId: string, updatedData: Partial<User>): User {
    // Implementation for updating user information
}

export function getUser(userId: string): User | null {
    // Implementation for retrieving a user by ID
}

export function getAllUsers(): User[] {
    // Implementation for retrieving all users
}