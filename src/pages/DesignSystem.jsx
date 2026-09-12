import { useState } from "react";
import { OFFICIAL_PALETTE, setBrandTheme } from "../utils/theme";

import { designSystemStyles } from "./DesignSystem.styles";
import ThemeToggle from "../components/ui/ThemeToggle";

import Navbar from "../components/ui/Navbar";
import Sidebar from "../components/ui/Sidebar";
import CalendarView from "../components/calendar/CalendarView";
import AppointmentCard from "../components/calendar/AppointmentCard";
import BarberTimelineColumn from "../components/calendar/BarberTimelineColumn";
import TimeSlotPicker from "../components/calendar/TimeSlotPicker";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Card from "../components/ui/Card";
import Alert from "../components/ui/Alert";
import Toggle from "../components/ui/Toggle";
import Modal from "../components/ui/Modal";
import IconButton from "../components/ui/IconButton";
import RadioButton from "../components/ui/RadioButton";
import CheckBox from "../components/ui/CheckBox";
import SplitButton from "../components/ui/SplitButton";
import Fab from "../components/ui/Fab";
import Select from "../components/ui/Select";
import DatePicker from "../components/ui/DatePicker";
import SearchInput from "../components/ui/SearchInput";
import BottomNavigation from "../components/ui/BottomNavigation";
import Tabs from "../components/ui/Tabs";
import Breadcrumb from "../components/ui/Breadcrumb";
import Pagination from "../components/ui/Pagination";
import Badge from "../components/ui/Badge";
import Skeleton from "../components/ui/Skeleton";
import Spinner from "../components/ui/Spinner";
import ServiceCard from "../components/services/ServiceCard";
import ServiceMultiSelect from "../components/services/ServiceMultiSelect";
import ProfessionalCard from "../components/services/ProfessionalCard";
import WorkShiftSelector from "../components/services/WorkShiftSelector";
import QueueTicket from "../components/pos/QueueTicket";
import PosProductItem from "../components/pos/PosProductItem";
import ComandaCard from "../components/pos/ComandaCard";
import PaymentMethodSelector from "../components/pos/PaymentMethodSelector";
import LoyaltyCard from "../components/loyalty/LoyaltyCard";
import SubscriptionBadge from "../components/loyalty/SubscriptionBadge";
import ClientHistoryTimeline from "../components/loyalty/ClientHistoryTimeline";
import StatCard from "../components/dashboard/StatCard";
import FinancialChart from "../components/dashboard/FinancialChart";
import CommissionBreakdownCard from "../components/dashboard/CommissionBreakdownCard";
import Avatar from "../components/ui/Avatar";
import Divider from "../components/ui/Divider";
import Table from "../components/ui/Table";

export default function DesignSystem() {
  // Estado do tema White-Label da barbearia
  const [activeBrandTheme, setActiveBrandTheme] = useState("amber");

  const [currentBarberStatus, setCurrentBarberStatus] = useState("available");
  const [activeBranchId, setActiveBranchId] = useState("1");
  const [loading, setLoading] = useState(false);
  const [emailInput, setEmailInput] = useState("usuario@invalido");
  const [whatsappNotify, setWhatsappNotify] = useState(true);
  const [onlineBooking, setOnlineBooking] = useState(false);
  const [testandoToggle, settestandoToggle] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(2); // Começa em Março (índice 2)
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho"];
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [selectedBarber, setSelectedBarber] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");

  // Estado para simular o ciclo de vida de um agendamento ao vivo
  const [appointmentStatus, setAppointmentStatus] = useState("waiting");

  // Estados para o formulário do Modal de Serviço
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [formErrors, setFormErrors] = useState({});

  // Estados para simular a paginação da lista de clientes
  const [clientPage, setClientPage] = useState(2); // Começa na página 2
  const [clientPageSize, setClientPageSize] = useState(20);
  const totalClientsCount = 142; // Exemplo exato da sua regra!

  // Estado para simular carrinho de serviços do agendamento
  const [selectedServices, setSelectedServices] = useState({
    corte: true,
    barba: false,
    sobrancelha: false,
  });

  // Estados para simular carregamento estrutural e ação blocante
  const [isCardLoading, setIsCardLoading] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handleSimulateCardLoad = () => {
    setIsCardLoading(true);
    setTimeout(() => setIsCardLoading(false), 2000); // Simula 2s de requisição
  };

  const handleProcessPayment = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      alert("Pagamento da comanda confirmado com sucesso!");
    }, 2500); // Bloqueia por 2.5s
  };

  // Cálculo dinâmico do valor total dos serviços marcados
  const prices = { corte: 45, barba: 35, sobrancelha: 20 };
  const totalAgendamento = Object.keys(selectedServices).reduce(
    (total, serviceKey) => {
      return selectedServices[serviceKey] ? total + prices[serviceKey] : total;
    },
    0,
  );

  // Estados para DatePicker
  const [bookingDate, setBookingDate] = useState(new Date());
  const [bookingTime, setBookingTime] = useState("10:00");

  // Horários simulados da barbearia
  const scheduleSlots = [
    { time: "09:00", available: true },
    { time: "09:30", available: false }, // Horário ocupado por outro cliente
    { time: "10:00", available: true },
    { time: "10:30", available: true },
    { time: "11:00", available: false }, // Horário ocupado
    { time: "14:00", available: true },
    { time: "14:30", available: true },
    { time: "15:00", available: true },
    { time: "15:30", available: false },
  ];

  // Estado do SearchInput e Lista de Serviços para filtro em tempo real
  const [searchTerm, setSearchTerm] = useState("");

  const mockServicesList = [
    {
      id: 1,
      name: "Corte Masculino Degradê",
      price: "R$ 45,00",
      category: "Cabelo",
    },
    {
      id: 2,
      name: "Barboterapia com Toalha Quente",
      price: "R$ 35,00",
      category: "Barba",
    },
    {
      id: 3,
      name: "Design de Sobrancelha na Navalha",
      price: "R$ 20,00",
      category: "Acabamento",
    },
    {
      id: 4,
      name: "Pigmentação de Barba",
      price: "R$ 30,00",
      category: "Barba",
    },
    {
      id: 5,
      name: "Lavagem Especial e Hidratação",
      price: "R$ 25,00",
      category: "Tratamento",
    },
  ];

  // Filtra a lista dinamicamente com base no que foi digitado
  const filteredServices = mockServicesList.filter(
    (service) =>
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const [activeMenuItem, setActiveMenuItem] = useState("agenda");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navigationMenuItems = [
    { id: "agenda", label: "Agenda de Cortes", icon: "📅", badge: "3 novos" },
    { id: "servicos", label: "Catálogo de Serviços", icon: "✂️" },
    { id: "profissionais", label: "Equipe de Barbeiros", icon: "💈" },
    { id: "clientes", label: "Clientes & Histórico", icon: "👥" },
    { id: "financeiro", label: "Financeiro & Comissões", icon: "💰" },
    { id: "configuracoes", label: "Configurações da Unidade", icon: "⚙️" },
  ];

  const [activeClientTab, setActiveClientTab] = useState("inicio");

  const clientNavTabs = [
    { id: "inicio", label: "Início", icon: "🏠" },
    { id: "servicos", label: "Serviços", icon: "✂️" },
    {
      id: "agendar",
      label: "Agendar",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M12 4v16m8-8H4"
          />
        </svg>
      ),
      isCenterAction: true, // Botão elevado central!
    },
    { id: "meus-cortes", label: "Meus Cortes", icon: "📅", badge: "1" },
    { id: "perfil", label: "Perfil", icon: "👤" },
  ];

  // Estados para testar a troca de abas
  const [activeSettingsTab, setActiveSettingsTab] = useState("servicos");
  const [activeFinanceTab, setActiveFinanceTab] = useState("comissoes");

  const settingsTabs = [
    { id: "geral", label: "Dados Gerais", icon: "🏢" },
    { id: "servicos", label: "Serviços & Preços", icon: "✂️", badge: "12" },
    { id: "barbeiros", label: "Equipe de Barbeiros", icon: "💈", badge: "4" },
    { id: "horarios", label: "Horários de Atendimento", icon: "⏰" },
  ];

  const financeTabs = [
    { id: "resumo", label: "Visão Geral" },
    { id: "caixa", label: "Entradas (Caixa)" },
    { id: "comissoes", label: "Comissões dos Barbeiros", badge: "Novo" },
    { id: "despesas", label: "Despesas & Custos" },
  ];

  const mockCarlosAppointments = [
    {
      id: "apt-1",
      clientName: "Rodrigo Faro",
      serviceName: "Corte Degradê Navalhado",
      startTime: "09:00",
      endTime: "10:00",
      durationMinutes: 60,
      status: "confirmed",
      isPaid: true,
      isVip: true,
      hasNotes: false,
    },
    {
      id: "apt-2",
      clientName: "Guilherme Boulos",
      serviceName: "Barboterapia Completa",
      startTime: "10:30",
      endTime: "11:15",
      durationMinutes: 45,
      status: "waiting",
      isPaid: false,
      isVip: false,
      hasNotes: true,
    },
    {
      id: "apt-3",
      clientName: "Thiago Ventura",
      serviceName: "Corte + Barba + Sobrancelha",
      startTime: "14:00",
      endTime: "15:30",
      durationMinutes: 90,
      status: "in_progress",
      isPaid: false,
      isVip: true,
      hasNotes: true,
    },
  ];

  const [selectedSlotTime, setSelectedSlotTime] = useState("14:30");

  const mockDayTimeSlots = [
    // Manhã
    { time: "08:30", status: "occupied" },
    { time: "09:00", status: "available" },
    { time: "09:30", status: "available" },
    { time: "10:00", status: "available" },
    { time: "10:30", status: "occupied" },
    { time: "11:00", status: "held" }, // Simula outro cliente fazendo checkout!
    { time: "11:30", status: "available" },

    // Tarde
    { time: "13:30", status: "available" },
    { time: "14:00", status: "occupied" },
    { time: "14:30", status: "available" },
    { time: "15:00", status: "available" },
    { time: "15:30", status: "available" },
    { time: "16:00", status: "occupied" },
    { time: "16:30", status: "available" },
    { time: "17:00", status: "available" },

    // Noite
    { time: "18:00", status: "available" },
    { time: "18:30", status: "available" },
    { time: "19:00", status: "occupied" },
    { time: "19:30", status: "available" },
  ];

  // Equipe da Barbearia
  const mockBarbersList = [
    {
      id: "barber-carlos",
      name: "Carlos Silva",
      role: "Master Barber",
      avatar: "CS",
      breaks: [{ startTime: "12:00", endTime: "13:00", label: "Almoço" }],
    },
    {
      id: "barber-marcos",
      name: "Marcos Vinicius",
      role: "Especialista Degradê",
      avatar: "MV",
      breaks: [{ startTime: "13:00", endTime: "14:00", label: "Almoço" }],
    },
    {
      id: "barber-tiago",
      name: "Tiago Santos",
      role: "Barba & Navalha",
      avatar: "TS",
      breaks: [{ startTime: "12:30", endTime: "13:30", label: "Almoço" }],
    },
  ];

  // Agendamentos distribuídos entre os barbeiros
  const mockGlobalAppointments = [
    // Cortes do Carlos
    {
      id: "apt-1",
      barberId: "barber-carlos",
      clientName: "Rodrigo Faro",
      serviceName: "Corte Degradê Navalhado",
      startTime: "09:00",
      endTime: "10:00",
      durationMinutes: 60,
      status: "confirmed",
      isPaid: true,
      isVip: true,
    },
    {
      id: "apt-2",
      barberId: "barber-carlos",
      clientName: "Guilherme Boulos",
      serviceName: "Barba Terapia Completa",
      startTime: "10:30",
      endTime: "11:15",
      durationMinutes: 45,
      status: "waiting",
      isPaid: false,
      isDelayed: true,
    },
    // Cortes do Marcos
    {
      id: "apt-3",
      barberId: "barber-marcos",
      clientName: "Lucas Lima",
      serviceName: "Corte na Tesoura + Lavagem",
      startTime: "08:30",
      endTime: "09:30",
      durationMinutes: 60,
      status: "in_progress",
      isPaid: false,
    },
    {
      id: "apt-4",
      barberId: "barber-marcos",
      clientName: "Fernando Rocha",
      serviceName: "Combo Cabelo + Barba",
      startTime: "14:30",
      endTime: "16:00",
      durationMinutes: 90,
      status: "confirmed",
      isPaid: true,
      isVip: true,
    },
    // Cortes do Tiago
    {
      id: "apt-5",
      barberId: "barber-tiago",
      clientName: "Eduardo Costa",
      serviceName: "Pigmentação de Barba",
      startTime: "10:00",
      endTime: "10:45",
      durationMinutes: 45,
      status: "completed",
      isPaid: true,
    },
  ];

  // Estado para controlar os serviços selecionados
  const [selectedServiceIds, setSelectedServiceIds] = useState(["serv-1"]);

  const handleToggleService = (service) => {
    setSelectedServiceIds((prev) =>
      prev.includes(service.id)
        ? prev.filter((id) => id !== service.id)
        : [...prev, service.id],
    );
  };

  // Catálogo completo com várias categorias para teste
  const mockCatalogServices = [
    {
      id: "s1",
      name: "Corte Degradê Navalhado",
      description:
        "Acabamento na navalha, lavagem refrescante e pomada modeladora.",
      category: "Cabelo",
      durationMinutes: 40,
      price: 55,
      tag: "Mais Pedido ⭐",
    },
    {
      id: "s2",
      name: "Barboterapia Tradicional",
      description:
        "Toalha quente com óleos essenciais e alinhamento na navalha.",
      category: "Barba",
      durationMinutes: 30,
      price: 45,
    },
    {
      id: "s3",
      name: "Design de Sobrancelha na Navalha",
      description: "Alinhamento e limpeza precisa dos fios faciais.",
      category: "Acabamento",
      durationMinutes: 15,
      price: 25,
    },
    {
      id: "s4",
      name: "Pigmentação de Barba",
      description: "Disfarce de falhas e fios brancos com efeito natural.",
      category: "Barba",
      durationMinutes: 25,
      price: 35,
    },
    {
      id: "s5",
      name: "Hidratação & Lavagem Especial",
      description: "Tratamento de couro cabeludo com massagem relaxante.",
      category: "Tratamentos",
      durationMinutes: 20,
      price: 30,
    },
    {
      id: "s6",
      name: "Combo VIP: Cabelo + Barba + Sobrancelha",
      description: "Pacote completo com café ou cerveja artesanal cortesia.",
      category: "Combos",
      durationMinutes: 80,
      price: 110,
      tag: "Melhor Custo-Benefício",
    },
  ];

  // Estado que armazena os serviços que o cliente selecionou
  const [cartServices, setCartServices] = useState([
    mockCatalogServices[0], // Começa com o Degradê pré-selecionado
    mockCatalogServices[1], // e a Barboterapia
  ]);

  // Lista completa de barbeiros da equipe
  const mockTeamList = [
    {
      id: "any",
      name: "Qualquer Barbeiro",
      role: "Primeiro horário livre disponível",
      isAnyProfessional: true,
      isAvailable: true,
      nextAvailableSlot: "Encaixe mais rápido",
      specialties: ["Maior Rapidez", "Sem Espera"],
    },
    {
      id: "carlos",
      name: "Carlos Silva",
      role: "Master Barber & Visagista",
      avatar: "CS",
      rating: 4.9,
      reviewCount: 168,
      isAvailable: true,
      nextAvailableSlot: "Hoje às 14:30",
      specialties: ["Degradê Navalhado", "Barboterapia", "Tesoura"],
    },
    {
      id: "marcos",
      name: "Marcos Vinicius",
      role: "Especialista em Cabelos Crespos e Químicas",
      avatar: "MV",
      rating: 4.8,
      reviewCount: 94,
      isAvailable: true,
      nextAvailableSlot: "Hoje às 15:00",
      specialties: ["Pigmentação", "Platinado", "Desenhos na Navalha"],
    },
    {
      id: "tiago",
      name: "Tiago Santos",
      role: "Barbeiro Tradicional",
      avatar: "TS",
      rating: 4.7,
      reviewCount: 82,
      isAvailable: false, // Sem horários hoje
      nextAvailableSlot: "Apenas amanhã às 09h",
      specialties: ["Corte Clássico", "Barba Alinhada"],
    },
  ];

  // Barbeiro selecionado
  const [selectedBarberId, setSelectedBarberId] = useState("carlos");

  // Escala inicial de trabalho semanal
  const [barberSchedule, setBarberSchedule] = useState([
    {
      dayId: "seg",
      label: "Segunda-feira",
      active: true,
      start: "09:00",
      end: "19:00",
      breakStart: "12:00",
      breakEnd: "13:00",
    },
    {
      dayId: "ter",
      label: "Terça-feira",
      active: true,
      start: "09:00",
      end: "19:00",
      breakStart: "12:00",
      breakEnd: "13:00",
    },
    {
      dayId: "qua",
      label: "Quarta-feira",
      active: true,
      start: "09:00",
      end: "19:00",
      breakStart: "12:00",
      breakEnd: "13:00",
    },
    {
      dayId: "qui",
      label: "Quinta-feira",
      active: true,
      start: "09:00",
      end: "20:00",
      breakStart: "12:30",
      breakEnd: "13:30",
    },
    {
      dayId: "sex",
      label: "Sexta-feira",
      active: true,
      start: "09:00",
      end: "20:00",
      breakStart: "12:30",
      breakEnd: "13:30",
    },
    {
      dayId: "sab",
      label: "Sábado",
      active: true,
      start: "08:30",
      end: "18:00",
      breakStart: "12:00",
      breakEnd: "13:00",
    },
    {
      dayId: "dom",
      label: "Domingo",
      active: false,
      start: "09:00",
      end: "14:00",
      breakStart: "",
      breakEnd: "",
    },
  ]);

  // Fila de Espera em Tempo Real da Recepção
  const [waitlist, setWaitlist] = useState([
    {
      id: "q-1",
      position: 1,
      clientName: "Bruno Henrique",
      serviceName: "Corte Degradê + Barboterapia",
      entryTimeAgo: "12 min atrás",
      estimatedWaitMinutes: 5,
      priority: "vip",
      status: "called", // Já foi chamado pelo barbeiro!
      phone: "(11) 98765-4321",
    },
    {
      id: "q-2",
      position: 2,
      clientName: "Seu Geraldo Silva",
      serviceName: "Corte Tradicional na Tesoura",
      entryTimeAgo: "18 min atrás",
      estimatedWaitMinutes: 15,
      priority: "legal", // Idoso / Prioridade Legal
      status: "waiting",
      phone: "(11) 97654-3210",
    },
    {
      id: "q-3",
      position: 3,
      clientName: "Matheus Pereira",
      serviceName: "Barba Alinhada na Navalha",
      entryTimeAgo: "5 min atrás",
      estimatedWaitMinutes: 35,
      priority: "normal",
      status: "waiting",
      phone: "(11) 91234-5678",
    },
  ]);

  // Catálogo de Produtos do Bar e Vitrine
  const mockPosProducts = [
    {
      id: "p1",
      name: "Cerveja IPA Artesanal",
      category: "Bar",
      icon: "🍺",
      price: 16,
      stock: 12,
      variants: [
        { name: "Lata 350ml", price: 16 },
        { name: "Long Neck 600ml", price: 24 },
      ],
    },
    {
      id: "p2",
      name: "Pomada Modeladora Efeito Matte",
      category: "Vitrine",
      icon: "🧴",
      price: 45,
      stock: 2, // Estoque Baixo!
      commissionPercent: 15,
      variants: [
        { name: "50g", price: 45 },
        { name: "100g (Pro)", price: 70 },
      ],
    },
    {
      id: "p3",
      name: "Café Expresso Grão Especial",
      category: "Bar",
      icon: "☕",
      price: 6,
      stock: 50,
    },
    {
      id: "p4",
      name: "Óleo para Barba Wood & Spice",
      category: "Vitrine",
      icon: "💧",
      price: 38,
      stock: 0, // Esgotado!
      commissionPercent: 10,
    },
  ];

  // Contador de itens na comanda simulada
  const [comandaProductCounts, setComandaProductCounts] = useState({ p1: 1 });

  // Estado de Comanda Aberta com Serviços + Bar
  const [activeComanda, setActiveComanda] = useState({
    id: "CMD-1042",
    clientName: "Rodrigo Faro",
    clientPhone: "(11) 98765-4321",
    barberName: "Carlos Silva",
    status: "open",
    openedAt: "14:15",
    services: [
      {
        id: "s1",
        name: "Corte Degradê Navalhado",
        price: 55,
        barberCommission: 27.5,
      },
      {
        id: "s2",
        name: "Barboterapia Tradicional",
        price: 45,
        barberCommission: 22.5,
      },
    ],
    products: [
      {
        id: "p1",
        name: "Cerveja IPA Artesanal (Lata)",
        quantity: 2,
        unitPrice: 16,
        total: 32,
        sellerCommission: 3.2,
      },
      {
        id: "p2",
        name: "Pomada Matte (50g)",
        quantity: 1,
        unitPrice: 45,
        total: 45,
        sellerCommission: 4.5,
      },
    ],
  });

  // Estado para testar o cartão fidelidade
  const [userStamps, setUserStamps] = useState(7); // Começa com 7 de 10 selos

  // Dados do histórico do cliente Rodrigo Faro
  const mockClientTimelineEvents = [
    {
      id: "ev-1",
      date: "28/08/2026",
      type: "service",
      title: "Corte Degradê Navalhado + Barboterapia",
      barberName: "Carlos Silva",
      totalPrice: 100,
      notes:
        "Pente 1 disfarçado nas laterais, tesoura no topo. Cliente elogiou a toalha quente.",
    },
    {
      id: "ev-2",
      date: "12/08/2026",
      type: "product",
      title: "Compra no Balcão: 1x Pomada Matte (50g)",
      totalPrice: 45,
      notes: "Levou a pomada efeito seco para modelar em casa.",
    },
    {
      id: "ev-3",
      date: "25/07/2026",
      type: "service",
      title: "Corte Degradê + Sobrancelha",
      barberName: "Carlos Silva",
      totalPrice: 75,
      notes: "Fez risco na sobrancelha esquerda a pedido do cliente.",
    },
    {
      id: "ev-4",
      date: "05/07/2026",
      type: "no_show",
      title: "Horário Agendado - Não Compareceu (Falta)",
      barberName: "Tiago Santos",
      totalPrice: 0,
      notes: "Avisou com atraso que teve imprevisto no trânsito.",
    },
  ];

  // Estado do Modo Privacidade nos Dashboards
  const [isPrivacyModeActive, setIsPrivacyModeActive] = useState(false);

  // Dados Semanais (Segunda a Domingo)
  const mockWeeklyRevenue = [
    { label: "Seg", fullLabel: "Segunda-feira", services: 420, products: 120 },
    { label: "Ter", fullLabel: "Terça-feira", services: 580, products: 160 },
    { label: "Qua", fullLabel: "Quarta-feira", services: 650, products: 180 },
    { label: "Qui", fullLabel: "Quinta-feira", services: 920, products: 280 },
    { label: "Sex", fullLabel: "Sexta-feira", services: 1450, products: 450 },
    { label: "Sáb", fullLabel: "Sábado", services: 1850, products: 550 },
    {
      label: "Dom",
      fullLabel: "Domingo (Folga)",
      services: 0,
      products: 0,
      isClosed: true,
    },
  ];

  // Dados Mensais (4 Semanas do Mês)
  const mockMonthlyRevenue = [
    {
      label: "Sem 1",
      fullLabel: "Semana 1 (01 a 07)",
      services: 4200,
      products: 1100,
    },
    {
      label: "Sem 2",
      fullLabel: "Semana 2 (08 a 14)",
      services: 5100,
      products: 1400,
    },
    {
      label: "Sem 3",
      fullLabel: "Semana 3 (15 a 21)",
      services: 4800,
      products: 1250,
    },
    {
      label: "Sem 4",
      fullLabel: "Semana 4 (22 a 31)",
      services: 6200,
      products: 1800,
    },
  ];

  // Dados Anuais (Meses do Ano)
  const mockYearlyRevenue = [
    { label: "Jan", fullLabel: "Janeiro", services: 18000, products: 4200 },
    { label: "Fev", fullLabel: "Fevereiro", services: 21000, products: 5400 },
    { label: "Mar", fullLabel: "Março", services: 19500, products: 4800 },
    { label: "Abr", fullLabel: "Abril", services: 22000, products: 5900 },
    { label: "Mai", fullLabel: "Maio", services: 24500, products: 6800 },
    { label: "Jun", fullLabel: "Junho", services: 26000, products: 7200 },
  ];

  // Estado da comissão semanal de Carlos Silva
  const [carlosCommission, setCarlosCommission] = useState({
    grossServices: 2400,
    serviceCommissionPercent: 50,
    servicesCommission: 1200,
    grossProducts: 380,
    productCommissionPercent: 10,
    productsCommission: 38,
    paymentFeesDeduction: 32.5,
    advances: 100, // Vale de R$ 100
    netCommissionPayable: 1105.5,
    isSettled: false, // Começa como pendente a pagar
  });

  // Dados para a Tabela de Comandas do Dia
  const mockTableComandas = [
    {
      id: "CMD-1041",
      clientName: "Rodrigo Faro",
      barberName: "Carlos Silva",
      service: "Degradê + Barboterapia",
      totalPrice: 100.0,
      status: "completed",
      time: "14:30",
    },
    {
      id: "CMD-1042",
      clientName: "Guilherme Boulos",
      barberName: "Marcos Vinicius",
      service: "Corte na Tesoura",
      totalPrice: 55.0,
      status: "in_progress",
      time: "15:00",
    },
    {
      id: "CMD-1043",
      clientName: "Thiago Ventura",
      barberName: "Tiago Santos",
      service: "Barba Completa",
      totalPrice: 45.0,
      status: "confirmed",
      time: "15:30",
    },
    {
      id: "CMD-1044",
      clientName: "Felipe Titto",
      barberName: "Carlos Silva",
      service: "Combo VIP Cabelo + Barba + Chopp",
      totalPrice: 135.0,
      status: "waiting",
      time: "16:00",
    },
  ];

  // Estados da Tabela
  const [selectedComandaIds, setSelectedComandaIds] = useState(["CMD-1041"]);
  const [isTableLoading, setIsTableLoading] = useState(false);

  // Função de Teste de salvamento de informações modal (section 6)
  const handleSaveService = () => {
    const errors = {};

    // Validação do Nome do Serviço
    if (!serviceName.trim()) {
      errors.name = "O nome do serviço é obrigatório.";
    } else if (serviceName.length < 3) {
      errors.name = "O nome deve ter pelo menos 3 caracteres.";
    }

    // Validação do Preço
    if (!servicePrice.trim()) {
      errors.price = "Informe o valor do serviço.";
    } else if (Number(servicePrice) <= 0 || isNaN(Number(servicePrice))) {
      errors.price = "Insira um valor numérico válido maior que zero.";
    }

    // Se houver erros, guardamos no estado e NÃO fechamos o modal
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Se chegou aqui, os dados estão 100% corretos!
    alert(
      `Serviço cadastrado com sucesso:\n- Nome: ${serviceName}\n- Preço: R$ ${servicePrice}`,
    );

    // Limpa o formulário e fecha o modal
    setServiceName("");
    setServicePrice("");
    setFormErrors({});
    setIsModalOpen(false);
  };

  // Função para limpar os erros ao fechar no cancelar ou no "X"
  const handleCloseModal = () => {
    setServiceName("");
    setServicePrice("");
    setFormErrors({});
    setIsModalOpen(false);
  };

  return (
    <div className={designSystemStyles.pageWrapper}>
      <div className={designSystemStyles.container}>
        {/* Cabeçalho da Documentação */}
        <header className={designSystemStyles.header}>
          <h1 className={designSystemStyles.title}>Design System & UI Kit</h1>
          <p className={designSystemStyles.subtitle}>
            Catálogo de componentes reutilizáveis para o SaaS de Barbearias e
            Salões.
          </p>
        </header>

        {/* ======================================================== */}
        {/* PALETA DE CORES OFICIAL & DESIGN TOKENS                  */}
        {/* ======================================================== */}
        <section className={designSystemStyles.section}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className={designSystemStyles.sectionTitle}>
                <span>🎨</span> Paleta de Cores Oficial & Tokens de Design
              </h2>
              <p className={designSystemStyles.sectionSubtitle}>
                Escala cromática calibrada para acessibilidade WCAG, contraste
                de leitura e temas dinâmicos.
              </p>
            </div>

            {/* Alternador de Tema da Marca para Teste */}
            <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 p-1.5 rounded-xl text-xs">
              <span className="text-neutral-400 font-bold px-2">Tema:</span>
              <button
                type="button"
                onClick={() => {
                  setActiveBrandTheme("amber");
                  setBrandTheme("amber");
                }}
                className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${activeBrandTheme === "amber" ? "bg-amber-600 text-white" : "text-neutral-400 hover:text-white"}`}
              >
                Âmbar Nobre
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveBrandTheme("emerald");
                  setBrandTheme("emerald");
                }}
                className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${activeBrandTheme === "emerald" ? "bg-emerald-600 text-white" : "text-neutral-400 hover:text-white"}`}
              >
                Esmeralda
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveBrandTheme("ruby");
                  setBrandTheme("ruby");
                }}
                className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${activeBrandTheme === "ruby" ? "bg-red-600 text-white" : "text-neutral-400 hover:text-white"}`}
              >
                Rubi
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveBrandTheme("sapphire");
                  setBrandTheme("sapphire");
                }}
                className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${activeBrandTheme === "sapphire" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-white"}`}
              >
                Safira
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* 1. ESCALA DA COR PRIMÁRIA (ÂMBAR NOBRE) */}
            <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-3">
              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                1. Escala Primária Oficial: Âmbar Nobre (--brand-*)
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-11 gap-2">
                {(
                  OFFICIAL_PALETTE[activeBrandTheme] || OFFICIAL_PALETTE.amber
                ).map((item) => (
                  <div
                    key={item.token}
                    className="flex flex-col rounded-xl overflow-hidden border border-neutral-800 shadow-sm transition-all duration-300 hover:scale-105"
                  >
                    {/* Bloco de Cor com Transição Suave */}
                    <div
                      style={{ backgroundColor: item.hex }}
                      className={`h-16 p-2 flex items-end justify-between font-mono font-bold text-xs transition-colors duration-300 ${
                        item.text === "dark" ? "text-neutral-950" : "text-white"
                      }`}
                    >
                      <span>{item.label}</span>
                    </div>

                    {/* Metadados (Token, HEX e Descrição) */}
                    <div className="p-2 bg-neutral-950 text-left space-y-0.5">
                      <span className="font-mono text-[10px] text-neutral-300 block font-bold">
                        {item.hex}
                      </span>
                      <span className="text-[9px] text-neutral-500 truncate block">
                        {item.desc}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. SUPERFÍCIES & CORES SEMÂNTICAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Superfícies Dark Mode */}
              <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-3 text-left">
                <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  2. Superfícies & Fundo (Dark Mode First)
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {OFFICIAL_PALETTE.neutrals.map((item) => (
                    <div
                      key={item.token}
                      className="rounded-xl border border-neutral-800 overflow-hidden"
                    >
                      <div
                        style={{ backgroundColor: item.hex }}
                        className="h-12 p-2 flex items-center justify-center font-bold text-xs text-white border-b border-neutral-800"
                      >
                        {item.label}
                      </div>
                      <div className="p-2 bg-neutral-950">
                        <span className="font-mono text-[10px] text-neutral-400 block">
                          {item.hex}
                        </span>
                        <span className="text-[9px] text-neutral-500 block">
                          {item.desc}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cores Semânticas de Negócio */}
              <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-3 text-left">
                <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  3. Cores de Status do Negócio
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {OFFICIAL_PALETTE.semantics.map((item) => (
                    <div
                      key={item.token}
                      className="rounded-xl border border-neutral-800 overflow-hidden"
                    >
                      <div
                        style={{ backgroundColor: item.hex }}
                        className={`h-12 p-2 flex items-center justify-center font-bold text-xs ${
                          item.text === "dark"
                            ? "text-neutral-950"
                            : "text-white"
                        }`}
                      >
                        {item.label}
                      </div>
                      <div className="p-2 bg-neutral-950">
                        <span className="font-mono text-[10px] text-neutral-400 block">
                          {item.hex}
                        </span>
                        <span className="text-[9px] text-neutral-500 block">
                          {item.desc}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 1. SEÇÃO DE BOTÕES */}
        <section className={designSystemStyles.section}>
          <div>
            <h2 className={designSystemStyles.sectionTitle}>
              <span>🔘</span> Botões (Buttons)
            </h2>
            <p className={designSystemStyles.sectionSubtitle}>
              Variantes visuais e estados interativos (Hover, Disabled,
              Loading).
            </p>
          </div>

          <div className={designSystemStyles.componentRow}>
            <Button variant="primary">Primary (Ação Principal)</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="danger">Danger (Excluir)</Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
            <Button
              variant="primary"
              isLoading={loading}
              onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 2000);
              }}
            >
              Testar Loading
            </Button>
          </div>
        </section>

        {/* 2. SEÇÃO DE INPUTS */}
        <section className={designSystemStyles.section}>
          <div>
            <h2 className={designSystemStyles.sectionTitle}>
              <span>📝</span> Campos de Texto (Inputs)
            </h2>
            <p className={designSystemStyles.sectionSubtitle}>
              Tratamento de labels, dicas de preenchimento, mensagens de erro e
              máscaras.
            </p>
          </div>

          <div className={designSystemStyles.gridTwoColumns}>
            {/* Input Padrão */}
            <Input
              label="Nome do Barbeiro"
              placeholder="Ex: Carlos Oliveira"
              helperText="Insira o nome completo do profissional."
            />

            {/* Input com Máscara de Telefone/WhatsApp */}
            <Input
              label="WhatsApp do Cliente (Com Máscara)"
              mask="phone"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              helperText="Formatação automática de DDD e hífen."
            />

            {/* Input com Máscara de CPF */}
            <Input
              label="CPF do Dono da Barbearia (Com Máscara)"
              mask="cpf"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              helperText="Formatação automática de pontos e traço."
            />

            {/* Input com Erro Visual */}
            <Input
              label="E-mail com Erro"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              error="O formato de e-mail informado é inválido."
            />

            {/* Input de Senha */}
            <Input
              label="Senha de Acesso"
              type="password"
              placeholder="••••••••"
              helperText="Mínimo de 8 caracteres alfanuméricos."
            />

            {/* Input Bloqueado / Desabilitado */}
            <Input
              label="Código do Tenant (Bloqueado)"
              value="BARB-2026-SP"
              disabled
              helperText="Identificador único da barbearia no banco de dados."
            />
          </div>
        </section>

        {/* 3. SEÇÃO DE CARDS */}
        <section className={designSystemStyles.section}>
          <div>
            <h2 className={designSystemStyles.sectionTitle}>
              <span>📦</span> Cartões (Cards)
            </h2>
            <p className={designSystemStyles.sectionSubtitle}>
              Contêineres estruturais para agrupar informações relacionadas.
            </p>
          </div>

          <div className={designSystemStyles.gridTwoColumns}>
            <Card
              title="Card Padrão com Título"
              description="Ideal para formulários ou blocos de configuração."
            >
              <p className="text-sm text-neutral-300">
                Este card utiliza o cabeçalho automático com título dourado e
                linha divisória sutil.
              </p>
            </Card>

            <Card>
              <p className="text-sm text-neutral-300">
                Este é um <strong>Card simples sem cabeçalho</strong>, útil para
                listagens rápidas, métricas de faturamento ou itens de lista.
              </p>
            </Card>
          </div>
        </section>

        {/* 4. SEÇÃO DE ALERTAS & FEEDBACK */}
        <section className={designSystemStyles.section}>
          <div>
            <h2 className={designSystemStyles.sectionTitle}>
              <span>🔔</span> Alertas & Mensagens de Feedback
            </h2>
            <p className={designSystemStyles.sectionSubtitle}>
              Comunicação clara de erros, sucessos e avisos importantes de
              agendamento.
            </p>
          </div>

          <div className="space-y-3">
            <Alert variant="info" title="Horário de Almoço">
              A barbearia realiza pausa de atendimento entre 12:00 e 13:30.
            </Alert>

            <Alert variant="success" title="Agendamento Confirmado!">
              O horário com o barbeiro Pedro foi reservado com sucesso para hoje
              às 15h.
            </Alert>

            <Alert
              variant="warning"
              title="Atenção ao Cancelamento"
              onClose={() => alert("Alerta fechado!")}
            >
              Cancelamentos com menos de 2 horas de antecedência cobram taxa de
              30%.
            </Alert>

            <Alert variant="error" title="Horário Indisponível">
              Este horário acabou de ser preenchido por outro cliente. Por
              favor, escolha outro.
            </Alert>
          </div>
        </section>

        {/* 5. SEÇÃO DE TOGGLES / SWITCHES */}
        <section className={designSystemStyles.section}>
          <div>
            <h2 className={designSystemStyles.sectionTitle}>
              <span>⚡</span> Chaves de Configuração (Toggles / Switches)
            </h2>
            <p className={designSystemStyles.sectionSubtitle}>
              Controles binários para ativação e desativação instantânea de
              recursos.
            </p>
          </div>

          <div className="max-w-md bg-neutral-900 border border-neutral-800 rounded-xl p-5 divide-y divide-neutral-800/60">
            <Toggle
              label="Notificações via WhatsApp"
              description="Disparar aviso automático ao cliente 2 horas antes do corte."
              checked={whatsappNotify}
              onChange={setWhatsappNotify}
            />

            <Toggle
              label="Agendamento Online Público"
              description="Permitir que clientes agendem pelo link da sua barbearia."
              checked={onlineBooking}
              onChange={setOnlineBooking}
            />

            <Toggle
              label="Aceitar Pagamento via PIX (Recurso Pro)"
              description="Disponível apenas no plano Premium da plataforma."
              checked={false}
              disabled={true}
            />

            <Toggle
              label="Criando um toggle para testar"
              description="Quando precisar incluir um toggle na pagina"
              checked={testandoToggle}
              onChange={settestandoToggle}
            />
          </div>
        </section>

        {/* 6. SEÇÃO DE MODAL */}
        <section className={designSystemStyles.section}>
          <div>
            <h2 className={designSystemStyles.sectionTitle}>
              <span>🪟</span> Janelas Modais (Dialogs)
            </h2>
            <p className={designSystemStyles.sectionSubtitle}>
              Caixas de diálogo para confirmações críticas, formulários rápidos
              e avisos.
            </p>
          </div>

          <div>
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              Abrir Modal de Exemplo
            </Button>
          </div>

          {/* O componente Modal integrado com nossos próprios Buttons e Inputs */}
          <Modal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            title="Adicionar Novo Serviço"
            footer={
              <>
                <Button variant="secondary" onClick={handleCloseModal}>
                  Cancelar
                </Button>
                <Button variant="primary" onClick={handleSaveService}>
                  Salvar Serviço
                </Button>
              </>
            }
          >
            <p className="text-neutral-400 text-xs">
              Preencha os dados do serviço para disponibilizá-lo na grade de
              agendamentos.
            </p>

            <Input
              label="Nome do Serviço"
              placeholder="Ex: Corte Degradê + Barboterapia"
              value={serviceName}
              onChange={(e) => {
                setServiceName(e.target.value);
                // Limpa o erro assim que o usuário começa a corrigir
                if (formErrors.name)
                  setFormErrors({ ...formErrors, name: null });
              }}
              error={formErrors.name}
            />

            <Input
              label="Preço Sugerido (R$)"
              type="number"
              placeholder="65"
              value={servicePrice}
              onChange={(e) => {
                setServicePrice(e.target.value);
                // Limpa o erro assim que o usuário começa a corrigir
                if (formErrors.price)
                  setFormErrors({ ...formErrors, price: null });
              }}
              error={formErrors.price}
            />
          </Modal>
        </section>

        {/* 7. SEÇÃO DE BOTÕES DE NAVEGAÇÃO / ÍCONE */}
        <section className={designSystemStyles.section}>
          <div>
            <h2 className={designSystemStyles.sectionTitle}>
              <span>↔️</span> Botões de Navegação (Setas de Calendário)
            </h2>
            <p className={designSystemStyles.sectionSubtitle}>
              Botões de ícone com área de toque acessível para alternar datas e
              meses.
            </p>
          </div>

          <div className="flex items-center gap-6 p-4 bg-neutral-900 border border-neutral-800 rounded-xl max-w-sm justify-between">
            {/* Botão Voltar */}
            <IconButton
              direction="prev"
              variant="solid"
              ariaLabel="Mês anterior"
              disabled={currentMonthIndex === 0}
              onClick={() =>
                setCurrentMonthIndex((prev) => Math.max(0, prev - 1))
              }
            />

            {/* Mês Atual Centralizado */}
            <div className="text-center">
              <span className="text-base font-bold text-amber-500">
                {months[currentMonthIndex]} 2026
              </span>
              <p className="text-xs text-neutral-400">Seletor de Período</p>
            </div>

            {/* Botão Avançar */}
            <IconButton
              direction="next"
              variant="solid"
              ariaLabel="Próximo mês"
              disabled={currentMonthIndex === months.length - 1}
              onClick={() =>
                setCurrentMonthIndex((prev) =>
                  Math.min(months.length - 1, prev + 1),
                )
              }
            />
          </div>
        </section>

        {/* 8. SEÇÃO DE RADIO BUTTONS */}
        <section className={designSystemStyles.section}>
          <div>
            <h2 className={designSystemStyles.sectionTitle}>
              <span>🔘</span> Opção Única (Radio Buttons)
            </h2>
            <p className={designSystemStyles.sectionSubtitle}>
              Seleção exclusiva de opções em formulários de agendamento e
              pagamento.
            </p>
          </div>

          <div className="max-w-md space-y-3">
            <RadioButton
              name="paymentMethod"
              value="pix"
              label="PIX Instantâneo"
              description="Confirmação em tempo real com liberação imediata do agendamento."
              checked={paymentMethod === "pix"}
              onChange={setPaymentMethod}
            />

            <RadioButton
              name="paymentMethod"
              value="credit_card"
              label="Cartão de Crédito"
              description="Pague online em até 2x sem juros."
              checked={paymentMethod === "credit_card"}
              onChange={setPaymentMethod}
            />

            <RadioButton
              name="paymentMethod"
              value="local"
              label="Pagar na Barbearia"
              description="Realize o acerto diretamente com o barbeiro após o serviço."
              checked={paymentMethod === "local"}
              onChange={setPaymentMethod}
            />

            <RadioButton
              name="paymentMethod"
              value="crypto"
              label="Criptomoedas (Indisponível)"
              description="Opção temporariamente fora de serviço."
              disabled={true}
              checked={false}
            />
          </div>
        </section>

        {/* 9. SEÇÃO DE CHECKBOXES (MÚLTIPLA SELEÇÃO) */}
        <section className={designSystemStyles.section}>
          <div>
            <h2 className={designSystemStyles.sectionTitle}>
              <span>☑️</span> Múltipla Escolha (CheckBox)
            </h2>
            <p className={designSystemStyles.sectionSubtitle}>
              Seleção independente de serviços, dias da semana e permissões.
            </p>
          </div>

          <div className="max-w-md space-y-3">
            <CheckBox
              label="Corte Tradicional / Degradê (R$ 45,00)"
              description="Duração estimada de 30 minutos. Inclui lavagem."
              checked={selectedServices.corte}
              onChange={(checked) =>
                setSelectedServices((prev) => ({ ...prev, corte: checked }))
              }
            />

            <CheckBox
              label="Barboterapia Completa (R$ 35,00)"
              description="Duração de 25 minutos. Toalha quente e massagem facial."
              checked={selectedServices.barba}
              onChange={(checked) =>
                setSelectedServices((prev) => ({ ...prev, barba: checked }))
              }
            />

            <CheckBox
              label="Design de Sobrancelha na Navalha (R$ 20,00)"
              description="Duração de 15 minutos. Alinhamento e acabamento."
              checked={selectedServices.sobrancelha}
              onChange={(checked) =>
                setSelectedServices((prev) => ({
                  ...prev,
                  sobrancelha: checked,
                }))
              }
            />

            <CheckBox
              label="Depilação Nasal com Cera (Esgotado)"
              description="Serviço indisponível no momento."
              disabled={true}
              checked={false}
            />

            {/* Resumo Dinâmico em tempo real */}
            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex justify-between items-center text-sm">
              <span className="text-neutral-400">Total dos Serviços:</span>
              <span className="text-base font-bold text-amber-500">
                R$ {totalAgendamento},00
              </span>
            </div>
          </div>
        </section>

        {/* 10. SEÇÃO DE SPLIT BUTTON (AÇÃO PRINCIPAL + AÇÕES EXTRAS) */}
        <section className={designSystemStyles.section}>
          <div>
            <h2 className={designSystemStyles.sectionTitle}>
              <span>✂️</span> Botão Dividido (SplitButton)
            </h2>
            <p className={designSystemStyles.sectionSubtitle}>
              Executa a ação primária ou abre atalhos rápidos com um único
              clique.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* SplitButton Variante Principal (Primary) */}
            <SplitButton
              variant="primary"
              onClick={() => alert("Ação Principal: Agendamento Realizado!")}
              options={[
                {
                  label: "Agendar e Notificar via WhatsApp",
                  icon: "💬",
                  onClick: () => alert("Agendado + WhatsApp enviado!"),
                },
                {
                  label: "Salvar como Rascunho",
                  icon: "📝",
                  onClick: () => alert("Rascunho salvo temporariamente!"),
                },
                {
                  label: "Repetir Semanalmente (Recorrente)",
                  icon: "🔁",
                  onClick: () => alert("Agendamento recorrente ativado!"),
                },
              ]}
            >
              Confirmar Agendamento
            </SplitButton>

            {/* SplitButton Variante Secundária (Secondary) */}
            <SplitButton
              variant="secondary"
              onClick={() => alert("Relatório Gerado!")}
              options={[
                {
                  label: "Exportar como PDF",
                  icon: "📄",
                  onClick: () => alert("Baixando PDF..."),
                },
                {
                  label: "Exportar como Excel (.xlsx)",
                  icon: "📊",
                  onClick: () => alert("Baixando Excel..."),
                },
              ]}
            >
              Exportar Relatório
            </SplitButton>
          </div>
        </section>

        {/* 11. SEÇÃO DO FAB */}
        <section className={designSystemStyles.section}>
          <div>
            <h2 className={designSystemStyles.sectionTitle}>
              <span>✨</span> Botão Flutuante (FAB)
            </h2>
            <p className={designSystemStyles.sectionSubtitle}>
              Ação primária de alta prioridade acessível de qualquer ponto da
              tela.
            </p>
          </div>

          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl max-w-md">
            <p className="text-xs text-neutral-400 leading-relaxed">
              O botão flutuante com a etiqueta{" "}
              <strong>"+ Novo Agendamento"</strong> está ativo e posicionado
              fixamente no canto inferior direito da tela.
            </p>
          </div>
        </section>

        {/* 👇 AQUI ESTÁ ELE! Coloque logo abaixo da última section: */}
        <Fab label="Novo Agendamento" onClick={() => setIsModalOpen(true)} />

        {/* 12. SEÇÃO DE SELECT / DROPDOWN */}
        <section className={designSystemStyles.section}>
          <div>
            <h2 className={designSystemStyles.sectionTitle}>
              <span>📋</span> Caixas de Seleção (Select / Dropdown)
            </h2>
            <p className={designSystemStyles.sectionSubtitle}>
              Seleção de opções em listas fechadas com suporte a erro e
              placeholder.
            </p>
          </div>

          <div className={designSystemStyles.gridTwoColumns}>
            {/* Select de Barbeiro */}
            <Select
              label="Profissional Responsável"
              placeholder="Escolha o barbeiro..."
              value={selectedBarber}
              onChange={(e) => setSelectedBarber(e.target.value)}
              helperText="O cliente verá a agenda específica deste profissional."
              options={[
                { value: "any", label: "Qualquer Barbeiro Disponível" },
                {
                  value: "marcos",
                  label: "Marcos Silva (Especialista em Degradê)",
                },
                {
                  value: "tiago",
                  label: "Tiago Santos (Barboterapia & Navalha)",
                },
                {
                  value: "lucas",
                  label: "Lucas Costa (Férias)",
                  disabled: true,
                },
              ]}
            />

            {/* Select com Erro de Validação */}
            <Select
              label="Unidade / Filial (Com Erro)"
              placeholder="Selecione o local de atendimento..."
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              error="Você precisa selecionar a filial onde o corte será realizado."
              options={[
                { value: "jardins", label: "Unidade Jardins - SP" },
                { value: "centro", label: "Unidade Centro - SP" },
                { value: "moema", label: "Unidade Moema - SP" },
              ]}
            />
          </div>
        </section>

        {/* 13. SEÇÃO DE CALENDÁRIO & HORÁRIOS */}
        <section className={designSystemStyles.section}>
          <div>
            <h2 className={designSystemStyles.sectionTitle}>
              <span>📅</span> Calendário & Grade de Horários (Date & Time
              Picker)
            </h2>
            <p className={designSystemStyles.sectionSubtitle}>
              Motor de agendamento com bloqueio de datas passadas e slots de
              horário.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* O Componente DatePicker */}
            <DatePicker
              selectedDate={bookingDate}
              onSelectDate={setBookingDate}
              selectedTime={bookingTime}
              onSelectTime={setBookingTime}
              availableTimes={scheduleSlots}
            />

            {/* Card com o Resumo da Seleção em Tempo Real */}
            <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xs w-full space-y-4">
              <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider">
                Resumo do Agendamento
              </h3>

              <div className="space-y-2 text-xs text-neutral-300">
                <p>
                  <strong className="text-white">Data:</strong>{" "}
                  {bookingDate
                    ? bookingDate.toLocaleDateString("pt-BR")
                    : "Nenhuma"}
                </p>
                <p>
                  <strong className="text-white">Horário:</strong>{" "}
                  {bookingTime ? `${bookingTime}h` : "Nenhum"}
                </p>
                <p>
                  <strong className="text-white">Status do Slot:</strong>{" "}
                  <span className="text-emerald-400 font-semibold">
                    Liberado para Reserva
                  </span>
                </p>
              </div>

              <Button
                variant="primary"
                className="w-full"
                disabled={!bookingDate || !bookingTime}
                onClick={() =>
                  alert(
                    `Reserva confirmada para ${bookingDate.toLocaleDateString("pt-BR")} às ${bookingTime}h!`,
                  )
                }
              >
                Confirmar Reserva
              </Button>
            </div>
          </div>
        </section>

        {/* 14. SEÇÃO DE CAMPO DE BUSCA (SEARCH INPUT) */}
        <section className={designSystemStyles.section}>
          <div>
            <h2 className={designSystemStyles.sectionTitle}>
              <span>🔍</span> Campo de Busca Inteligente (SearchInput)
            </h2>
            <p className={designSystemStyles.sectionSubtitle}>
              Filtro em tempo real com botão de limpeza rápida e atalho visual.
            </p>
          </div>

          <div className="max-w-lg space-y-4">
            {/* O Componente SearchInput */}
            <SearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar serviço por nome ou categoria..."
            />

            {/* Lista Filtrada em Tempo Real */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800/80 overflow-hidden">
              {filteredServices.length > 0 ? (
                filteredServices.map((service) => (
                  <div
                    key={service.id}
                    className="p-3.5 flex items-center justify-between hover:bg-neutral-800/40 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-100">
                        {service.name}
                      </p>
                      <span className="text-[11px] text-neutral-400 uppercase tracking-wider">
                        {service.category}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-amber-500">
                      {service.price}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-neutral-500">
                  Nenhum serviço encontrado para "<strong>{searchTerm}</strong>
                  ".
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 15. SEÇÃO DE MENU LATERAL (SIDEBAR / DRAWER) */}
        <section className={designSystemStyles.section}>
          <div>
            <h2 className={designSystemStyles.sectionTitle}>
              <span>🧭</span> Menu Lateral de Gestão (Sidebar &
              NavigationDrawer)
            </h2>
            <p className={designSystemStyles.sectionSubtitle}>
              Navegação principal com isolamento de Tenant, selo de plano e
              rodapé de usuário.
            </p>
          </div>

          <div className="space-y-4">
            {/* Botão para testar o Drawer Mobile */}
            <div className="flex items-center gap-3">
              <Button variant="primary" onClick={() => setIsSidebarOpen(true)}>
                <span>🍔</span> Abrir Sidebar no Modo Gaveta (Mobile Drawer)
              </Button>
              <span className="text-xs text-neutral-400">
                Item selecionado agora:{" "}
                <strong className="text-amber-500 capitalize">
                  {activeMenuItem}
                </strong>
              </span>
            </div>

            {/* Pré-visualização Embutida da Sidebar */}
            <div className="border border-neutral-800 rounded-2xl overflow-hidden max-w-xs shadow-2xl h-[520px]">
              <Sidebar
                tenantName="Barbearia Vintage Club"
                tenantPlan="Plano Multi-Unidades"
                items={navigationMenuItems}
                activeItem={activeMenuItem}
                onSelect={setActiveMenuItem}
                user={{ name: "Carlos Barbeiro", role: "Master Barber" }}
                onLogout={() => alert("Simulação de Logout!")}
              />
            </div>
          </div>
        </section>
      </div>
      {/* Gaveta Mobile da Sidebar para teste em tela cheia */}
      <div className="md:hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          tenantName="Barbearia Vintage Club"
          tenantPlan="Plano Multi-Unidades"
          items={navigationMenuItems}
          activeItem={activeMenuItem}
          onSelect={setActiveMenuItem}
          user={{ name: "Carlos Barbeiro", role: "Master Barber" }}
          onLogout={() => alert("Logout!")}
        />
      </div>

      {/* 16. SEÇÃO DE BARRA DE NAVEGAÇÃO SUPERIOR (NAVBAR) */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>🧭</span> Barra de Navegação Superior (Navbar)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Duas experiências especializadas: Painel de Gestão Operacional e
            Interface do Cliente.
          </p>
        </div>

        <div className="space-y-6">
          {/* 1. VISÃO DO GESTOR / BARBEIRO */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              1. Visão do Gestor / Barbeiro (Desktop & Tablet)
            </span>
            <div className="border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
              <Navbar
                variant="admin"
                breadcrumbs={["Agenda", "Barbearia Vintage", "Visão Geral"]}
                selectedBranch={activeBranchId}
                onSelectBranch={setActiveBranchId}
                barberStatus={currentBarberStatus}
                onStatusChange={setCurrentBarberStatus}
                notificationsCount={4}
                onQuickAction={() => setIsModalOpen(true)}
                onNotificationsClick={() =>
                  alert("Você tem 4 notificações não lidas!")
                }
                onMenuClick={() => setIsSidebarOpen(true)}
                onLogout={() => alert("Simulação de Logout!")}
              />
              <div className="p-6 bg-neutral-950/60 text-center text-xs text-neutral-500">
                Área de conteúdo da tela (a Navbar fica fixa no topo).
              </div>
            </div>
          </div>

          {/* 2. VISÃO DO CLIENTE FINAL */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              2. Visão do Cliente Final (Web App / Mobile)
            </span>
            <div className="border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
              <Navbar
                variant="client"
                user={{
                  name: "Lucas Mendes",
                  avatar: "LM",
                  loyaltyPoints: 250,
                }}
                onQuickAction={() =>
                  alert("Abrindo fluxo de agendamento do cliente!")
                }
                onNotificationsClick={() =>
                  alert("Lembrete: Seu corte é hoje às 16:30h!")
                }
              />
              <div className="p-6 bg-neutral-950/60 text-center text-xs text-neutral-500">
                Catálogo público de serviços e agendamentos para o cliente.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 17. SEÇÃO DE NAVEGAÇÃO INFERIOR (BOTTOM NAVIGATION) */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>📱</span> Menu Inferior Mobile (BottomNavigation)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Navegação ergonômica voltada para a zona do polegar no celular do
            cliente.
          </p>
        </div>

        <div className="flex flex-col items-center">
          {/* Mockup de Celular / Smartphone */}
          <div className="w-full max-w-[340px] bg-neutral-950 border-4 border-neutral-800 rounded-[32px] overflow-hidden shadow-2xl flex flex-col h-[560px] relative">
            {/* Notch / Câmera frontal do celular */}
            <div className="w-32 h-4 bg-neutral-800 rounded-b-xl mx-auto shrink-0 mb-2" />

            {/* Área interna da tela do celular */}
            <div className="flex-1 px-4 py-2 overflow-y-auto space-y-3 text-left">
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl">
                <span className="text-[11px] font-semibold text-amber-500 uppercase">
                  Próximo Corte Hoje
                </span>
                <p className="text-xs font-bold text-white mt-1">
                  Corte Degradê + Barboterapia
                </p>
                <p className="text-[11px] text-neutral-400">
                  Às 16:30 com Barbeiro Carlos
                </p>
              </div>

              <div className="p-3 bg-amber-600/10 border border-amber-500/20 rounded-xl">
                <span className="text-xs font-bold text-amber-400">
                  ⭐ Clube Fidelidade
                </span>
                <p className="text-[11px] text-neutral-300 mt-0.5">
                  Faltam apenas 2 cortes para você ganhar um corte grátis!
                </p>
              </div>

              <div className="p-4 text-center">
                <p className="text-xs text-neutral-500">
                  Aba ativa no momento:{" "}
                  <strong className="text-amber-500 uppercase">
                    {activeClientTab}
                  </strong>
                </p>
              </div>
            </div>

            {/* O Componente BottomNavigation no rodapé do celular */}
            <BottomNavigation
              fixed={false} // Mantém dentro do mockup de celular
              items={clientNavTabs}
              activeItem={activeClientTab}
              onChange={setActiveClientTab}
            />
          </div>
        </div>
      </section>

      {/* 18. SEÇÃO DE ABAS DE CONTEÚDO (TABS) */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>📑</span> Abas de Navegação Local (Tabs)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Divisão de fluxos densos em blocos instantâneos sem recarregar a
            tela.
          </p>
        </div>

        <div className="space-y-8">
          {/* 1. VARIANTE SUB-LINHADA (SETTINGS / PERFIL) */}
          <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              Exemplo 1: Configurações da Barbearia (Variante Line)
            </span>

            <Tabs
              variant="line"
              tabs={settingsTabs}
              activeTab={activeSettingsTab}
              onChange={setActiveSettingsTab}
            />

            {/* Bloco de Conteúdo Dinâmico conforme a Aba Clicada */}
            <div className="p-5 bg-neutral-950/70 border border-neutral-800/80 rounded-xl text-left text-sm text-neutral-300">
              {activeSettingsTab === "geral" && (
                <div>
                  <h4 className="font-bold text-white mb-1">
                    🏢 Dados da Unidade
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Edite o nome comercial, CNPJ, telefone e endereço físico da
                    barbearia.
                  </p>
                </div>
              )}
              {activeSettingsTab === "servicos" && (
                <div>
                  <h4 className="font-bold text-white mb-1">
                    ✂️ Gestão do Catálogo (12 Serviços)
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Configure preços, tempos estimados e se o serviço pode ser
                    agendado online.
                  </p>
                </div>
              )}
              {activeSettingsTab === "barbeiros" && (
                <div>
                  <h4 className="font-bold text-white mb-1">
                    💈 Equipe Cadastrada (4 Barbeiros)
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Defina comissões individuais (ex: 50%), pausas para almoço e
                    dias de folga.
                  </p>
                </div>
              )}
              {activeSettingsTab === "horarios" && (
                <div>
                  <h4 className="font-bold text-white mb-1">
                    ⏰ Grade de Funcionamento
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Configure horário de abertura, fechamento e regras de
                    feriados.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 2. VARIANTE PÍLULA (FILTRO FINANCEIRO / SEGMENTO) */}
          <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              Exemplo 2: Módulo Financeiro (Variante Pill / Segmented)
            </span>

            <Tabs
              variant="pill"
              tabs={financeTabs}
              activeTab={activeFinanceTab}
              onChange={setActiveFinanceTab}
            />

            {/* Bloco de Conteúdo Dinâmico */}
            <div className="p-5 bg-neutral-950/70 border border-neutral-800/80 rounded-xl text-left text-sm text-neutral-300">
              <p className="text-xs text-neutral-400">
                Visualizando módulo:{" "}
                <strong className="text-amber-400 uppercase font-semibold">
                  {activeFinanceTab}
                </strong>
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Os dados de métricas e tabelas são alternados instantaneamente
                no estado do componente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 19. SEÇÃO DE BREADCRUMBS (TRILHA DE NAVEGAÇÃO) */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>🧭</span> Trilha Estrutural (Breadcrumb)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Hierarquia visual de navegação com separadores acessíveis e atalhos
            rápidos de retorno.
          </p>
        </div>

        <div className="space-y-6">
          {/* Exemplo 1: Fluxo de Edição de Serviço (com setas chevron) */}
          <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              Exemplo 1: Edição Profunda de Catálogo (Separador Chevron &gt;)
            </span>

            <div className="p-3 bg-neutral-950/80 border border-neutral-800/80 rounded-xl">
              <Breadcrumb
                separator="chevron"
                items={[
                  {
                    label: "Painel",
                    icon: "🏠",
                    onClick: () => alert("Voltar ao Painel"),
                  },
                  {
                    label: "Configurações",
                    onClick: () => alert("Ir para Configurações"),
                  },
                  {
                    label: "Serviços & Preços",
                    onClick: () => alert("Ir para Serviços"),
                  },
                  { label: "Editar: Corte Degradê + Barboterapia" },
                ]}
              />
            </div>
          </div>

          {/* Exemplo 2: Ficha do Cliente (com barras slash /) */}
          <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              Exemplo 2: Prontuário de Cliente (Separador Slash /)
            </span>

            <div className="p-3 bg-neutral-950/80 border border-neutral-800/80 rounded-xl">
              <Breadcrumb
                separator="slash"
                items={[
                  {
                    label: "Clientes",
                    icon: "👥",
                    onClick: () => alert("Ir para Clientes"),
                  },
                  {
                    label: "Base Ativa",
                    onClick: () => alert("Ir para Base Ativa"),
                  },
                  {
                    label: "Carlos Eduardo Santos",
                    onClick: () => alert("Ficha de Carlos"),
                  },
                  { label: "Histórico de Comandas & Cortes" },
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 20. SEÇÃO DE PAGINAÇÃO DE DADOS (PAGINATION) */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>📄</span> Paginação de Dados (Pagination)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Navegação previsível com truncamento por elipses, fatiamento e
            ajuste de limite por página.
          </p>
        </div>

        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4">
          <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
            Simulação: Base Ativa de Clientes da Barbearia ({totalClientsCount}{" "}
            Registros)
          </span>

          {/* O Componente Pagination integrado */}
          <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-xl p-2">
            <Pagination
              currentPage={clientPage}
              pageSize={clientPageSize}
              totalRecords={totalClientsCount}
              onPageChange={setClientPage}
              onPageSizeChange={setClientPageSize}
              recordLabel="clientes cadastrados"
            />
          </div>

          {/* Feedback da Regra de Negócio */}
          <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-lg text-xs text-neutral-400 flex flex-wrap justify-between items-center gap-2">
            <span>
              Página ativa:{" "}
              <strong className="text-amber-400 font-bold">{clientPage}</strong>{" "}
              de{" "}
              <strong className="text-white font-bold">
                {Math.ceil(totalClientsCount / clientPageSize)}
              </strong>
            </span>
            <span>
              Itens por página:{" "}
              <strong className="text-amber-400 font-bold">
                {clientPageSize}
              </strong>
            </span>
          </div>
        </div>
      </section>

      {/* 21. SEÇÃO DE STATUS (BADGE / TAG) */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>🏷️</span> Selos de Status (Badge / Tag)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Mapeamento semântico visual e controle do ciclo de vida do
            agendamento (FSM).
          </p>
        </div>

        <div className="space-y-6">
          {/* 1. TODAS AS INTENÇÕES VISUAIS (SUBTLE) */}
          <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              1. Mapeamento de Estados do Agendamento (Variante Subtle)
            </span>
            <div className="flex flex-wrap gap-3 items-center">
              <Badge status="waiting" />
              <Badge status="confirmed" />
              <Badge status="in_progress" />
              <Badge status="completed" />
              <Badge status="cancelled" />
              <Badge status="no_show" />
              <Badge
                status="waiting"
                isDelayed={true}
                label="Aguardando (Atrasado)"
              />
            </div>
          </div>

          {/* 2. VARIANTES: SOLID vs OUTLINE */}
          <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              2. Outras Variantes de Exibição (Solid e Outline)
            </span>
            <div className="flex flex-wrap gap-3 items-center">
              <Badge status="confirmed" variant="solid" />
              <Badge status="in_progress" variant="solid" />
              <Badge status="completed" variant="solid" />
              <Badge status="confirmed" variant="outline" />
              <Badge status="completed" variant="outline" />
              <Badge status="cancelled" variant="outline" />
            </div>
          </div>

          {/* 3. SIMULAÇÃO INTERATIVA DE TRANSIÇÃO DO AGENDAMENTO */}
          <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-3 max-w-md">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              3. Teste Interativo: Ciclo de Vida do Corte
            </span>
            <p className="text-xs text-neutral-400">
              Clique no Badge abaixo para avançar o status. Note que apenas as
              transições válidas aparecem!
            </p>

            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">
                  Marcos Vinicius
                </h4>
                <p className="text-xs text-neutral-400">
                  Degradê Navalhado • 15:30h
                </p>
              </div>

              {/* Badge Interativo */}
              <Badge
                status={appointmentStatus}
                isInteractive={true}
                onStatusChange={(newStatus) => {
                  setAppointmentStatus(newStatus);
                }}
              />
            </div>

            {/* Botão para Resetar a Simulação */}
            {(appointmentStatus === "completed" ||
              appointmentStatus === "cancelled" ||
              appointmentStatus === "no_show") && (
              <button
                type="button"
                onClick={() => setAppointmentStatus("waiting")}
                className="text-xs text-amber-500 hover:underline cursor-pointer"
              >
                ↺ Resetar para "Aguardando" para testar novamente
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 22. SEÇÃO DE CARREGAMENTO (SKELETON & SPINNER) */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>⏳</span> Feedback de Carregamento (Skeleton & Spinner)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Retenção visual estrutural (Skeleton) e prevenção de ações
            duplicadas (Spinner).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* 1. TESTE DO SKELETON (ESPELHO DO APPOINTMENT CARD) */}
          <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                1. Carregamento Estrutural (Skeleton)
              </span>
              <Button
                variant="outline"
                onClick={handleSimulateCardLoad}
                disabled={isCardLoading}
              >
                {isCardLoading ? "Carregando..." : "Simular 2s de Carregamento"}
              </Button>
            </div>

            {/* Bloco com Transição Suave */}
            <div
              aria-busy={isCardLoading}
              aria-live="polite"
              className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl min-h-[110px] flex items-center transition-all duration-200"
            >
              {isCardLoading ? (
                /* O SKELETON ESPELHANDO COM PRECISÃO O CARD FINAL */
                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton variant="circular" width="40px" height="40px" />
                      <div className="space-y-1.5">
                        <Skeleton variant="text" width="130px" height="14px" />
                        <Skeleton variant="text" width="90px" height="11px" />
                      </div>
                    </div>
                    <Skeleton variant="rounded" width="85px" height="24px" />
                  </div>
                  <div className="pt-2 border-t border-neutral-800/80 flex justify-between">
                    <Skeleton variant="text" width="110px" height="12px" />
                    <Skeleton variant="text" width="60px" height="12px" />
                  </div>
                </div>
              ) : (
                /* O CARD REAL (QUANDO OS DADOS CHEGAM) */
                <div className="w-full space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-400">
                        RA
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          Rafael Alencar
                        </h4>
                        <p className="text-xs text-neutral-400">
                          Barbeiro: Carlos Silva
                        </p>
                      </div>
                    </div>
                    <Badge status="confirmed" label="Confirmado" />
                  </div>
                  <div className="pt-2 border-t border-neutral-800/80 flex justify-between text-xs text-neutral-400">
                    <span>Degradê + Barba</span>
                    <strong className="text-amber-500">R$ 80,00</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. TESTE DO SPINNER (AÇÃO BLOCANTE ANTI-CLIQUE DUPLO) */}
          <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4 relative overflow-hidden">
            {/* Overlay com Spinner ativado durante o pagamento */}
            {isProcessingPayment && (
              <Spinner
                overlay={true}
                size="lg"
                color="primary"
                label="Processando pagamento da comanda com segurança..."
              />
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                2. Ação Transacional Blocante (Spinner)
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">
                Anti-Double Click
              </span>
            </div>

            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3 text-left">
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-300">
                  Comanda nº 1042
                </span>
                <span className="text-xs font-bold text-emerald-400">
                  Total: R$ 80,00
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Clique no botão abaixo para simular o fechamento de conta. O
                card será blindado contra múltiplos cliques simultâneos.
              </p>

              <Button
                variant="primary"
                className="w-full"
                disabled={isProcessingPayment}
                onClick={handleProcessPayment}
              >
                Finalizar e Pagar Comanda (R$ 80,00)
              </Button>
            </div>

            {/* Amostra visual de tamanhos do Spinner */}
            <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between">
              <span className="text-xs text-neutral-500">
                Tamanhos nativos:
              </span>
              <div className="flex items-center gap-4">
                <Spinner size="xs" color="neutral" />
                <Spinner size="sm" color="white" />
                <Spinner size="md" color="primary" />
                <Spinner size="lg" color="success" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 23. SEÇÃO DE CARDS DA GRADE DE AGENDAMENTO (APPOINTMENT CARD) */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>💈</span> Card de Agendamento da Agenda (AppointmentCard)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Altura proporcional à duração, status de pagamento, cliente VIP e
            atalhos rápidos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* 1. Atendimento de 60 minutos (Altura: 120px) */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              1. Serviço de 60 min (R$ 80 - Pendente)
            </span>
            <AppointmentCard
              minuteHeight={2}
              appointment={{
                id: "1",
                clientName: "Carlos Eduardo Santos",
                serviceName: "Corte Degradê + Barboterapia",
                startTime: "14:00",
                endTime: "15:00",
                durationMinutes: 60,
                status: "confirmed",
                isPaid: false,
                isVip: true,
                hasNotes: true,
              }}
              onOpenComanda={() => alert("Abrindo Comanda de Carlos!")}
              onStatusChange={(status) =>
                alert(`Status alterado para: ${status}`)
              }
              onCancel={() => alert("Cancelamento solicitado")}
            />
          </div>

          {/* 2. Atendimento Em Andamento (Roxo) */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              2. Em Atendimento (45 min - Pago)
            </span>
            <AppointmentCard
              minuteHeight={2}
              appointment={{
                id: "2",
                clientName: "Felipe Rodrigues",
                serviceName: "Barba Terapia Completa",
                startTime: "15:00",
                endTime: "15:45",
                durationMinutes: 45,
                status: "in_progress",
                isPaid: true,
                isVip: false,
                hasNotes: false,
              }}
              onOpenComanda={() => alert("Comanda de Felipe")}
            />
          </div>

          {/* 3. Atendimento Atrasado com Borda Pulsante */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
              3. Alerta de Atraso (&gt; 10 min de tolerância)
            </span>
            <AppointmentCard
              minuteHeight={2}
              appointment={{
                id: "3",
                clientName: "Lucas Almeida",
                serviceName: "Corte Tradicional na Tesoura",
                startTime: "13:30",
                endTime: "14:00",
                durationMinutes: 30,
                status: "waiting",
                isPaid: false,
                isDelayed: true, // Borda vermelha pulsante!
                isVip: false,
                hasNotes: true,
              }}
            />
          </div>
        </div>
      </section>

      {/* 24. SEÇÃO DE COLUNA DO BARBEIRO NA LINHA DO TEMPO */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>⏱️</span> Coluna Diária do Barbeiro (BarberTimelineColumn)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Linha do tempo com posicionamento matemático em pixels, intervalo de
            almoço e encaixes livres.
          </p>
        </div>

        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4">
          <p className="text-xs text-neutral-400">
            Clique em qualquer horário vazio (ex: 08:00 ou 11:30) para disparar
            um novo agendamento naquele slot exato!
          </p>

          <div className="border border-neutral-800 rounded-2xl overflow-hidden max-w-sm mx-auto shadow-2xl h-[560px] overflow-y-auto">
            <BarberTimelineColumn
              barber={{
                id: "carlos",
                name: "Carlos Silva",
                role: "Master Barber",
                avatar: "CS",
              }}
              startHour={8}
              endHour={18}
              minuteHeight={1.8} // Escala calibrada
              breaks={[
                { startTime: "12:00", endTime: "13:00", label: "Almoço" },
              ]}
              appointments={mockCarlosAppointments}
              onSlotClick={(barberId, time) => {
                alert(`Abrir agendamento rápido com Carlos às ${time}h!`);
              }}
              onOpenComanda={(id) =>
                alert(`Abrir comanda do agendamento ${id}`)
              }
              onStatusChange={(id, status) =>
                alert(`Atendimento ${id} alterado para: ${status}`)
              }
            />
          </div>
        </div>
      </section>

      {/* 25. SEÇÃO DO SELETOR DE HORÁRIOS (TIME SLOT PICKER) */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>⏰</span> Grade de Horários Inteligente (TimeSlotPicker)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Clique em um horário <strong>Livre</strong> para agendar ou em um
            horário <strong>Ocupado/Reservado</strong> para consultar a ficha do
            cliente!
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-4">
          <TimeSlotPicker
            slots={mockDayTimeSlots}
            selectedTime={selectedSlotTime}
            onSelectTime={setSelectedSlotTime}
            totalDurationMinutes={50}
            bufferMinutes={10}
            // AÇÃO 1: Clique em Horário Livre -> Dispara simulação do Modal de Agendamento
            onAvailableClick={(slot) => {
              alert(
                `📅 ABRIR MODAL DE NOVO AGENDAMENTO:\n\n` +
                  `• Horário Selecionado: ${slot.time}h\n` +
                  `• Barbeiro Ativo: Carlos Silva\n` +
                  `• Duração Estimada: 50 minutos`,
              );
            }}
            // AÇÃO 2: Clique em Horário Ocupado/Reservado -> Dispara simulação da Lista/Ficha do Cliente
            onOccupiedClick={(slot) => {
              if (slot.status === "held") {
                alert(
                  `⏳ HORÁRIO EM PROCESSO DE CHECKOUT (${slot.time}h):\n\n` +
                    `• Status: Reservado temporariamente (restam 3 minutos)\n` +
                    `• Canal: Aplicativo Web do Cliente\n` +
                    `• Observação: Aguardando confirmação do PIX.`,
                );
              } else {
                alert(
                  `📋 FICHA DO CLIENTE AGENDADO (${slot.time}h):\n\n` +
                    `• Cliente: Marcos Vinicius (VIP ★)\n` +
                    `• Telefone: (11) 98765-4321\n` +
                    `• Serviço: Corte Degradê + Barboterapia\n` +
                    `• Valor: R$ 80,00 (Pendente no Caixa)\n` +
                    `• Status: Confirmado ✓`,
                );
              }
            }}
          />
        </div>
      </section>

      {/* 26. SEÇÃO DA VISÃO GERAL DA AGENDA (CALENDAR VIEW) */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>📅</span> Visão Geral da Agenda (CalendarView)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Orquestração diária multi-barbeiros, régua horária sincronizada e
            linha vermelha em tempo real.
          </p>
        </div>

        <div className="space-y-4">
          <CalendarView
            barbers={mockBarbersList}
            appointments={mockGlobalAppointments}
            startHour={8}
            endHour={19}
            minuteHeight={1.8}
            onNewAppointmentClick={() => setIsModalOpen(true)}
            onSlotClick={(barberId, time) => {
              alert(`Agendar com o barbeiro ${barberId} às ${time}h!`);
            }}
            onOpenComanda={(id) => alert(`Abrir Comanda nº ${id}`)}
            onStatusChange={(id, status) =>
              alert(`Agendamento ${id} mudou para ${status}`)
            }
          />
        </div>
      </section>

      {/* 27. SEÇÃO DE CATÁLOGO DE SERVIÇOS (SERVICE CARD) */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>✂️</span> Catálogo de Serviços (ServiceCard)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Cards para seleção no aplicativo do cliente com formatação
            monetária, duração estimada e selos de destaque.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Card 1: Corte Degradê (Mais Pedido) */}
          <ServiceCard
            service={{
              id: "serv-1",
              name: "Corte Degradê Navalhado",
              description:
                "Acabamento de precisão na navalha, lavagem refrescante e pomada matte inclusa.",
              category: "Cabelo",
              durationMinutes: 40,
              price: 55,
              tag: "Mais Pedido ⭐",
            }}
            isSelected={selectedServiceIds.includes("serv-1")}
            onToggleSelect={handleToggleService}
          />

          {/* Card 2: Barboterapia Completa */}
          <ServiceCard
            service={{
              id: "serv-2",
              name: "Barboterapia Tradicional",
              description:
                "Toalha quente com óleos essenciais, massagem facial e alinhamento na lâmina.",
              category: "Barba",
              durationMinutes: 30,
              price: 45,
            }}
            isSelected={selectedServiceIds.includes("serv-2")}
            onToggleSelect={handleToggleService}
          />

          {/* Card 3: Combo Especial (Promoção) */}
          <ServiceCard
            service={{
              id: "serv-3",
              name: "Combo VIP: Cabelo + Barba",
              description:
                "Experiência completa com direito a cerveja artesanal ou café expresso.",
              category: "Combos",
              durationMinutes: 70,
              price: 90,
              tag: "15% OFF",
            }}
            isSelected={selectedServiceIds.includes("serv-3")}
            onToggleSelect={handleToggleService}
          />
        </div>
      </section>

      {/* 28. SEÇÃO DE SELEÇÃO ENCADEADA (SERVICE MULTI-SELECT) */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>🛍️</span> Seleção Encadeada de Serviços (ServiceMultiSelect)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Filtro dinâmico por categoria e barra de resumo (carrinho) com
            cálculo instantâneo de tempo e preço.
          </p>
        </div>

        <div className="space-y-4">
          <ServiceMultiSelect
            services={mockCatalogServices}
            selectedServices={cartServices}
            onChange={setCartServices}
            onContinue={() => {
              const nomes = cartServices.map((s) => s.name).join(", ");
              alert(
                `🎉 AVANÇANDO PARA O PRÓXIMO PASSO!\n\n` +
                  `• Serviços Selecionados: ${nomes}\n` +
                  `• Tempo Total: ${cartServices.reduce((a, c) => a + c.durationMinutes, 0)} minutos\n` +
                  `• Valor Total: R$ ${cartServices.reduce((a, c) => a + c.price, 0).toFixed(2)}\n\n` +
                  `Próximo passo: Escolha do Barbeiro e Horário!`,
              );
            }}
          />
        </div>
      </section>

      {/* 29. SEÇÃO DE PERFIL DE PROFISSIONAIS (PROFESSIONAL CARD) */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>💈</span> Seleção de Barbeiros (ProfessionalCard)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Cards de perfil com avaliação por estrelas, selo de encaixe mais
            rápido e especialidades.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {mockTeamList.map((barber) => (
            <ProfessionalCard
              key={barber.id}
              professional={barber}
              isSelected={selectedBarberId === barber.id}
              onSelect={(b) => setSelectedBarberId(b.id)}
            />
          ))}
        </div>
      </section>

      {/* 30. SEÇÃO DE ESCALA DE TRABALHO (WORK SHIFT SELECTOR) */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>⏱️</span> Escala de Trabalho do Barbeiro (WorkShiftSelector)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Configurador de expediente semanal, folgas e intervalos com cálculo
            automático de carga horária.
          </p>
        </div>

        <div className="space-y-4">
          <WorkShiftSelector
            schedule={barberSchedule}
            onChange={setBarberSchedule}
          />
        </div>
      </section>

      {/* 31. SEÇÃO DE FILA DE ESPERA (QUEUE TICKET / WAITLIST) */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>🎟️</span> Fila de Espera em Tempo Real (QueueTicket /
            Waitlist)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Gestão de clientes sem agendamento (walk-ins), prioridades
            legais/VIP e estimativa dinâmica de tempo.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {waitlist.map((ticket) => (
            <QueueTicket
              key={ticket.id}
              ticket={ticket}
              onCall={(t) => {
                setWaitlist((prev) =>
                  prev.map((item) =>
                    item.id === t.id ? { ...item, status: "called" } : item,
                  ),
                );
                alert(
                  `📢 Senha #${t.position} (${t.clientName}) chamada no painel da barbearia!`,
                );
              }}
              onStartService={(t) => {
                alert(
                  `💺 INICIANDO ATENDIMENTO:\n\n` +
                    `• Cliente: ${t.clientName}\n` +
                    `• Serviço: ${t.serviceName}\n` +
                    `• Ação: Removido da fila e Comanda nº ${t.id} criada automaticamente!`,
                );
                setWaitlist((prev) => prev.filter((item) => item.id !== t.id));
              }}
              onNotifyWhatsapp={(t) => {
                alert(
                  `💬 Disparando mensagem WhatsApp para ${t.phone}:\n"Olá ${t.clientName}, sua cadeira está quase pronta na Barbearia!"`,
                );
              }}
              onMarkAbsent={(t) => {
                alert(
                  `⚠️ Cliente ${t.clientName} movido para o final da fila.`,
                );
              }}
            />
          ))}
        </div>
      </section>

      {/* 32. SEÇÃO DE PRODUTOS DO PDV (POS PRODUCT ITEM) */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>🍺</span> Produtos do Bar & Vitrine (PosProductItem)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Lançamento rápido na comanda com validação de estoque zero, taxa de
            comissão e troca de variações.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {mockPosProducts.map((prod) => (
            <PosProductItem
              key={prod.id}
              product={prod}
              quantityInComanda={comandaProductCounts[prod.id] || 0}
              onAddToCart={(p) => {
                setComandaProductCounts((prev) => ({
                  ...prev,
                  [p.id]: (prev[p.id] || 0) + 1,
                }));
                alert(
                  `🛒 PRODUTO LANÇADO NA COMANDA!\n\n` +
                    `• Item: ${p.name}\n` +
                    `• Variação: ${p.selectedVariant ? p.selectedVariant.name : "Padrão"}\n` +
                    `• Valor: R$ ${p.finalPrice.toFixed(2)}\n` +
                    `• Comissão do Barbeiro: ${p.commissionPercent ? p.commissionPercent + "%" : "Sem comissão"}`,
                );
              }}
            />
          ))}
        </div>
      </section>

      {/* 33. SEÇÃO DE COMANDA ABERTA (COMANDA CARD) */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>🧾</span> Comanda Aberta do Caixa (ComandaCard)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Consolidação de serviços executados, consumo de bar/vitrine e rateio
            automático de comissões.
          </p>
        </div>

        <div className="flex justify-center">
          <ComandaCard
            comanda={activeComanda}
            onAddItem={() =>
              alert("Abrir seletor rápido para incluir produto ou serviço!")
            }
            onRemoveService={(id) => {
              setActiveComanda((prev) => ({
                ...prev,
                services: prev.services.filter((s) => s.id !== id),
              }));
            }}
            onRemoveProduct={(id) => {
              setActiveComanda((prev) => ({
                ...prev,
                products: prev.products.filter((p) => p.id !== id),
              }));
            }}
            onStatusChange={(status) => {
              setActiveComanda((prev) => ({ ...prev, status }));
            }}
            onProceedToPayment={(cmd) => {
              alert(
                `💳 ABRINDO TELA DE LIQUIDAÇÃO NO CAIXA:\n\n` +
                  `• Comanda: #${cmd.id} (${cmd.clientName})\n` +
                  `• Total a Pagar: R$ ${(
                    cmd.services.reduce((a, s) => a + s.price, 0) +
                    cmd.products.reduce((a, p) => a + p.total, 0)
                  ).toFixed(2)}\n` +
                  `• Barbeiro (${cmd.barberName}) recebe: R$ ${(
                    cmd.services.reduce((a, s) => a + s.barberCommission, 0) +
                    cmd.products.reduce((a, p) => a + p.sellerCommission, 0)
                  ).toFixed(2)}\n\n` +
                  `Próximo passo: Seletor de Formas de Pagamento (Split Payment)!`,
              );
            }}
          />
        </div>
      </section>

      {/* 34. SEÇÃO DE LIQUIDAÇÃO NO CAIXA (PAYMENT METHOD SELECTOR) */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>💳</span> Quitação & Split Payment (PaymentMethodSelector)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Divisão de pagamentos (PIX + Cartão + Dinheiro), cálculo automático
            de troco, clube VIP e fiado com CPF.
          </p>
        </div>

        <div className="flex justify-center">
          <PaymentMethodSelector
            totalAmount={177} // Mesmo valor da comanda anterior!
            client={{
              name: "Rodrigo Faro",
              cpf: "123.456.789-00",
              hasSubscription: true,
              subscriptionPlan: "Clube do Barba VIP",
            }}
            onFinishPayment={(resumo) => {
              alert(
                `🎉 COMANDA CMD-1042 LIQUIDADA COM SUCESSO!\n\n` +
                  `• Pagamentos Recebidos:\n` +
                  resumo
                    .map((r) => `  - ${r.method}: R$ ${r.amount.toFixed(2)}`)
                    .join("\n") +
                  `\n\n• Baixa no estoque dos produtos confirmada!\n` +
                  `• Comissões creditadas na conta do barbeiro Carlos Silva!`,
              );
            }}
            onCancel={() => alert("Cancelamento da tela de pagamento.")}
          />
        </div>
      </section>

      {/* 35. SEÇÃO DE CARTÃO FIDELIDADE (LOYALTY CARD) */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>⭐</span> Cartão Fidelidade Digital (LoyaltyCard)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Acúmulo de carimbos digitais, barra de progresso, trava de validade
            e liberação de resgate de prêmios.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-start justify-center">
          {/* 1. Cartão Em Progresso Interativo */}
          <div className="space-y-3 w-full max-w-md">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              1. Teste Interativo: Progresso do Cliente ({userStamps}/10 Selos)
            </span>

            <LoyaltyCard
              totalStampsRequired={10}
              currentStamps={userStamps}
              rewardDescription="1 Corte de Cabelo Grátis"
              expirationDate="15/12/2026"
              clientName="Rodrigo Faro"
              onRedeem={() => {
                alert(
                  "🎉 PARABÉNS!\n\nVocê resgatou 1 Corte Grátis na comanda!\nSeu cartão foi reiniciado com 0 selos para uma nova rodada.",
                );
                setUserStamps(0); // Zera o cartão após o resgate
              }}
            />

            {/* Botões para simular o barbeiro carimbando o cartão */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => setUserStamps((prev) => Math.min(10, prev + 1))}
                className="text-xs py-1 px-3"
                disabled={userStamps >= 10}
              >
                + Adicionar Selo (+1 Corte)
              </Button>
              <Button
                variant="outline"
                onClick={() => setUserStamps(10)}
                className="text-xs py-1 px-3"
              >
                Simular Cartão Cheio (10/10)
              </Button>
            </div>
          </div>

          {/* 2. Cartão com Meta Já Alcançada */}
          <div className="space-y-3 w-full max-w-md">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              2. Cartão Cheio Pronto para Resgatar (10/10 Selos)
            </span>

            <LoyaltyCard
              totalStampsRequired={10}
              currentStamps={10}
              rewardDescription="Barboterapia VIP Cortesia"
              expirationDate="31/10/2026"
              clientName="Carlos Eduardo Santos"
              onRedeem={() =>
                alert(
                  "Benefício de Barboterapia VIP aplicado na comanda com sucesso!",
                )
              }
            />
          </div>
        </div>
      </section>

      {/* 36. SEÇÃO DE PLANO DE ASSINATURA (SUBSCRIPTION BADGE) */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>👑</span> Planos de Assinatura & Franquia (SubscriptionBadge)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Identificação de assinantes recorrentes, cotas mensais (franquia) e
            alertas de inadimplência no balcão.
          </p>
        </div>

        <div className="space-y-6">
          {/* 1. Versões Compactas (Badges / Pílulas para Tabelas e Ficha) */}
          <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              1. Pílulas Compactas (Uso em Agendamentos, Comandas e Tabelas)
            </span>
            <div className="flex flex-wrap gap-3 items-center">
              <SubscriptionBadge
                variant="badge"
                subscription={{
                  planName: "Plano Classic (4 Cortes)",
                  status: "active",
                  quotaType: "limited",
                  totalQuota: 4,
                  usedQuota: 1,
                }}
              />

              <SubscriptionBadge
                variant="badge"
                subscription={{
                  planName: "Clube VIP Ilimitado",
                  status: "active",
                  quotaType: "unlimited",
                }}
              />

              <SubscriptionBadge
                variant="badge"
                subscription={{
                  planName: "Plano Cabelo & Barba",
                  status: "overdue", // Inadimplente
                  quotaType: "limited",
                  totalQuota: 4,
                  usedQuota: 4,
                }}
              />
            </div>
          </div>

          {/* 2. Versões Detalhadas (Cards de Gestão) */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              2. Cards Detalhados de Gestão de Franquia
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Card 1: Assinante Ativo com Franquia (2/4 cortes) */}
              <SubscriptionBadge
                variant="card"
                subscription={{
                  planName: "Plano Executive Mensal",
                  monthlyPrice: 129.9,
                  status: "active",
                  quotaType: "limited",
                  totalQuota: 4,
                  usedQuota: 2,
                  renewalDate: "15/10/2026",
                }}
                onManage={() =>
                  alert("Abrir tela de gerenciamento da assinatura do cliente.")
                }
              />

              {/* Card 2: Assinante com Cobrança Pendente / Cartão Recusado */}
              <SubscriptionBadge
                variant="card"
                subscription={{
                  planName: "Clube do Bigode & Barba",
                  monthlyPrice: 89.9,
                  status: "overdue",
                  quotaType: "limited",
                  totalQuota: 2,
                  usedQuota: 2,
                  renewalDate: "05/09/2026",
                }}
                onSettleDebt={() => {
                  alert(
                    "💳 ABRINDO TERMINAL DE COBRANÇA:\n\nCobrar mensalidade de R$ 89,90 no balcão da barbearia para reativar o plano.",
                  );
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 37. SEÇÃO DE PRONTUÁRIO E LINHA DO TEMPO (CLIENT HISTORY TIMELINE) */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>📜</span> Prontuário & Ficha Técnica (ClientHistoryTimeline)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Histórico cronológico unificado, métricas de frequência/ticket médio
            e ficha técnica de cortes com alerta de alergias.
          </p>
        </div>

        <div className="flex justify-center">
          <ClientHistoryTimeline
            metrics={{
              totalVisits: 14,
              averageTicket: 84.5,
              frequencyDays: 18,
              preferredBarber: "Carlos Silva (85%)",
            }}
            technicalNotes={{
              cutSpecs:
                "Pente 1 disfarçado na lateral, tesoura desfiada no topo, risco fino na esquerda.",
              beardSpecs:
                "Barba alinhada com toalha quente, desenhada na navalha sem diminuir o queixo.",
              allergyAlert:
                "Sensibilidade a lâmina no pescoço (usar pós-barba sem álcool).",
            }}
            events={mockClientTimelineEvents}
            onAddTechnicalNote={() => {
              alert(
                "📝 ABRIR FORMULÁRIO:\n\nAdicionar nova observação técnica de corte para o cliente Rodrigo Faro.",
              );
            }}
          />
        </div>
      </section>

      {/* 38. SEÇÃO DE DASHBOARDS (STAT CARDS / KPIS) */}
      <section className={designSystemStyles.section}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className={designSystemStyles.sectionTitle}>
              <span>📊</span> Indicadores Financeiros & Operacionais (StatCard /
              KPI)
            </h2>
            <p className={designSystemStyles.sectionSubtitle}>
              Síntese do faturamento diário, total de cortes, ticket médio e
              modo privacidade para o gestor.
            </p>
          </div>

          {/* Botão de Alternância do Modo Privacidade */}
          <Button
            variant={isPrivacyModeActive ? "primary" : "secondary"}
            onClick={() => setIsPrivacyModeActive((prev) => !prev)}
            className="text-xs py-1.5 px-3 self-start sm:self-auto"
          >
            <span>{isPrivacyModeActive ? "👁️‍🗨️" : "👁️"}</span>
            <span>
              {isPrivacyModeActive
                ? "Revelar Valores"
                : "Ocultar Valores (Privacidade)"}
            </span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Faturamento do Dia */}
          <StatCard
            title="Faturamento do Dia"
            value="R$ 1.840,00"
            icon="💰"
            theme="gold"
            isMasked={isPrivacyModeActive}
            delta={{
              value: "+14.2%",
              isPositive: true,
              comparisonText: "vs. mesmo dia na semana anterior",
            }}
          />

          {/* KPI 2: Total de Cortes Realizados */}
          <StatCard
            title="Cortes Realizados"
            value="24 atendimentos"
            icon="✂️"
            theme="green"
            isMasked={isPrivacyModeActive}
            delta={{
              value: "+8.0%",
              isPositive: true,
              comparisonText: "meta: 20 cortes/dia",
            }}
          />

          {/* KPI 3: Ticket Médio por Cliente */}
          <StatCard
            title="Ticket Médio"
            value="R$ 76,66"
            icon="📈"
            theme="blue"
            isMasked={isPrivacyModeActive}
            delta={{
              value: "-3.1%",
              isPositive: false, // Em queda
              comparisonText: "vs. média mensal",
            }}
          />

          {/* KPI 4: Comissões Acumuladas a Pagar */}
          <StatCard
            title="Comissões da Equipe"
            value="R$ 920,00"
            icon="💈"
            theme="purple"
            isMasked={isPrivacyModeActive}
            delta={{
              value: "50%",
              isPositive: null, // Neutro
              comparisonText: "taxa média de repasse",
            }}
          />
        </div>
      </section>

      {/* 39. SEÇÃO DE GRÁFICOS FINANCEIROS (FINANCIAL CHART) */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>📈</span> Gráfico de Receita & Vendas (FinancialChart)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Barras empilhadas (Serviços vs. Bar/Vitrine), alternância de período
            temporal e tooltips no hover.
          </p>
        </div>

        <div className="space-y-4">
          <FinancialChart
            weeklyData={mockWeeklyRevenue}
            monthlyData={mockMonthlyRevenue}
            yearlyData={mockYearlyRevenue}
          />
        </div>
      </section>

      {/* 40. SEÇÃO DE FECHAMENTO DE COMISSÕES (COMMISSION BREAKDOWN CARD) */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>💈</span> Fechamento de Comissões da Equipe
            (CommissionBreakdownCard)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Cálculo transparente de comissão de serviços e produtos, dedução de
            taxas/vales e quitação via PIX.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start justify-center">
          {/* Card 1: Carlos Silva (Saldo a Pagar Interativo) */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              1. Folha Semanal em Aberto (A Pagar)
            </span>

            <CommissionBreakdownCard
              barber={{
                id: "carlos",
                name: "Carlos Silva",
                role: "Master Barber",
                avatar: "CS",
              }}
              period="Semana Atual (01 a 07 de Setembro)"
              summary={carlosCommission}
              onExportReport={() => {
                alert(
                  `📄 GERANDO RELATÓRIO DE PRESTAÇÃO DE CONTAS:\n\n` +
                    `• Profissional: Carlos Silva\n` +
                    `• Total Bruto Gerado: R$ 2.780,00\n` +
                    `• Comissão Serviços: + R$ 1.200,00\n` +
                    `• Comissão Produtos: + R$ 38,00\n` +
                    `• Deduções (Taxas + Vale): - R$ 132,50\n` +
                    `• Saldo Líquido: R$ 1.105,50\n\n` +
                    `Arquivo pronto para download em PDF/Excel!`,
                );
              }}
              onSettlePayment={() => {
                alert(
                  `💸 QUITAÇÃO DE COMISSÃO REALIZADA!\n\n` +
                    `• Beneficiário: Carlos Silva\n` +
                    `• Chave PIX: carlos.barbeiro@saas.com\n` +
                    `• Valor Transferido: R$ 1.105,50\n\n` +
                    `Folha baixada com sucesso no financeiro da barbearia!`,
                );
                setCarlosCommission((prev) => ({ ...prev, isSettled: true }));
              }}
            />
          </div>

          {/* Card 2: Marcos Vinicius (Folha Já Paga e Liquidada) */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              2. Folha Já Paga & Arquivada
            </span>

            <CommissionBreakdownCard
              barber={{
                id: "marcos",
                name: "Marcos Vinicius",
                role: "Especialista em Degradê",
                avatar: "MV",
              }}
              period="Semana Anterior (25 a 31 de Agosto)"
              summary={{
                grossServices: 1950,
                serviceCommissionPercent: 50,
                servicesCommission: 975,
                grossProducts: 220,
                productCommissionPercent: 10,
                productsCommission: 22,
                paymentFeesDeduction: 26.0,
                advances: 0,
                netCommissionPayable: 971.0,
                isSettled: true, // Já liquidada!
              }}
              onExportReport={() =>
                alert("Baixando comprovante da folha liquidada...")
              }
            />
          </div>
        </div>
      </section>

      {/* 41. SEÇÃO DE EXIBIÇÃO DE DADOS: AVATAR E DIVIDER */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>👤</span> Identidade & Divisores (Avatar & Divider)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Iniciais automáticas com cores fixas via hash, pontos de status
            presencial, selo VIP e divisores.
          </p>
        </div>

        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-6">
          {/* 1. Amostra de Status do Barbeiro e Clientes VIP */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              1. Avatares com Status Presencial e Selo VIP
            </span>

            <div className="flex flex-wrap items-center gap-6">
              {/* Barbeiro Disponível */}
              <div className="flex items-center gap-3">
                <Avatar name="Carlos Silva" size="lg" status="available" />
                <div className="text-xs text-left">
                  <p className="font-bold text-white">Carlos Silva</p>
                  <span className="text-emerald-400">Disponível</span>
                </div>
              </div>

              {/* Barbeiro em Atendimento */}
              <div className="flex items-center gap-3">
                <Avatar name="Marcos Vinicius" size="lg" status="in_service" />
                <div className="text-xs text-left">
                  <p className="font-bold text-white">Marcos Vinicius</p>
                  <span className="text-purple-400">Em Atendimento</span>
                </div>
              </div>

              {/* Barbeiro em Pausa / Almoço */}
              <div className="flex items-center gap-3">
                <Avatar name="Tiago Santos" size="lg" status="on_break" />
                <div className="text-xs text-left">
                  <p className="font-bold text-white">Tiago Santos</p>
                  <span className="text-amber-400">Pausa Almoço</span>
                </div>
              </div>

              {/* Cliente VIP com Iniciais Automáticas */}
              <div className="flex items-center gap-3">
                <Avatar name="Rodrigo Faro" size="lg" isVip={true} />
                <div className="text-xs text-left">
                  <p className="font-bold text-white">Rodrigo Faro</p>
                  <span className="text-amber-400">Cliente VIP 👑</span>
                </div>
              </div>
            </div>
          </div>

          {/* Divisor com Rótulo */}
          <Divider label="Variação de Tamanhos de Avatar" />

          {/* 2. Escala de Tamanhos */}
          <div className="flex items-center gap-4">
            <Avatar name="Felipe Neto" size="xs" />
            <Avatar name="Lucas Paquetá" size="sm" />
            <Avatar name="Gabriel Jesus" size="md" />
            <Avatar name="Neymar Júnior" size="lg" status="available" />
            <Avatar
              name="Vinicius Júnior"
              size="xl"
              isVip={true}
              status="available"
            />
          </div>

          {/* Divisor Vertical */}
          <div className="flex items-center gap-2 p-3 bg-neutral-950 rounded-xl text-xs text-neutral-400">
            <span>Seção de Serviços</span>
            <Divider orientation="vertical" />
            <span>Relatórios Financeiros</span>
            <Divider orientation="vertical" />
            <span className="text-amber-400 font-bold">Comandas Abertas</span>
          </div>
        </div>
      </section>

      {/* 43. SEÇÃO DE TABELA DE DADOS (TABLE) */}
      <section className={designSystemStyles.section}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className={designSystemStyles.sectionTitle}>
              <span>📋</span> Tabela de Dados Operacionais (Table)
            </h2>
            <p className={designSystemStyles.sectionSubtitle}>
              Ordenação por coluna, seleção em massa com barra flutuante e
              coluna de ações fixa à direita.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setIsTableLoading(true);
              setTimeout(() => setIsTableLoading(false), 2000);
            }}
            className="text-xs py-1.5 px-3 self-start sm:self-auto"
          >
            {isTableLoading ? "Carregando..." : "Simular Loading na Tabela"}
          </Button>
        </div>

        <div className="space-y-4">
          <Table
            data={mockTableComandas}
            keyField="id"
            selectable={true}
            selectedIds={selectedComandaIds}
            onSelectionChange={setSelectedComandaIds}
            isLoading={isTableLoading}
            // Barra de Ações em Lote personalizada
            bulkActions={
              <Button
                variant="primary"
                onClick={() =>
                  alert(
                    `Disparando WhatsApp para ${selectedComandaIds.length} clientes selecionados!`,
                  )
                }
                className="text-xs py-1 px-3 bg-amber-500 text-neutral-950 font-black"
              >
                💬 Enviar WhatsApp em Lote
              </Button>
            }
            // Configuração das Colunas
            columns={[
              {
                key: "id",
                label: "Comanda",
                sortable: true,
                render: (row) => (
                  <span className="font-mono font-bold text-amber-500">
                    {row.id}
                  </span>
                ),
              },
              {
                key: "clientName",
                label: "Cliente",
                sortable: true,
                render: (row) => (
                  <div className="flex items-center gap-2.5">
                    <Avatar name={row.clientName} size="sm" />
                    <span className="font-bold text-white">
                      {row.clientName}
                    </span>
                  </div>
                ),
              },
              {
                key: "barberName",
                label: "Barbeiro",
                sortable: true,
                render: (row) => (
                  <span className="text-neutral-300">{row.barberName}</span>
                ),
              },
              {
                key: "service",
                label: "Serviço Principal",
                render: (row) => (
                  <span className="text-neutral-400">{row.service}</span>
                ),
              },
              {
                key: "totalPrice",
                label: "Valor Total",
                sortable: true,
                render: (row) => (
                  <span className="font-mono font-bold text-emerald-400">
                    R$ {Number(row.totalPrice).toFixed(2).replace(".", ",")}
                  </span>
                ),
              },
              {
                key: "status",
                label: "Status",
                sortable: true,
                render: (row) => <Badge status={row.status} size="sm" />,
              },
            ]}
            // Ações Fixas na Direita por Linha
            actions={[
              {
                label: "Visualizar Comanda",
                icon: "👁️",
                onClick: (row) =>
                  alert(`Abrindo detalhes da Comanda ${row.id}`),
              },
              {
                label: "Conversar no WhatsApp",
                icon: "💬",
                onClick: (row) =>
                  alert(`Abrindo chat do WhatsApp de ${row.clientName}`),
              },
              {
                label: "Estornar / Cancelar",
                icon: "✕",
                isDanger: true,
                onClick: (row) =>
                  alert(`⚠️ Deseja realmente estornar a comanda ${row.id}?`),
              },
            ]}
          />
        </div>
      </section>

      {/* 44. SEÇÃO DE TEMAS: THEME TOGGLE & WHITE-LABEL CUSTOMIZER */}
      <section className={designSystemStyles.section}>
        <div>
          <h2 className={designSystemStyles.sectionTitle}>
            <span>🌓</span> Iluminação & White-Label da Barbearia (ThemeToggle)
          </h2>
          <p className={designSystemStyles.sectionSubtitle}>
            Alternância Dark/Light para usuários e personalização de paleta da
            marca pelo suporte (recurso pago).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* 1. O Toggle Simples de Dark/Light (Usado por qualquer barbeiro/cliente) */}
          <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-4 text-left">
            <div>
              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                1. Preferência do Usuário (Dark / Light)
              </span>
              <p className="text-xs text-neutral-400 mt-1">
                Alterna a luminância no dispositivo do operador sem alterar as
                cores dos outros usuários.
              </p>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <ThemeToggle showLabel={true} />
              <span className="text-xs text-neutral-400">
                Experimente clicar para alternar o modo!
              </span>
            </div>
          </div>

          {/* 2. O Módulo de Customização White-Label (Gerenciado pelo Suporte/SuperAdmin) */}
          <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-4 text-left">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  2. Pacote White-Label (Personalização da Marca)
                </span>
                <p className="text-xs text-neutral-400 mt-1">
                  Presets configurados pelo Suporte com contraste WCAG 4.5:1
                  aprovado.
                </p>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500 text-neutral-950">
                Recurso Pro
              </span>
            </div>

            {/* Botões de Seleção de Paleta da Barbearia (Baseado em OFFICIAL_PALETTE) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {[
                { key: "amber", name: "Dourado Nobre (Padrão)" },
                { key: "emerald", name: "Verde Esmeralda" },
                { key: "ruby", name: "Vermelho Vintage" },
                { key: "sapphire", name: "Azul Safira" },
              ].map(({ key, name }) => {
                const isSelected = activeBrandTheme === key;
                // Pega automaticamente o tom 600 (cor primária de ação) da paleta oficial
                const primaryColor =
                  OFFICIAL_PALETTE[key]?.find(
                    (item) => item.token === "--brand-600",
                  )?.hex || "#d97706";

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setActiveBrandTheme(key);
                      setBrandTheme(key);
                      alert(
                        `🎨 IDENTIDADE DA MARCA APLICADA!\n\n• Paleta: ${name}\n• Cor Primária: ${primaryColor}\n• Validação WCAG: Aprovada com Contraste Seguro.`,
                      );
                    }}
                    className={`
                      p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer text-left
                      ${
                        isSelected
                          ? "bg-neutral-950 border-white text-white shadow-md scale-102"
                          : "bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200"
                      }
                    `}
                  >
                    <span
                      className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: primaryColor }}
                    />
                    <span className="truncate">{name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
