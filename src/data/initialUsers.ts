import { AppUser } from '../types';

export const INITIAL_USERS: AppUser[] = [
  {
    id: 'usr-001',
    name: 'Ibnu (Owner)',
    email: 'ibnu@greenhouse.id',
    username: 'ibnu',
    role: 'Owner / Super Admin',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    password: 'ibnu123',
    phone: '0812-3456-7890',
    status: 'Aktif',
    faceMatchScore: 99.4,
    createdAt: '2026-01-01',
    lastLogin: '2026-09-26T04:50:00Z',
  },
];
