export type ServiceCategory = 'cabelo' | 'barba' | 'combo' | 'estetica' | 'quimica';

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  price: number;
  durationMinutes: number;
  description: string;
  popular?: boolean;
}

export type ProductCategory = 'pomada' | 'barba' | 'shampoo' | 'bebida' | 'cuidados';

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
}

export interface Barber {
  id: string;
  name: string;
  nickname: string;
  role: string;
  avatar: string;
  commissionPercentServices: number; // e.g. 50%
  commissionPercentProducts: number; // e.g. 15%
  phone: string;
  specialties: string[];
  rating: number;
  availableDays: string[];
  active: boolean;
  chairNumber: number;
  monthlyGoal: number;
}

export type AppointmentStatus = 'agendado' | 'em_atendimento' | 'concluido' | 'cancelado' | 'faltou';

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  barberId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: AppointmentStatus;
  totalAmount: number;
  source: 'online' | 'recepcao' | 'whatsapp';
  notes?: string;
  createdAt: string;
}

export interface ComandaItem {
  type: 'service' | 'product';
  id: string;
  name: string;
  price: number;
  quantity: number;
  barberId: string;
  commissionAmount: number;
}

export type PaymentMethod = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro';

export interface Comanda {
  id: string;
  appointmentId?: string;
  clientName: string;
  clientPhone: string;
  barberId: string;
  chairNumber: number;
  items: ComandaItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: 'aberta' | 'fechada' | 'cancelada';
  paymentMethod?: PaymentMethod;
  openedAt: string;
  closedAt?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  totalVisits: number;
  totalSpent: number;
  lastVisit: string;
  favoriteBarberId?: string;
  preferredStyle: string;
  notes: string;
  isVip: boolean;
}

export interface ShopSettings {
  name: string;
  slug: string;
  tagline: string;
  address: string;
  city: string;
  phone: string;
  whatsapp: string;
  openingHours: string;
  pixKey: string;
  pixKeyType: string;
  plan: 'starter' | 'pro' | 'master';
  chairsCount: number;
}

export type ActiveTab = 
  | 'dashboard'
  | 'agenda'
  | 'comandas'
  | 'barbeiros'
  | 'servicos'
  | 'clientes'
  | 'financeiro'
  | 'portal_cliente'
  | 'configuracoes';
