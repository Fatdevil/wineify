import { NotificationType } from '../types';

export const sendNotification = (userId: string, message: string, type: NotificationType): void => {
    // Logic to send notification to the user
    console.log(`Notification sent to user ${userId}: ${message} [Type: ${type}]`);
};

export const getUserNotifications = (userId: string): Array<{ message: string; type: NotificationType; timestamp: Date }> => {
    // Logic to retrieve notifications for a user
    return [
        { message: 'Your bet has been placed successfully!', type: 'info', timestamp: new Date() },
        { message: 'Betting has closed for the event.', type: 'warning', timestamp: new Date() },
    ];
};