import { describe, it, expect } from 'vitest';
import {
    generateId,
    generateTicketId,
    timestampToISO,
    cleanFirestoreData,
} from './helpers';
import { Timestamp } from 'firebase/firestore';

describe('Firestore Helpers', () => {
    describe('generateId', () => {
        it('should generate unique UUIDs', () => {
            const id1 = generateId();
            const id2 = generateId();

            expect(id1).toBeDefined();
            expect(id2).toBeDefined();
            expect(id1).not.toBe(id2);
            expect(id1.length).toBeGreaterThan(30);
        });
    });

    describe('generateTicketId', () => {
        it('should generate ticket ID with EVT- prefix', () => {
            const ticketId = generateTicketId();

            expect(ticketId).toMatch(/^EVT-[A-Z0-9]+-[A-Z0-9]+$/);
        });

        it('should generate unique ticket IDs', () => {
            const id1 = generateTicketId();
            const id2 = generateTicketId();

            expect(id1).not.toBe(id2);
        });
    });

    describe('timestampToISO', () => {
        it('should return current ISO when null', () => {
            const result = timestampToISO(null);

            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });

        it('should return current ISO when undefined', () => {
            const result = timestampToISO(undefined);

            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });

        it('should convert Timestamp to ISO string', () => {
            const date = new Date('2024-01-15T10:30:00Z');
            const timestamp = Timestamp.fromDate(date);

            const result = timestampToISO(timestamp);

            expect(result).toBe('2024-01-15T10:30:00.000Z');
        });
    });

    describe('cleanFirestoreData', () => {
        it('should remove undefined values', () => {
            const data = {
                name: 'Test',
                value: undefined,
                count: 5,
            };

            const result = cleanFirestoreData(data);

            expect(result).toEqual({ name: 'Test', count: 5 });
            expect('value' in result).toBe(false);
        });

        it('should preserve null values', () => {
            const data = {
                name: 'Test',
                nullValue: null,
            };

            const result = cleanFirestoreData(data);

            expect(result).toEqual({ name: 'Test', nullValue: null });
        });

        it('should handle nested objects', () => {
            const data = {
                user: {
                    name: 'Test',
                    age: undefined,
                    email: 'test@test.com',
                },
            };

            const result = cleanFirestoreData(data);

            expect(result).toEqual({
                user: {
                    name: 'Test',
                    email: 'test@test.com',
                },
            });
        });

        it('should handle arrays', () => {
            const data = {
                items: [{ name: 'A', value: undefined }, { name: 'B' }],
            };

            const result = cleanFirestoreData(data);

            expect(result).toEqual({
                items: [{ name: 'A' }, { name: 'B' }],
            });
        });
    });
});
