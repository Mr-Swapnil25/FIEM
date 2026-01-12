import { User, Event, Booking, DashboardStats } from '../types';

// Initial Mock Data
const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Admin User',
    email: 'admin@college.edu',
    role: 'admin',
    avatarUrl: 'https://picsum.photos/200',
  },
  {
    id: 'u2',
    name: 'John Doe',
    email: 'student@college.edu',
    role: 'student',
    department: 'Computer Science',
    rollNo: 'CS2024001',
    avatarUrl: 'https://picsum.photos/201',
  }
];

const MOCK_EVENTS: Event[] = [
  {
    id: 'e1',
    title: 'Annual Tech Symposium',
    description: 'A grand showcase of technical innovation and projects by final year students.',
    eventDate: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days from now
    venue: 'Main Auditorium',
    price: 0,
    totalSlots: 200,
    availableSlots: 150,
    category: 'Technical',
    imageUrl: 'https://picsum.photos/800/400',
    adminId: 'u1',
    status: 'published',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'e2',
    title: 'Music Fest 2024',
    description: 'An evening of classical and modern music performances.',
    eventDate: new Date(Date.now() + 86400000 * 10).toISOString(),
    venue: 'Open Air Theatre',
    price: 15.00,
    totalSlots: 500,
    availableSlots: 480,
    category: 'Cultural',
    imageUrl: 'https://picsum.photos/800/401',
    adminId: 'u1',
    status: 'published',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'e3',
    title: 'React Workshop',
    description: 'Learn React Native in 4 hours.',
    eventDate: new Date(Date.now() - 86400000 * 2).toISOString(), // Past event
    venue: 'Lab 3',
    price: 5.00,
    totalSlots: 30,
    availableSlots: 0,
    category: 'Workshop',
    imageUrl: 'https://picsum.photos/800/402',
    adminId: 'u1',
    status: 'completed',
    createdAt: new Date().toISOString(),
  }
];

class SimulatedBackend {
  private users: User[];
  private events: Event[];
  private bookings: Booking[];

  constructor() {
    this.users = this.load('users', MOCK_USERS);
    this.events = this.load('events', MOCK_EVENTS);
    this.bookings = this.load('bookings', []);
  }

  private load<T>(key: string, defaultData: T): T {
    const stored = localStorage.getItem(`eventease_${key}`);
    return stored ? JSON.parse(stored) : defaultData;
  }

  private save(key: string, data: any) {
    localStorage.setItem(`eventease_${key}`, JSON.stringify(data));
  }

  // --- Auth ---
  async login(email: string): Promise<User> {
    await this.delay(800);
    const user = this.users.find(u => u.email === email);
    if (!user) throw new Error('Invalid credentials');
    return user;
  }

  async register(data: Omit<User, 'id'>): Promise<User> {
    await this.delay(1000);
    if (this.users.find(u => u.email === data.email)) {
      throw new Error('User already exists');
    }
    const newUser: User = { ...data, id: `u${Date.now()}` };
    this.users.push(newUser);
    this.save('users', this.users);
    return newUser;
  }

  // --- Events ---
  async getEvents(filters?: { status?: string; category?: string }): Promise<Event[]> {
    await this.delay(500);
    let result = [...this.events];
    if (filters?.status) {
      result = result.filter(e => e.status === filters.status);
    }
    if (filters?.category) {
      result = result.filter(e => e.category === filters.category);
    }
    return result.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  }

  async getEventById(id: string): Promise<Event | undefined> {
    await this.delay(300);
    return this.events.find(e => e.id === id);
  }

  async createEvent(data: Omit<Event, 'id' | 'createdAt' | 'availableSlots'>): Promise<Event> {
    await this.delay(800);
    const newEvent: Event = {
      ...data,
      id: `e${Date.now()}`,
      availableSlots: data.totalSlots,
      createdAt: new Date().toISOString(),
    };
    this.events.push(newEvent);
    this.save('events', this.events);
    return newEvent;
  }

  async updateEvent(id: string, data: Partial<Event>): Promise<Event> {
    await this.delay(500);
    const index = this.events.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Event not found');
    
    this.events[index] = { ...this.events[index], ...data };
    this.save('events', this.events);
    return this.events[index];
  }

  async deleteEvent(id: string): Promise<void> {
    await this.delay(500);
    this.events = this.events.filter(e => e.id !== id);
    this.save('events', this.events);
  }

  // --- Bookings ---
  async createBooking(userId: string, eventId: string): Promise<Booking> {
    await this.delay(1000);
    const event = this.events.find(e => e.id === eventId);
    if (!event) throw new Error('Event not found');
    if (event.availableSlots <= 0) throw new Error('No slots available');

    // Check if already booked
    const existing = this.bookings.find(b => b.userId === userId && b.eventId === eventId && b.status !== 'cancelled');
    if (existing) throw new Error('You have already booked this event');

    // Decrement slots
    event.availableSlots -= 1;
    this.save('events', this.events);

    const booking: Booking = {
      id: `b${Date.now()}`,
      userId,
      eventId,
      ticketId: `EVT-${Math.floor(Math.random() * 1000000)}`,
      qrCode: `EVENT-EASE:${eventId}:${userId}`,
      status: 'confirmed',
      amountPaid: event.price,
      bookedAt: new Date().toISOString(),
    };

    this.bookings.push(booking);
    this.save('bookings', this.bookings);
    return booking;
  }

  async getUserBookings(userId: string): Promise<Booking[]> {
    await this.delay(600);
    const userBookings = this.bookings.filter(b => b.userId === userId);
    // Enrich with event data
    return userBookings.map(b => {
      const event = this.events.find(e => e.id === b.eventId);
      return {
        ...b,
        eventTitle: event?.title,
        eventDate: event?.eventDate,
        eventVenue: event?.venue,
      };
    }).sort((a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime());
  }

  async getEventParticipants(eventId: string): Promise<Booking[]> {
    await this.delay(600);
    const participants = this.bookings.filter(b => b.eventId === eventId);
    return participants.map(b => {
      const user = this.users.find(u => u.id === b.userId);
      return {
        ...b,
        userName: user?.name,
        userEmail: user?.email,
      };
    });
  }

  async getAdminStats(): Promise<DashboardStats> {
    await this.delay(400);
    return {
      totalEvents: this.events.length,
      activeEvents: this.events.filter(e => e.status === 'published').length,
      totalRegistrations: this.bookings.filter(b => b.status === 'confirmed' || b.status === 'checked_in').length,
      totalRevenue: this.bookings.reduce((sum, b) => sum + (b.amountPaid || 0), 0),
    };
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const backend = new SimulatedBackend();
