export interface Participant {
    id: string;
    name: string;
    notes?: string;
}

export class ParticipantManager {
    private participants: Participant[] = [];

    addParticipant(name: string, notes?: string): Participant {
        const newParticipant: Participant = {
            id: this.generateId(),
            name,
            notes,
        };
        this.participants.push(newParticipant);
        return newParticipant;
    }

    removeParticipant(id: string): boolean {
        const index = this.participants.findIndex(participant => participant.id === id);
        if (index !== -1) {
            this.participants.splice(index, 1);
            return true;
        }
        return false;
    }

    getParticipants(): Participant[] {
        return this.participants;
    }

    private generateId(): string {
        return (Math.random() * 1e18).toString(36);
    }
}