import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeStorage } from '../utils/safeStorage';
import {
  ActiveTab,
  Appointment,
  AppointmentStatus,
  Barber,
  Client,
  Comanda,
  ComandaItem,
  PaymentMethod,
  Product,
  Service,
  ShopSettings,
} from '../types';
import {
  INITIAL_APPOINTMENTS,
  INITIAL_BARBERS,
  INITIAL_CLIENTS,
  INITIAL_COMANDAS,
  INITIAL_PRODUCTS,
  INITIAL_SERVICES,
  INITIAL_SETTINGS,
} from '../data/mockData';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}

interface BarbershopContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  userRole: 'admin' | 'barber' | 'client';
  setUserRole: (role: 'admin' | 'barber' | 'client') => void;
  selectedBarberId: string;
  setSelectedBarberId: (id: string) => void;
  settings: ShopSettings;
  updateSettings: (newSettings: Partial<ShopSettings>) => void;
  services: Service[];
  products: Product[];
  barbers: Barber[];
  clients: Client[];
  appointments: Appointment[];
  comandas: Comanda[];
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;

  // Appointment operations
  addAppointment: (apt: Omit<Appointment, 'id' | 'createdAt'>) => Appointment;
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  cancelAppointment: (id: string) => void;

  // Comanda operations
  openComandaForAppointment: (appointmentId: string) => string;
  createManualComanda: (clientName: string, clientPhone: string, barberId: string, chairNumber?: number) => string;
  addItemToComanda: (comandaId: string, item: { type: 'service' | 'product'; id: string; name: string; price: number; barberId: string }) => void;
  removeItemFromComanda: (comandaId: string, itemIndex: number) => void;
  closeComanda: (comandaId: string, paymentMethod: PaymentMethod, discount?: number) => void;

  // Catalog & Inventory
  addService: (service: Omit<Service, 'id'>) => void;
  updateService: (id: string, service: Partial<Service>) => void;
  deleteService: (id: string) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  adjustProductStock: (id: string, quantityDelta: number) => void;

  // Barber operations
  addBarber: (barber: Omit<Barber, 'id'>) => void;
  updateBarber: (id: string, barber: Partial<Barber>) => void;

  // Client operations
  addClient: (client: Omit<Client, 'id' | 'totalVisits' | 'totalSpent' | 'lastVisit'>) => void;
  updateClient: (id: string, client: Partial<Client>) => void;

  // Helpers
  resetToDefaultData: () => void;
}

const BarbershopContext = createContext<BarbershopContextType | undefined>(undefined);

const STORAGE_KEY = 'barbearia_saas_v02_state';

export const BarbershopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-30');
  const [userRole, setUserRole] = useState<'admin' | 'barber' | 'client'>('admin');
  const [selectedBarberId, setSelectedBarberId] = useState<string>('barb-1');

  // Load from safe storage or fallback to initial
  const [settings, setSettings] = useState<ShopSettings>(() => {
    try {
      const saved = safeStorage.getItem(`${STORAGE_KEY}_settings`);
      return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const [services, setServices] = useState<Service[]>(() => {
    try {
      const saved = safeStorage.getItem(`${STORAGE_KEY}_services`);
      return saved ? JSON.parse(saved) : INITIAL_SERVICES;
    } catch {
      return INITIAL_SERVICES;
    }
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = safeStorage.getItem(`${STORAGE_KEY}_products`);
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [barbers, setBarbers] = useState<Barber[]>(() => {
    try {
      const saved = safeStorage.getItem(`${STORAGE_KEY}_barbers`);
      return saved ? JSON.parse(saved) : INITIAL_BARBERS;
    } catch {
      return INITIAL_BARBERS;
    }
  });

  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const saved = safeStorage.getItem(`${STORAGE_KEY}_clients`);
      return saved ? JSON.parse(saved) : INITIAL_CLIENTS;
    } catch {
      return INITIAL_CLIENTS;
    }
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const saved = safeStorage.getItem(`${STORAGE_KEY}_appointments`);
      return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS;
    } catch {
      return INITIAL_APPOINTMENTS;
    }
  });

  const [comandas, setComandas] = useState<Comanda[]>(() => {
    try {
      const saved = safeStorage.getItem(`${STORAGE_KEY}_comandas`);
      return saved ? JSON.parse(saved) : INITIAL_COMANDAS;
    } catch {
      return INITIAL_COMANDAS;
    }
  });

  const [toasts, setToasts] = useState<Toast[]>([]);

  // Sync to safe storage
  useEffect(() => {
    try {
      safeStorage.setItem(`${STORAGE_KEY}_settings`, JSON.stringify(settings));
      safeStorage.setItem(`${STORAGE_KEY}_services`, JSON.stringify(services));
      safeStorage.setItem(`${STORAGE_KEY}_products`, JSON.stringify(products));
      safeStorage.setItem(`${STORAGE_KEY}_barbers`, JSON.stringify(barbers));
      safeStorage.setItem(`${STORAGE_KEY}_clients`, JSON.stringify(clients));
      safeStorage.setItem(`${STORAGE_KEY}_appointments`, JSON.stringify(appointments));
      safeStorage.setItem(`${STORAGE_KEY}_comandas`, JSON.stringify(comandas));
    } catch {
      // safe fallback
    }
  }, [settings, services, products, barbers, clients, appointments, comandas]);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const updateSettings = (newSettings: Partial<ShopSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    showToast('Configurações da barbearia atualizadas!', 'success');
  };

  const addAppointment = (aptData: Omit<Appointment, 'id' | 'createdAt'>) => {
    const newId = `apt-${Date.now().toString().slice(-5)}`;
    const now = new Date();
    const createdStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 5)}`;
    const newApt: Appointment = {
      ...aptData,
      id: newId,
      createdAt: createdStr,
    };

    setAppointments((prev) => [newApt, ...prev]);

    // Check if client exists, if not create record
    const existingClient = clients.find(
      (c) => c.phone.replace(/\D/g, '') === aptData.clientPhone.replace(/\D/g, '')
    );
    if (!existingClient) {
      const newCli: Client = {
        id: `cli-${Date.now().toString().slice(-4)}`,
        name: aptData.clientName,
        phone: aptData.clientPhone,
        totalVisits: 1,
        totalSpent: aptData.totalAmount,
        lastVisit: aptData.date,
        favoriteBarberId: aptData.barberId,
        preferredStyle: 'Não informado',
        notes: `Agendamento criado via ${aptData.source}`,
        isVip: false,
      };
      setClients((prev) => [newCli, ...prev]);
    }

    showToast(`Agendamento de ${aptData.clientName} confirmado às ${aptData.time}!`, 'success');
    return newApt;
  };

  const updateAppointmentStatus = (id: string, status: AppointmentStatus) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, status } : apt))
    );

    const apt = appointments.find((a) => a.id === id);
    if (status === 'em_atendimento') {
      showToast(`${apt?.clientName || 'Cliente'} em atendimento na cadeira!`, 'info');
    } else if (status === 'concluido') {
      showToast(`Atendimento de ${apt?.clientName || 'Cliente'} concluído.`, 'success');
    } else if (status === 'cancelado') {
      showToast(`Agendamento cancelado.`, 'warning');
    }
  };

  const cancelAppointment = (id: string) => {
    updateAppointmentStatus(id, 'cancelado');
  };

  const openComandaForAppointment = (appointmentId: string): string => {
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return '';

    // Check if already has open comanda
    const existing = comandas.find(
      (c) => c.appointmentId === appointmentId && c.status === 'aberta'
    );
    if (existing) {
      setActiveTab('comandas');
      return existing.id;
    }

    const service = services.find((s) => s.id === apt.serviceId);
    const barber = barbers.find((b) => b.id === apt.barberId);
    const servicePrice = service?.price || apt.totalAmount;
    const commissionPercent = barber?.commissionPercentServices || 50;
    const commissionAmount = (servicePrice * commissionPercent) / 100;

    const newComandaId = `cmd-${Date.now().toString().slice(-4)}`;
    const newComanda: Comanda = {
      id: newComandaId,
      appointmentId,
      clientName: apt.clientName,
      clientPhone: apt.clientPhone,
      barberId: apt.barberId,
      chairNumber: barber?.chairNumber || 1,
      items: [
        {
          type: 'service',
          id: service?.id || 'custom-srv',
          name: service?.name || 'Serviço de Barbearia',
          price: servicePrice,
          quantity: 1,
          barberId: apt.barberId,
          commissionAmount,
        },
      ],
      subtotal: servicePrice,
      discount: 0,
      total: servicePrice,
      status: 'aberta',
      openedAt: new Date().toTimeString().slice(0, 5),
    };

    setComandas((prev) => [newComanda, ...prev]);
    updateAppointmentStatus(appointmentId, 'em_atendimento');
    setActiveTab('comandas');
    showToast(`Comanda #${newComandaId} aberta para ${apt.clientName}!`, 'success');
    return newComandaId;
  };

  const createManualComanda = (
    clientName: string,
    clientPhone: string,
    barberId: string,
    chairNumber?: number
  ): string => {
    const barber = barbers.find((b) => b.id === barberId);
    const newComandaId = `cmd-${Date.now().toString().slice(-4)}`;
    const newComanda: Comanda = {
      id: newComandaId,
      clientName,
      clientPhone,
      barberId,
      chairNumber: chairNumber || barber?.chairNumber || 1,
      items: [],
      subtotal: 0,
      discount: 0,
      total: 0,
      status: 'aberta',
      openedAt: new Date().toTimeString().slice(0, 5),
    };

    setComandas((prev) => [newComanda, ...prev]);
    showToast(`Comanda avulsa #${newComandaId} aberta com sucesso!`, 'success');
    return newComandaId;
  };

  const addItemToComanda = (
    comandaId: string,
    item: { type: 'service' | 'product'; id: string; name: string; price: number; barberId: string }
  ) => {
    const barber = barbers.find((b) => b.id === item.barberId);
    const commPct =
      item.type === 'service'
        ? barber?.commissionPercentServices || 50
        : barber?.commissionPercentProducts || 15;
    const commissionAmount = (item.price * commPct) / 100;

    setComandas((prev) =>
      prev.map((cmd) => {
        if (cmd.id !== comandaId) return cmd;

        const newItem: ComandaItem = {
          type: item.type,
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          barberId: item.barberId,
          commissionAmount,
        };

        const updatedItems = [...cmd.items, newItem];
        const newSubtotal = updatedItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
        const newTotal = Math.max(0, newSubtotal - cmd.discount);

        return {
          ...cmd,
          items: updatedItems,
          subtotal: newSubtotal,
          total: newTotal,
        };
      })
    );

    // If it's a product, reduce inventory stock
    if (item.type === 'product') {
      adjustProductStock(item.id, -1);
    }

    showToast(`"${item.name}" adicionado à comanda!`, 'success');
  };

  const removeItemFromComanda = (comandaId: string, itemIndex: number) => {
    setComandas((prev) =>
      prev.map((cmd) => {
        if (cmd.id !== comandaId) return cmd;

        const removedItem = cmd.items[itemIndex];
        const updatedItems = cmd.items.filter((_, idx) => idx !== itemIndex);
        const newSubtotal = updatedItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
        const newTotal = Math.max(0, newSubtotal - cmd.discount);

        // If it was a product, return stock
        if (removedItem && removedItem.type === 'product') {
          adjustProductStock(removedItem.id, removedItem.quantity);
        }

        return {
          ...cmd,
          items: updatedItems,
          subtotal: newSubtotal,
          total: newTotal,
        };
      })
    );
  };

  const closeComanda = (comandaId: string, paymentMethod: PaymentMethod, discount: number = 0) => {
    const closedTime = new Date().toTimeString().slice(0, 5);
    let targetCmd: Comanda | undefined;

    setComandas((prev) =>
      prev.map((cmd) => {
        if (cmd.id !== comandaId) return cmd;
        targetCmd = cmd;
        const total = Math.max(0, cmd.subtotal - discount);
        return {
          ...cmd,
          discount,
          total,
          status: 'fechada',
          paymentMethod,
          closedAt: closedTime,
        };
      })
    );

    if (targetCmd?.appointmentId) {
      updateAppointmentStatus(targetCmd.appointmentId, 'concluido');
    }

    // Update client stats if client matches
    if (targetCmd) {
      const finalPaid = Math.max(0, targetCmd.subtotal - discount);
      setClients((prev) =>
        prev.map((c) => {
          if (c.phone.replace(/\D/g, '') === targetCmd?.clientPhone.replace(/\D/g, '')) {
            return {
              ...c,
              totalVisits: c.totalVisits + 1,
              totalSpent: c.totalSpent + finalPaid,
              lastVisit: new Date().toISOString().split('T')[0],
            };
          }
          return c;
        })
      );
    }

    showToast(`Comanda #${comandaId} fechada com sucesso! Pagamento registrado.`, 'success');
  };

  const addService = (serviceData: Omit<Service, 'id'>) => {
    const newService: Service = {
      ...serviceData,
      id: `srv-${Date.now().toString().slice(-4)}`,
    };
    setServices((prev) => [...prev, newService]);
    showToast(`Serviço "${serviceData.name}" cadastrado!`, 'success');
  };

  const updateService = (id: string, updated: Partial<Service>) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
    showToast('Serviço atualizado com sucesso!', 'info');
  };

  const deleteService = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
    showToast('Serviço removido.', 'warning');
  };

  const addProduct = (productData: Omit<Product, 'id'>) => {
    const newProd: Product = {
      ...productData,
      id: `prod-${Date.now().toString().slice(-4)}`,
    };
    setProducts((prev) => [...prev, newProd]);
    showToast(`Produto "${productData.name}" adicionado ao estoque!`, 'success');
  };

  const updateProduct = (id: string, updated: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
    showToast('Produto atualizado!', 'info');
  };

  const adjustProductStock = (id: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const newStock = Math.max(0, p.stock + delta);
        return { ...p, stock: newStock };
      })
    );
  };

  const addBarber = (barberData: Omit<Barber, 'id'>) => {
    const newBarber: Barber = {
      ...barberData,
      id: `barb-${Date.now().toString().slice(-4)}`,
    };
    setBarbers((prev) => [...prev, newBarber]);
    showToast(`Barbeiro ${barberData.name} adicionado à equipe!`, 'success');
  };

  const updateBarber = (id: string, updated: Partial<Barber>) => {
    setBarbers((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
    showToast('Perfil do barbeiro atualizado!', 'info');
  };

  const addClient = (clientData: Omit<Client, 'id' | 'totalVisits' | 'totalSpent' | 'lastVisit'>) => {
    const newClient: Client = {
      ...clientData,
      id: `cli-${Date.now().toString().slice(-4)}`,
      totalVisits: 0,
      totalSpent: 0,
      lastVisit: 'Nunca',
    };
    setClients((prev) => [newClient, ...prev]);
    showToast(`Cliente ${clientData.name} cadastrado com sucesso!`, 'success');
  };

  const updateClient = (id: string, updated: Partial<Client>) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
    showToast('Dados do cliente atualizados.', 'info');
  };

  const resetToDefaultData = () => {
    try {
      safeStorage.removeItem(`${STORAGE_KEY}_settings`);
      safeStorage.removeItem(`${STORAGE_KEY}_services`);
      safeStorage.removeItem(`${STORAGE_KEY}_products`);
      safeStorage.removeItem(`${STORAGE_KEY}_barbers`);
      safeStorage.removeItem(`${STORAGE_KEY}_clients`);
      safeStorage.removeItem(`${STORAGE_KEY}_appointments`);
      safeStorage.removeItem(`${STORAGE_KEY}_comandas`);
    } catch {
      // safe fallback
    }
    setSettings(INITIAL_SETTINGS);
    setServices(INITIAL_SERVICES);
    setProducts(INITIAL_PRODUCTS);
    setBarbers(INITIAL_BARBERS);
    setClients(INITIAL_CLIENTS);
    setAppointments(INITIAL_APPOINTMENTS);
    setComandas(INITIAL_COMANDAS);
    showToast('Dados reiniciados com o banco padrão!', 'info');
  };

  return (
    <BarbershopContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedDate,
        setSelectedDate,
        userRole,
        setUserRole,
        selectedBarberId,
        setSelectedBarberId,
        settings,
        updateSettings,
        services,
        products,
        barbers,
        clients,
        appointments,
        comandas,
        toasts,
        showToast,
        removeToast,
        addAppointment,
        updateAppointmentStatus,
        cancelAppointment,
        openComandaForAppointment,
        createManualComanda,
        addItemToComanda,
        removeItemFromComanda,
        closeComanda,
        addService,
        updateService,
        deleteService,
        addProduct,
        updateProduct,
        adjustProductStock,
        addBarber,
        updateBarber,
        addClient,
        updateClient,
        resetToDefaultData,
      }}
    >
      {children}
    </BarbershopContext.Provider>
  );
};

export const useBarbershop = () => {
  const context = useContext(BarbershopContext);
  if (!context) {
    throw new Error('useBarbershop must be used within a BarbershopProvider');
  }
  return context;
};
