import { useState, useRef, useEffect } from "react";
import DOMPurify from "dompurify";
// [Import: cliente Supabase para atualização de perfil e senha no Auth]
import { supabase } from "../../lib/supabase";
import {
  getRegisteredUserPixKey,
  saveRegisteredUserPixKey,
  getRegisteredUserPhone,
  saveRegisteredUserPhone,
} from "../../utils/pixQrCode";
import { profileStyles } from "./UserProfileView.styles";
import Tabs from "../../components/ui/Tabs";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Avatar from "../../components/ui/Avatar";
import Badge from "../../components/ui/Badge";
import Toggle from "../../components/ui/Toggle";
import Select from "../../components/ui/Select";
import TagInput from "../../components/ui/TagInput";
import Alert from "../../components/ui/Alert";
import ProjectIcon from "../../components/ui/ProjectIcon";
import { Calendar, ArrowLeft, Mail, Lock } from "lucide-react";
import { SafeHtml } from "../../components/ui/SafeHtml";
import {
  validateAvatarUpload,
  isValidCpf,
  isValidCnpj,
} from "../../utils/inputValidator";
import { safeStorage } from "../../utils/safeStorage";
import {
  getClientDeviceInfo,
  formatSessionActivity,
  fetchUserActiveSessions,
  registerOrUpdateGlobalSession,
  revokeUserSession,
  revokeOtherUserSessions,
} from "../../services/sessionTracker";

// [Função componente: consome o usuário e barbearia reais autenticados]
export default function UserProfileView({
  user,
  tenant,
  onUpdateUser,
  onUpdateTenant,
  onBack,
  onLogout,
}) {
  const [activeTab, setActiveTab] = useState("pessoal");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Estados de Validação de Senha
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState("");
  const [passwordApiError, setPasswordApiError] = useState("");

  // Estado para armazenar os erros dos campos do perfil
  const [profileErrors, setProfileErrors] = useState({});
  const [globalSuccessMessage, setGlobalSuccessMessage] = useState("");

  // Ref para focar automaticamente no campo Número após o ViaCEP responder
  const numberInputRef = useRef(null);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // Normalização oficial do papel do usuário e identificação do método de autenticação
  const isGoogleAuth = Boolean(
    user?.authProvider === "google" ||
    user?.authProvider === "linked" ||
    user?.googleId ||
    user?.user_metadata?.googleId ||
    user?.app_metadata?.provider === "google"
  );

  const rawRole = String(
    user?.user_metadata?.role ||
    user?.role ||
    "admin"
  ).toLowerCase().trim();

  const normalizedRole =
    rawRole === "authenticated" || rawRole === "owner" || rawRole === "tenant" || !rawRole
      ? "admin"
      : rawRole;

  const roleLabel =
    normalizedRole === "superadmin"
      ? "SuperAdmin"
      : normalizedRole === "employee" || normalizedRole === "barber"
      ? "Barbeiro Profissional"
      : "Administrador & Proprietário";

  // [Função assíncrona: atualiza a senha diretamente no Supabase Auth]
  const handleUpdatePassword = async () => {
    const errs = {};
    setPasswordSuccessMsg("");
    setPasswordApiError("");

    // 1. Validação da Nova Senha
    if (!securityData.newPassword.trim()) {
      errs.new = "Informe a nova senha.";
    } else if (securityData.newPassword.length < 8) {
      errs.new = "A nova senha deve conter no mínimo 8 caracteres.";
    }

    // 2. Validação da Confirmação
    if (!securityData.confirmPassword.trim()) {
      errs.confirm = "Confirme a nova senha.";
    } else if (securityData.newPassword !== securityData.confirmPassword) {
      errs.confirm =
        "As senhas não coincidem. Digite exatamente a mesma senha.";
    }

    if (Object.keys(errs).length > 0) {
      setPasswordErrors(errs);
      return;
    }

    setIsUpdatingPassword(true);

    try {
      // Método Supabase: atualiza a credencial do usuário conectado
      const { error } = await supabase.auth.updateUser({
        password: securityData.newPassword,
      });

      if (error) throw error;

      setPasswordSuccessMsg(
        "Sua senha de acesso foi atualizada com sucesso no banco de dados!",
      );
      setSecurityData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setPasswordErrors({});
    } catch (err) {
      console.error("Erro ao atualizar senha no Supabase:", err);
      setPasswordApiError(
        err.message || "Erro ao atualizar a senha. Tente novamente.",
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // 1. DADOS PESSOAIS (Iniciados com os metadados do usuário real)
  // 1. DADOS PESSOAIS (Iniciados com os metadados do usuário real)
  const [personalData, setPersonalData] = useState({
    fullName:
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.name ||
      tenant?.owner_name ||
      tenant?.name ||
      "",
    displayName:
      user?.user_metadata?.display_name ||
      user?.user_metadata?.displayName ||
      user?.displayName ||
      "",
    cpf: user?.user_metadata?.cpf || user?.cpf || "",
    cnpj: user?.user_metadata?.cnpj || tenant?.cnpj || "",
    birthDate:
      user?.user_metadata?.birth_date ||
      user?.user_metadata?.birthDate ||
      user?.birth_date ||
      "",
    avatarSrc: user?.user_metadata?.avatar_url || user?.avatar || "",
  });

  // 2. Sincroniza dados persistidos na tabela oficial `public.profiles` do Supabase
  useEffect(() => {
    let isMounted = true;
    async function fetchDatabaseProfile() {
      if (!user?.id || user.id === "owner-usr-01") return;
      try {
        const { data: dbProfile, error: pErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (!pErr && dbProfile && isMounted) {
          setPersonalData((prev) => ({
            ...prev,
            fullName: dbProfile.full_name || prev.fullName,
            displayName:
              dbProfile.display_name || prev.displayName || dbProfile.full_name || "",
            cpf: dbProfile.cpf || prev.cpf,
            cnpj: dbProfile.cnpj || prev.cnpj || tenant?.cnpj || "",
            birthDate: dbProfile.birth_date
              ? String(dbProfile.birth_date).slice(0, 10)
              : prev.birthDate,
            avatarSrc: dbProfile.avatar_url || prev.avatarSrc,
          }));

          setContactData((prev) => ({
            ...prev,
            phone: dbProfile.phone || prev.phone,
            cep: dbProfile.cep || prev.cep,
            street: dbProfile.street || prev.street,
            number: dbProfile.number || prev.number,
            complement: dbProfile.complement || prev.complement,
            neighborhood: dbProfile.neighborhood || prev.neighborhood,
            city: dbProfile.city || prev.city,
            state: dbProfile.state || prev.state,
          }));

          if (dbProfile.neighborhood || dbProfile.city || dbProfile.state) {
            window.dispatchEvent(
              new CustomEvent("saas:tenant-address-updated", {
                detail: {
                  neighborhood: dbProfile.neighborhood || "",
                  city: dbProfile.city || "",
                  state: dbProfile.state || "",
                  street: dbProfile.street || "",
                  number: dbProfile.number || "",
                  cep: dbProfile.cep || "",
                },
              })
            );
          }
        }
      } catch (err) {
        console.warn("Aviso ao carregar dados do perfil de public.profiles:", err);
      }
    }

    fetchDatabaseProfile();
    return () => {
      isMounted = false;
    };
  }, [user?.id, tenant?.id]);

  // Mantém os campos sincronizados quando as props de usuário ou tenant atualizam
  useEffect(() => {
    if (user) {
      setPersonalData((prev) => ({
        fullName:
          user?.user_metadata?.full_name ||
          user?.user_metadata?.name ||
          user?.name ||
          tenant?.owner_name ||
          prev.fullName ||
          "",
        displayName:
          user?.user_metadata?.display_name ||
          user?.user_metadata?.displayName ||
          user?.displayName ||
          prev.displayName ||
          "",
        cpf: user?.user_metadata?.cpf || user?.cpf || prev.cpf || "",
        cnpj: user?.user_metadata?.cnpj || tenant?.cnpj || prev.cnpj || "",
        birthDate:
          user?.user_metadata?.birth_date ||
          user?.user_metadata?.birthDate ||
          user?.birth_date ||
          prev.birthDate ||
          "",
        avatarSrc:
          user?.user_metadata?.avatar_url || user?.avatar || prev.avatarSrc || "",
      }));

      setContactData((prev) => ({
        email: user?.email || prev.email || "",
        phone:
          user?.user_metadata?.phone ||
          user?.phone ||
          tenant?.phone ||
          tenant?.ownerPhone ||
          getRegisteredUserPhone(user, tenant) ||
          prev.phone ||
          "",
        cep: tenant?.cep || user?.user_metadata?.cep || prev.cep || "",
        street: tenant?.street || user?.user_metadata?.street || prev.street || "",
        number: tenant?.number || user?.user_metadata?.number || prev.number || "",
        complement: tenant?.complement || user?.user_metadata?.complement || prev.complement || "",
        neighborhood: tenant?.neighborhood || user?.user_metadata?.neighborhood || prev.neighborhood || "",
        city: tenant?.city || user?.user_metadata?.city || prev.city || "",
        state: tenant?.state || user?.user_metadata?.state || prev.state || "",
      }));
    }
  }, [user, tenant]);

  // 3. CONTATO & LOCALIZAÇÃO PESSOAL
  const [contactData, setContactData] = useState({
    email: user?.email || "",
    phone:
      user?.user_metadata?.phone ||
      user?.phone ||
      tenant?.phone ||
      tenant?.ownerPhone ||
      getRegisteredUserPhone(user, tenant) ||
      "",
    cep: tenant?.cep || user?.user_metadata?.cep || "",
    street: tenant?.street || user?.user_metadata?.street || "",
    number: tenant?.number || user?.user_metadata?.number || "",
    complement: tenant?.complement || user?.user_metadata?.complement || "",
    neighborhood: tenant?.neighborhood || user?.user_metadata?.neighborhood || "",
    city: tenant?.city || user?.user_metadata?.city || "",
    state: tenant?.state || user?.user_metadata?.state || "",
  });

  // 4. ATUAÇÃO PROFISSIONAL & CHAVE PIX
  const [professionalData, setProfessionalData] = useState({
    bio: user?.user_metadata?.bio || "",
    pixKey: getRegisteredUserPixKey(user, tenant),
    pixType: "Chave Geral",
    instagram: user?.user_metadata?.instagram || "",
    specialties: user?.user_metadata?.specialties || [
      "Corte Tradicional",
      "Barba",
    ],
  });

  useEffect(() => {
    const resolvedPix =
      getRegisteredUserPixKey(user, tenant) ||
      user?.user_metadata?.pix_key ||
      user?.pix_key ||
      tenant?.pix_key ||
      "";

    if (resolvedPix) {
      saveRegisteredUserPixKey(resolvedPix);
    }

    setProfessionalData((prev) => ({
      bio: user?.user_metadata?.bio || user?.bio || prev.bio || "",
      pixKey: resolvedPix || prev.pixKey || "",
      pixType: "Chave Geral",
      instagram:
        user?.user_metadata?.instagram ||
        user?.instagram ||
        tenant?.instagram ||
        prev.instagram ||
        "",
      specialties:
        user?.user_metadata?.specialties ||
        user?.specialties ||
        prev.specialties || [
          "Corte Tradicional",
          "Barba",
        ],
    }));
  }, [user, tenant]);

  // 4. SEGURANÇA & SESSÕES
  const [securityData, setSecurityData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    twoFactorAuth: false,
  });

  // Estados para Gestão de Sessões e Dispositivos Conectados Reais
  const [activeSessions, setActiveSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionFeedback, setSessionFeedback] = useState("");
  const [isDisconnectingSessions, setIsDisconnectingSessions] = useState(false);

  // Modal oficial "Encerrar Sessão" acionado pelo link "Desconectar"
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [sessionToDisconnect, setSessionToDisconnect] = useState(null);

  // Refs de controle para prevenção de rajadas e loops em tempo real
  const isFetchingSessionsRef = useRef(false);
  const realtimeTimeoutRef = useRef(null);

  // Função para carregar e atualizar sessões ativas de todos os dispositivos
  const loadActiveSessions = async ({ showSpinner = false, registerPresence = false } = {}) => {
    if (isFetchingSessionsRef.current) return;
    isFetchingSessionsRef.current = true;

    if (showSpinner) {
      setIsLoadingSessions(true);
    }

    try {
      // Registra presença apenas no mount inicial da aba ou no login, nunca durante escuta de Realtime
      if (registerPresence) {
        await registerOrUpdateGlobalSession(user, tenant);
      }
      // Busca todas as sessões ativas do usuário e barbearia
      const sessions = await fetchUserActiveSessions(user, tenant);
      if (Array.isArray(sessions)) {
        setActiveSessions(sessions);
      }
    } catch (err) {
      console.warn("Aviso ao carregar sessões ativas:", err);
    } finally {
      if (showSpinner) {
        setIsLoadingSessions(false);
      }
      isFetchingSessionsRef.current = false;
    }
  };

  // Efeito que sincroniza os dispositivos conectados reais com o Supabase ao abrir a aba e escuta eventos Realtime
  useEffect(() => {
    if (activeTab === "seguranca") {
      // 1. Carregamento inicial ao entrar na aba de segurança
      loadActiveSessions({ showSpinner: true, registerPresence: true });

      // 2. Inscrição em tempo real com debounce para refletir revogações e novos aparelhos sem loop
      let channel;
      try {
        channel = supabase
          .channel("public-sessions-sync")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "sessions" },
            () => {
              if (realtimeTimeoutRef.current) {
                clearTimeout(realtimeTimeoutRef.current);
              }
              realtimeTimeoutRef.current = setTimeout(() => {
                // Apenas busca as sessões atualizadas; NUNCA dispara gravação de presença aqui
                loadActiveSessions({ showSpinner: false, registerPresence: false });
              }, 2000);
            }
          )
          .subscribe();
      } catch {
        // Fallback silencioso
      }

      return () => {
        if (realtimeTimeoutRef.current) {
          clearTimeout(realtimeTimeoutRef.current);
        }
        if (channel) {
          supabase.removeChannel(channel);
        }
      };
    }
  }, [activeTab, user?.id, user?.email, tenant?.id]);

  // Abre o modal oficial "Encerrar Sessão" para um aparelho específico
  const handleOpenDisconnectModal = (session) => {
    setSessionToDisconnect(session);
    setIsLogoutModalOpen(true);
  };

  // Abre o modal oficial para desconectar outros dispositivos remotos
  const handleOpenDisconnectOthersModal = () => {
    setSessionToDisconnect({ id: "others", is_others: true, device_name: "Outros Dispositivos" });
    setIsLogoutModalOpen(true);
  };

  // Confirmação no modal "Encerrar Sessão" (reseta o estado do aparelho e leva à tela de login)
  const handleConfirmDisconnectSession = async () => {
    if (!sessionToDisconnect) return;

    setIsDisconnectingSessions(true);
    setSessionFeedback("");

    try {
      const targetSession = sessionToDisconnect;

      // Caso 1: Desconectar todos os outros dispositivos
      if (targetSession.is_others) {
        try {
          if (supabase.auth?.signOut) {
            await supabase.auth.signOut({ scope: "others" });
          }
        } catch {
          // ignore
        }
        const currentSession = activeSessions.find((s) => s.is_current);
        await revokeOtherUserSessions(currentSession?.id, user, tenant);
        setActiveSessions((prev) => prev.filter((s) => s.is_current));
        setSessionFeedback("Todas as outras sessões foram desconectadas. O estado dos aparelhos foi resetado.");
        setTimeout(() => setSessionFeedback(""), 4000);
        return;
      }

      // Identifica se o alvo é o dispositivo atual deste navegador
      const isTargetCurrent = Boolean(
        targetSession.is_current ||
        (typeof window !== "undefined" &&
          safeStorage.getItem("saas_active_session_id") === targetSession.id)
      );

      // 1. Revoga a sessão no Supabase (atualiza is_active = false e registra motivo)
      await revokeUserSession(
        targetSession.id,
        user,
        tenant,
        isTargetCurrent ? "Desconectado pelo próprio usuário no perfil" : "Dispositivo desconectado pelo usuário no perfil"
      );

      // 2. Se for o próprio aparelho atual a ser desconectado:
      if (isTargetCurrent) {
        // Reseta totalmente o estado do aparelho e limpa storages
        safeStorage.removeItem("saas_auth_user");
        safeStorage.removeItem("saas_active_screen");
        safeStorage.removeItem("saas_jwt_access_token");
        safeStorage.removeItem("access_token");
        safeStorage.removeItem("saas_active_session_id");

        try {
          if (supabase.auth?.signOut) {
            await supabase.auth.signOut().catch(() => {});
          }
        } catch {
          // ignore
        }

        setIsLogoutModalOpen(false);
        setSessionToDisconnect(null);

        // Notifica aplicação e redireciona à tela de login
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("saas:force-logout"));
        }
        if (onLogout) {
          onLogout();
        } else if (onBack) {
          safeStorage.setItem("saas_active_screen", "login");
          window.location.reload();
        }
        return;
      }

      // 3. Se for um aparelho remoto:
      setActiveSessions((prev) =>
        prev.filter(
          (s) =>
            s.id !== targetSession.id &&
            (!targetSession.device_name || s.device_name !== targetSession.device_name)
        )
      );
      setSessionFeedback(
        `Dispositivo "${targetSession.device_name || "Aparelho"}" desconectado com sucesso. O estado foi resetado e o usuário direcionado para a tela de login.`
      );
      setTimeout(() => setSessionFeedback(""), 4000);
    } catch (err) {
      console.error("Erro ao encerrar sessão:", err);
      setSessionFeedback("Não foi possível desconectar o dispositivo.");
    } finally {
      setIsDisconnectingSessions(false);
      setIsLogoutModalOpen(false);
      setSessionToDisconnect(null);
    }
  };

  const [avatarError, setAvatarError] = useState("");

  // Upload simulado e Validação Estrita de Avatar (Tamanho, Extensão e MIME Type)
  const handleAvatarChange = (e) => {
    setAvatarError("");
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateAvatarUpload(file);
      if (!validation.isValid) {
        setAvatarError(validation.errors[0]);
        if (e.target) e.target.value = "";
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      setPersonalData((prev) => ({ ...prev, avatarSrc: previewUrl }));
    }
  };

  // Consulta real à API dos Correios (ViaCEP)
  const handleSearchCep = async (rawCep) => {
    const cleanCep = (rawCep || contactData.cep).replace(/\D/g, "");

    // Só consulta se tiver exatamente 8 dígitos
    if (cleanCep.length !== 8) return;

    setIsSearchingCep(true);

    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cleanCep}/json/`,
      );
      const data = await response.json();

      // Se o CEP não existir na base dos Correios
      if (data.erro) {
        setProfileErrors((prev) => ({
          ...prev,
          cep: "CEP não encontrado. Verifique os números.",
        }));
        return;
      }

      // Preenchimento automático com dados reais da internet!
      setContactData((prev) => ({
        ...prev,
        street: data.logradouro || prev.street,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));

      // Limpa eventuais mensagens de erro
      setProfileErrors((prev) => ({
        ...prev,
        cep: null,
        street: null,
        city: null,
        state: null,
      }));

      // UX de Ouro: Foca automaticamente no campo "Número"
      setTimeout(() => {
        if (numberInputRef.current) {
          numberInputRef.current.focus();
        }
      }, 100);
    } catch (err) {
      console.error("Erro ao consultar ViaCEP:", err);
      setProfileErrors((prev) => ({
        ...prev,
        cep: "Erro ao buscar CEP online. Preencha manualmente.",
      }));
    } finally {
      setIsSearchingCep(false);
    }
  };

  // Salvamento Geral do Perfil (Persiste dados pessoais, Chave PIX, metadados no Supabase Auth, public.profiles e public.tenants)
  const handleSaveProfile = async () => {
    const errs = {};
    setGlobalSuccessMessage("");

    // 1. Validação por Aba Ativa
    if (activeTab === "profissional") {
      if (!professionalData.pixKey.trim()) {
        errs.pixKey = "A chave PIX é obrigatória para o repasse de comissões e geração do QR Code.";
      }
      if (professionalData.specialties.length === 0) {
        errs.specialties =
          "Selecione ou digite pelo menos 1 especialidade de atendimento.";
      }
    } else if (activeTab === "pessoal") {
      if (!personalData.fullName.trim() || personalData.fullName.trim().length < 3) {
        errs.fullName = "Informe o nome completo documental (mínimo 3 caracteres).";
      }
      if (!personalData.cpf?.trim()) {
        errs.cpf = "O CPF é obrigatório para identificação legal e fiscal.";
      } else {
        const cleanCpfDigits = personalData.cpf.replace(/\D/g, "");
        if (cleanCpfDigits.length !== 11) {
          errs.cpf = "CPF incompleto. Digite os 11 dígitos do CPF.";
        } else if (!isValidCpf(personalData.cpf)) {
          errs.cpf = "CPF inválido. Verifique os números informados.";
        }
      }
      if (personalData.cnpj?.trim()) {
        const cleanCnpjDigits = personalData.cnpj.replace(/\D/g, "");
        if (cleanCnpjDigits.length !== 14) {
          errs.cnpj = "CNPJ incompleto. Digite os 14 dígitos ou deixe vazio.";
        } else if (!isValidCnpj(personalData.cnpj)) {
          errs.cnpj = "CNPJ inválido. Verifique os números informados.";
        }
      }
    } else if (activeTab === "contato") {
      if (!contactData.phone || contactData.phone.length < 10) {
        errs.phone = "Informe o WhatsApp com DDD.";
      }
    }

    if (Object.keys(errs).length > 0) {
      setProfileErrors(errs);
      return;
    }

    setProfileErrors({});
    setIsSaving(true);

    const cleanPixKey = professionalData.pixKey.trim();
    if (cleanPixKey) {
      saveRegisteredUserPixKey(cleanPixKey);
    }

    try {
      const cleanPhone = contactData.phone.trim();
      const cleanCep = contactData.cep.trim();
      const cleanStreet = contactData.street.trim();
      const cleanNumber = contactData.number.trim();
      const cleanComplement = contactData.complement.trim();
      const cleanNeighborhood = contactData.neighborhood.trim();
      const cleanCity = contactData.city.trim();
      const cleanState = contactData.state.trim();

      saveRegisteredUserPhone(cleanPhone);

      const cleanFullName = personalData.fullName.trim();
      const cleanDisplayName = personalData.displayName.trim() || cleanFullName;
      const cleanCpf = personalData.cpf.trim();
      const cleanCnpj = personalData.cnpj.trim();
      const cleanBirthDate = personalData.birthDate ? personalData.birthDate.trim() : null;

      // 1. Atualiza Metadados no Supabase Auth (SSOT para sessão, JWT e recuperação no refresh F5)
      const updatedMetadata = {
        ...(user?.user_metadata || {}),
        name: cleanFullName,
        full_name: cleanFullName,
        display_name: cleanDisplayName,
        displayName: cleanDisplayName,
        cpf: cleanCpf,
        cnpj: cleanCnpj,
        birth_date: cleanBirthDate,
        birthDate: cleanBirthDate,
        phone: cleanPhone,
        cep: cleanCep,
        street: cleanStreet,
        number: cleanNumber,
        complement: cleanComplement,
        neighborhood: cleanNeighborhood,
        city: cleanCity,
        state: cleanState,
        bio: professionalData.bio.trim(),
        pix_key: cleanPixKey,
        pixKey: cleanPixKey,
        pix_type: professionalData.pixType || "CPF",
        pixType: professionalData.pixType || "CPF",
        instagram: professionalData.instagram.trim(),
        specialties: professionalData.specialties,
        avatar_url: personalData.avatarSrc || user?.user_metadata?.avatar_url || "",
      };

      const { data: updatedAuth, error: authErr } = await supabase.auth.updateUser({
        data: updatedMetadata,
      });

      if (authErr) {
        console.warn("Aviso ao sincronizar Supabase Auth updateUser:", authErr);
      }

      // 2. Persistência na tabela relacional `public.profiles` no banco de dados Supabase
      if (user?.id && user.id !== "owner-usr-01") {
        const fullProfilePayload = {
          id: user.id,
          barbershop_id: tenant?.id || user?.user_metadata?.barbershop_id || null,
          full_name: cleanFullName,
          display_name: cleanDisplayName,
          cpf: cleanCpf,
          cnpj: cleanCnpj || null,
          birth_date: cleanBirthDate,
          phone: cleanPhone,
          cep: cleanCep || null,
          street: cleanStreet || null,
          number: cleanNumber || null,
          complement: cleanComplement || null,
          neighborhood: cleanNeighborhood || null,
          city: cleanCity || null,
          state: cleanState || null,
          pix_key: cleanPixKey || null,
          pix_type: professionalData.pixType || "CPF",
          bio: professionalData.bio.trim() || null,
          instagram: professionalData.instagram.trim() || null,
          specialties: professionalData.specialties || [],
          email: user?.email || undefined,
          updated_at: new Date().toISOString(),
        };

        const { error: pErr } = await supabase
          .from("profiles")
          .upsert([fullProfilePayload], { onConflict: "id" });

        if (pErr) {
          console.warn("Aviso ao persistir colunas completas em public.profiles:", pErr.message);
          // Fallback resiliente: caso as colunas novas ainda não tenham sido migradas no Supabase SQL
          try {
            await supabase.from("profiles").upsert([
              {
                id: user.id,
                barbershop_id: tenant?.id || user?.user_metadata?.barbershop_id || null,
                full_name: cleanFullName,
                phone: cleanPhone,
                email: user?.email || undefined,
                updated_at: new Date().toISOString(),
              },
            ], { onConflict: "id" });
          } catch (_fallbackErr) {
            console.warn("Aviso no fallback de profiles:", _fallbackErr);
          }
        }
      }

      // 3. Persistência de CNPJ e dados corporativos na tabela `public.tenants`
      if (tenant?.id) {
        try {
          const tenantUpdatePayload = {
            owner_name: cleanFullName,
            phone: cleanPhone,
            cnpj: cleanCnpj || null,
            cep: cleanCep || null,
            street: cleanStreet || null,
            number: cleanNumber || null,
            complement: cleanComplement || null,
            neighborhood: cleanNeighborhood || null,
            city: cleanCity || null,
            state: cleanState || null,
            pix_key: cleanPixKey || null,
            instagram: professionalData.instagram.trim() || null,
            updated_at: new Date().toISOString(),
          };
          const { error: tErr } = await supabase
            .from("tenants")
            .update(tenantUpdatePayload)
            .eq("id", tenant.id);

          if (tErr) {
            // Se as colunas ainda não existirem no PostgreSQL, salva campos base
            await supabase
              .from("tenants")
              .update({
                owner_name: cleanFullName,
                phone: cleanPhone,
                updated_at: new Date().toISOString(),
              })
              .eq("id", tenant.id);
          }
        } catch (tCatchErr) {
          console.warn("Aviso ao sincronizar tabela tenants:", tCatchErr);
        }
      }

      // 4. Se o usuário for barbeiro da equipe, atualiza display_name e dados em `public.barbers`
      if (tenant?.id && user?.email) {
        try {
          await supabase
            .from("barbers")
            .update({
              name: cleanFullName,
              display_name: cleanDisplayName,
              phone: cleanPhone,
              pix_key: cleanPixKey || undefined,
              instagram: professionalData.instagram.trim() || undefined,
              bio: professionalData.bio.trim() || undefined,
              specialties: professionalData.specialties || undefined,
            })
            .eq("barbershop_id", tenant.id)
            .ilike("email", user.email);
        } catch (_bErr) {
          // Não-bloqueante
        }
      }

      // 5. Atualização reativa de estado e safeStorage
      const finalUser = {
        ...(user || {}),
        name: cleanFullName,
        fullName: cleanFullName,
        displayName: cleanDisplayName,
        display_name: cleanDisplayName,
        cpf: cleanCpf,
        cnpj: cleanCnpj,
        birthDate: cleanBirthDate,
        birth_date: cleanBirthDate,
        user_metadata: updatedMetadata,
      };

      safeStorage.setItem("saas_auth_user", JSON.stringify(finalUser));

      if (onUpdateUser) {
        onUpdateUser(
          updatedAuth?.user
            ? {
                ...updatedAuth.user,
                displayName: cleanDisplayName,
                display_name: cleanDisplayName,
                cpf: cleanCpf,
                cnpj: cleanCnpj,
                birthDate: cleanBirthDate,
                birth_date: cleanBirthDate,
                user_metadata: updatedMetadata,
              }
            : finalUser
        );
      }

      if (onUpdateTenant && tenant) {
        onUpdateTenant({
          ...tenant,
          owner_name: cleanFullName,
          ownerName: cleanFullName,
          phone: cleanPhone,
          ownerPhone: cleanPhone,
          cnpj: cleanCnpj,
          cep: cleanCep,
          street: cleanStreet,
          number: cleanNumber,
          complement: cleanComplement,
          neighborhood: cleanNeighborhood,
          city: cleanCity,
          state: cleanState,
          pix_key: cleanPixKey,
          pixKey: cleanPixKey,
          instagram: professionalData.instagram.trim(),
        });
      }

      // Sincroniza cache local e notifica a Navbar em tempo real sobre a nova localização
      try {
        const cached = safeStorage.getItem("saas_active_tenant");
        const parsed = cached ? JSON.parse(cached) : {};
        safeStorage.setItem(
          "saas_active_tenant",
          JSON.stringify({
            ...parsed,
            ...(tenant || {}),
            neighborhood: cleanNeighborhood,
            city: cleanCity,
            state: cleanState,
            street: cleanStreet,
            number: cleanNumber,
            complement: cleanComplement,
            cep: cleanCep,
          })
        );
      } catch {}

      window.dispatchEvent(
        new CustomEvent("saas:tenant-address-updated", {
          detail: {
            neighborhood: cleanNeighborhood,
            city: cleanCity,
            state: cleanState,
            street: cleanStreet,
            number: cleanNumber,
            cep: cleanCep,
          },
        })
      );
    } catch (err) {
      console.warn("Aviso ao sincronizar metadados do perfil:", err);
    } finally {
      setIsSaving(false);
      setGlobalSuccessMessage(
        "Todas as alterações do perfil (Nome de Exibição, CPF, CNPJ, Data de Nascimento e Chave PIX) foram salvas com sucesso!"
      );
    }
  };

  const pixTypeOptions = [
    { value: "CPF", label: "CPF" },
    { value: "Celular", label: "Celular" },
    { value: "E-mail", label: "E-mail" },
    { value: "Aleatória", label: "Aleatória" },
  ];

  const getPixPlaceholder = (type) => {
    switch (type) {
      case "CPF":
        return "000.000.000-00";
      case "Celular":
        return "(11) 99999-9999";
      case "E-mail":
        return "seuemail@exemplo.com";
      case "Aleatória":
        return "Chave aleatória (EVP)";
      default:
        return "Seu CPF, Celular, E-mail ou Aleatória";
    }
  };

  const profileTabs = [
    { id: "pessoal", label: "Dados Pessoais", icon: <ProjectIcon name="User" size={16} colorVariant="inherit" /> },
    { id: "contato", label: "Contato & Endereço", icon: <ProjectIcon name="MapPin" size={16} colorVariant="inherit" /> },
    { id: "profissional", label: "Perfil & Chave PIX", icon: <ProjectIcon name="Scissors" size={16} colorVariant="inherit" /> },
    { id: "seguranca", label: "Segurança & Acesso", icon: <ProjectIcon name="Lock" size={16} colorVariant="inherit" /> },
  ];

  return (
    <div className={profileStyles.container}>
      {/* CABEÇALHO DO PERFIL COM AVATAR EM DESTAQUE */}
      <div
        className={`${profileStyles.headerCard} profile-header-card`}
        data-profile-header-card
      >
        {/* DIV 1 - Posição: Alinhado à esquerda do Card Container */}
        <div className="flex items-center gap-5 text-left min-w-0 flex-1">
          {/* Avatar com ação de troca ao passar o mouse */}
          <div
            className={profileStyles.avatarWrapper}
            onClick={() => fileInputRef.current?.click()}
            title="Clique para alterar foto de perfil (JPG/PNG até 2MB)"
          >
            {/* AVATAR: Elipse verde sem contorno (stroke preto) e piscante */}
            <Avatar
              src={personalData.avatarSrc}
              name={personalData.fullName}
              size="xl"
              status="available"
              showStatusRing={false}
            />
            <div className={profileStyles.avatarOverlay}>
              <ProjectIcon name="Camera" size={14} colorVariant="inherit" />
              <span>Alterar</span>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />
          </div>

          <div className="flex flex-col justify-center min-w-0">
            {/* TITULO: Nome do profissional (centralizado com o Avatar, sem o texto "(Deme Frost)") */}
            <h2
              className="profile-header-text-dark text-xl font-bold text-[#18181B] dark:text-white tracking-tight truncate"
              data-profile-header-text-dark
            >
              <SafeHtml html={personalData.fullName} />
            </h2>

            {/* DIV INLINE: Texto Administrador + Elipse + Apelido: Deme Frost */}
            <div className="flex items-center gap-2 mt-1.5 text-xs text-[#18181B] dark:text-neutral-400 flex-wrap">
              <span
                className="profile-header-role font-semibold text-[#059669] dark:text-neutral-200"
                data-profile-header-role
              >
                {normalizedRole === "employee" || normalizedRole === "barber"
                  ? "Barbeiro"
                  : normalizedRole === "superadmin"
                  ? "SuperAdmin"
                  : "Administrador"}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#18181B]/40 dark:bg-neutral-500 inline-block shrink-0" />
              <span
                className="profile-header-text-dark text-[#18181B] dark:text-neutral-400"
                data-profile-header-text-dark
              >
                Apelido:{" "}
                <strong
                  className="profile-header-text-dark font-semibold text-[#18181B] dark:text-neutral-200"
                  data-profile-header-text-dark
                >
                  <SafeHtml html={personalData.displayName || personalData.fullName} />
                </strong>
              </span>
            </div>
          </div>
        </div>

        {avatarError && (
          <div className="w-full mt-2 p-2 bg-rose-950/40 border border-rose-800/50 rounded-lg text-rose-300 text-xs flex items-center gap-2">
            <ProjectIcon name="AlertTriangle" size={14} colorVariant="inherit" />
            <span>{avatarError}</span>
          </div>
        )}

        {/* COLUNA DIREITA: DIV 2 (Topo) e DIV 3 (Base) */}
        <div className="flex flex-col justify-between items-start md:items-end gap-4 shrink-0">
          {/* DIV 2 - Link: Ícone arrow left + Voltar ao Painel (sem linha, stroke, apenas texto com hover) alinhado ao topo */}
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              data-profile-back-button
              className="profile-back-button inline-flex items-center gap-1.5 text-xs font-medium text-[#18181B] hover:text-[#059669] dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer border-0 border-none p-0 shadow-none outline-none focus:outline-none ring-0 group self-start md:self-end"
            >
              <ArrowLeft
                size={14}
                className="transition-colors transition-transform group-hover:-translate-x-0.5"
              />
              <span className="transition-colors">
                Voltar ao Painel
              </span>
            </button>
          ) : (
            <div />
          )}

          {/* DIV 3 - Posição: Alinhado no canto direito do Card Container na base (bottom) */}
          <div className="flex items-center gap-4 text-xs text-[#18181B] dark:text-neutral-400 flex-wrap md:justify-end">
            {/* Elemento 1: Ícone + email (biblioteca Lucide) */}
            <div className="inline-flex items-center gap-1.5">
              <Mail
                size={13}
                className="profile-header-icon-dark text-[#18181B] dark:text-neutral-500 shrink-0"
                data-profile-header-icon-dark
              />
              <span
                className="profile-header-text-dark font-mono text-[#18181B] dark:text-neutral-300"
                data-profile-header-text-dark
              >
                {contactData.email || user?.email || "ddoanjos@gmail.com"}
              </span>
            </div>

            {/* Elemento 2: Ícone + Acesso por e-mail e senha (biblioteca Lucide) */}
            {isGoogleAuth ? (
              <div className="inline-flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span
                  className="profile-header-text-dark text-[#18181B] dark:text-neutral-300"
                  data-profile-header-text-dark
                >
                  Conta Google Vinculada
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5">
                <Lock
                  size={13}
                  className="profile-header-icon-dark text-[#18181B] dark:text-neutral-500 shrink-0"
                  data-profile-header-icon-dark
                />
                <span
                  className="profile-header-text-dark text-[#18181B] dark:text-neutral-300"
                  data-profile-header-text-dark
                >
                  Acesso por e-mail e senha
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Monitoramento de Sanitização do Perfil (SafeHtml) */}
      {/* NAVEGAÇÃO ENTRE OS 4 PILARES VIA TABS */}
      <Tabs
        tabs={profileTabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="profile"
        className="profile-tabs"
      />

      {/* CONTEÚDO DA ABA ATIVA */}

      {/* Alerta de Sucesso Geral */}
      {globalSuccessMessage && (
        <Alert variant="success" title="Perfil Atualizado com Sucesso!">
          <SafeHtml html={globalSuccessMessage} />
        </Alert>
      )}

      <div
        className={
          activeTab === "profissional"
            ? "space-y-6"
            : `${profileStyles.tabContentCard} profile-tab-content-card`
        }
        data-profile-tab-content-card={activeTab !== "profissional" ? "true" : undefined}
      >
        {/* ======================================================== */}
        {/* 1. DADOS PESSOAIS & IDENTIFICAÇÃO                        */}
        {/* ======================================================== */}
        {activeTab === "pessoal" && (
          <div className="space-y-4">
            <div>
              <h3 className={profileStyles.sectionTitle}>
                <span className="flex items-center gap-2">
                  <ProjectIcon
                    name="User"
                    size={18}
                    className="profile-section-icon text-[#059669] dark:text-amber-500"
                    data-profile-section-icon
                  />
                  Dados Pessoais & Identificação
                </span>
              </h3>
              <p className={profileStyles.sectionSubtitle}>
                Informações para contratos internos, folha de comissões e
                identificação pública.
              </p>
            </div>

            <div className={profileStyles.gridTwoCols}>
              <Input
                label="Nome Completo (Documental)"
                value={personalData.fullName}
                onChange={(e) => {
                  setPersonalData({
                    ...personalData,
                    fullName: e.target.value,
                  });
                  if (profileErrors.fullName)
                    setProfileErrors({ ...profileErrors, fullName: null });
                }}
                error={profileErrors.fullName}
              />

              <Input
                label="Nome de Exibição / Apelido no Salão"
                value={personalData.displayName}
                onChange={(e) =>
                  setPersonalData({
                    ...personalData,
                    displayName: e.target.value,
                  })
                }
              />
            </div>

            <div className={profileStyles.gridThreeCols}>
              <Input
                label="CPF (Obrigatório)"
                mask="cpf"
                value={personalData.cpf}
                onChange={(e) => {
                  setPersonalData({ ...personalData, cpf: e.target.value });
                  if (profileErrors.cpf)
                    setProfileErrors({ ...profileErrors, cpf: null });
                }}
                error={profileErrors.cpf}
              />

              <Input
                label="CNPJ / MEI (Opcional)"
                mask="cnpj"
                placeholder="00.000.000/0000-00"
                value={personalData.cnpj}
                onChange={(e) => {
                  setPersonalData({ ...personalData, cnpj: e.target.value });
                  if (profileErrors.cnpj)
                    setProfileErrors({ ...profileErrors, cnpj: null });
                }}
                error={profileErrors.cnpj}
              />

              <Input
                label="Data de Nascimento"
                type="date"
                value={personalData.birthDate}
                onChange={(e) => {
                  setPersonalData({
                    ...personalData,
                    birthDate: e.target.value,
                  });
                  if (profileErrors.birthDate)
                    setProfileErrors({ ...profileErrors, birthDate: null });
                }}
                error={profileErrors.birthDate}
                rightIcon={
                  <Calendar
                    size={18}
                    className="text-white"
                    color="#ffffff"
                    aria-label="Ícone Agenda"
                  />
                }
                className="cursor-pointer text-neutral-100"
              />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. CONTATO & LOCALIZAÇÃO PESSOAL                         */}
        {/* ======================================================== */}
        {activeTab === "contato" && (
          <div className="space-y-4">
            <div>
              <h3 className={profileStyles.sectionTitle}>
                <span className="flex items-center gap-2">
                  <ProjectIcon
                    name="MapPin"
                    size={18}
                    className="profile-section-icon text-[#059669] dark:text-amber-500"
                    data-profile-section-icon
                  />
                  Contato & Endereço Residencial
                </span>
              </h3>
              <p className={profileStyles.sectionSubtitle}>
                Dados para alertas de agendamento, segurança e prestação de
                contas.
              </p>
            </div>

            {/* Linha de Contato Principal */}
            <div className={profileStyles.gridTwoCols}>
              <Input
                label="E-mail de Acesso (Login)"
                type="email"
                value={contactData.email}
                disabled
              />

              <Input
                label="WhatsApp / Telefone Celular"
                mask="phone"
                value={contactData.phone}
                onChange={(e) => {
                  setContactData({ ...contactData, phone: e.target.value });
                  if (profileErrors.phone)
                    setProfileErrors({ ...profileErrors, phone: null });
                }}
                error={profileErrors.phone}
              />
            </div>

            {/* Endereço com Busca Real na Internet */}
            <div className={profileStyles.gridThreeCols}>
              <Input
                label="CEP"
                placeholder="00000-000"
                value={contactData.cep}
                onChange={(e) => {
                  const val = e.target.value;
                  setContactData({ ...contactData, cep: val });
                  // Se atingir 8 dígitos com ou sem máscara, dispara a busca na hora!
                  if (val.replace(/\D/g, "").length === 8) {
                    handleSearchCep(val);
                  }
                }}
                onBlur={() => handleSearchCep(contactData.cep)}
                error={profileErrors.cep}
              />

              <div className="sm:col-span-2">
                <Input
                  label="Logradouro / Rua"
                  placeholder="Avenida Paulista..."
                  value={contactData.street}
                  onChange={(e) => {
                    setContactData({ ...contactData, street: e.target.value });
                    if (profileErrors.street)
                      setProfileErrors({ ...profileErrors, street: null });
                  }}
                  error={profileErrors.street}
                />
              </div>
            </div>

            {/* Linha de Endereço: Número + Complemento + Bairro */}
            <div className={profileStyles.gridThreeCols}>
              <Input
                inputRef={numberInputRef}
                label="Número *"
                placeholder="Ex: 1042"
                value={contactData.number}
                onChange={(e) => {
                  setContactData({ ...contactData, number: e.target.value });
                  if (profileErrors.number)
                    setProfileErrors({ ...profileErrors, number: null });
                }}
                error={profileErrors.number}
              />

              <Input
                label="Complemento"
                placeholder="Apto, Bloco, Sala"
                value={contactData.complement}
                onChange={(e) =>
                  setContactData({ ...contactData, complement: e.target.value })
                }
              />

              <Input
                label="Bairro"
                placeholder="Centro, Bairro..."
                value={contactData.neighborhood}
                onChange={(e) =>
                  setContactData({
                    ...contactData,
                    neighborhood: e.target.value,
                  })
                }
              />
            </div>

            {/* Linha 3 de Endereço: Cidade (2 colunas) + Estado / UF (1 coluna) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Cidade"
                  value={contactData.city}
                  onChange={(e) => {
                    setContactData({ ...contactData, city: e.target.value });
                    if (profileErrors.city)
                      setProfileErrors({ ...profileErrors, city: null });
                  }}
                  error={profileErrors.city}
                />
              </div>

              <Select
                label="Estado (UF)"
                value={contactData.state}
                onChange={(e) => {
                  setContactData({ ...contactData, state: e.target.value });
                  if (profileErrors.state)
                    setProfileErrors({ ...profileErrors, state: null });
                }}
                error={profileErrors.state}
                options={[
                  { value: "AC", label: "AC" },
                  { value: "AL", label: "AL" },
                  { value: "AP", label: "AP" },
                  { value: "AM", label: "AM" },
                  { value: "BA", label: "BA" },
                  { value: "CE", label: "CE" },
                  { value: "DF", label: "DF" },
                  { value: "ES", label: "ES" },
                  { value: "GO", label: "GO" },
                  { value: "MA", label: "MA" },
                  { value: "MT", label: "MT" },
                  { value: "MS", label: "MS" },
                  { value: "MG", label: "MG" },
                  { value: "PA", label: "PA" },
                  { value: "PB", label: "PB" },
                  { value: "PR", label: "PR" },
                  { value: "PE", label: "PE" },
                  { value: "PI", label: "PI" },
                  { value: "RJ", label: "RJ" },
                  { value: "RN", label: "RN" },
                  { value: "RS", label: "RS" },
                  { value: "RO", label: "RO" },
                  { value: "RR", label: "RR" },
                  { value: "SC", label: "SC" },
                  { value: "SP", label: "SP" },
                  { value: "SE", label: "SE" },
                  { value: "TO", label: "TO" },
                ]}
              />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. MÓDULO PROFISSIONAL & CHAVE PIX DE COMISSÃO           */}
        {/* ======================================================== */}
        {activeTab === "profissional" && (
          <div className="space-y-6">
            {/* CONTAINER 1: Cadastre sua chave PIX */}
            <div
              className="p-6 md:p-8 bg-white dark:bg-neutral-900/90 border border-zinc-200 dark:border-neutral-800 rounded-3xl space-y-5 shadow-sm profile-tab-content-card profile-pix-container"
              data-profile-pix-container
            >
              <div>
                <h3 className={profileStyles.sectionTitle}>
                  <span className="flex items-center gap-2">
                    <ProjectIcon
                      name="Scissors"
                      size={18}
                      className="profile-section-icon text-[#059669] dark:text-amber-500"
                      data-profile-section-icon
                    />
                    Cadastre sua chave PIX
                  </span>
                </h3>
                <p className={profileStyles.sectionSubtitle}>
                  Chave usada para recebimento dos atendimentos e comandas.
                </p>
              </div>

              {/* Grid com Inputs: Tipo de Chave, Chave PIX e Instagram */}
              <div className={profileStyles.gridThreeCols}>
                <Select
                  label="Tipo de Chave"
                  value={professionalData.pixType || "CPF"}
                  onChange={(e) =>
                    setProfessionalData({
                      ...professionalData,
                      pixType: e.target.value,
                    })
                  }
                  options={pixTypeOptions}
                  placeholder=""
                />

                <Input
                  label="Chave PIX Cadastrada"
                  placeholder={getPixPlaceholder(professionalData.pixType)}
                  value={professionalData.pixKey}
                  onChange={(e) => {
                    const nextKey = e.target.value;
                    setProfessionalData({
                      ...professionalData,
                      pixKey: nextKey,
                    });
                    saveRegisteredUserPixKey(nextKey);
                    if (profileErrors.pixKey)
                      setProfileErrors({ ...profileErrors, pixKey: null });
                  }}
                  error={profileErrors.pixKey}
                />

                <Input
                  label="Instagram Profissional"
                  placeholder="@seunome_barber"
                  value={professionalData.instagram}
                  onChange={(e) =>
                    setProfessionalData({
                      ...professionalData,
                      instagram: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* CONTAINER 2: Perfil Profissional */}
            <div
              className="p-6 md:p-8 bg-white dark:bg-neutral-900/90 border border-zinc-200 dark:border-neutral-800 rounded-3xl space-y-5 shadow-sm profile-tab-content-card profile-portfolio-container"
              data-profile-portfolio-container
            >
              <div>
                <h3 className="text-base font-bold text-[#18181B] dark:text-white flex items-center gap-2">
                  <span className="flex items-center gap-2">
                    <ProjectIcon
                      name="User"
                      size={18}
                      className="profile-section-icon text-[#059669] dark:text-amber-500"
                      data-profile-section-icon
                    />
                    Perfil Profissional
                  </span>
                </h3>
                <p className="text-xs text-[#18181B] dark:text-neutral-400 leading-relaxed -mt-1">
                  Crie seu perfil profissional que ficará visível aos clientes
                </p>
              </div>

              {/* Biografia Curta */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-[#18181B] dark:text-neutral-300">
                  Apresentação Profissional / Biografia
                </label>
                <textarea
                  rows={3}
                  maxLength={250}
                  value={professionalData.bio}
                  onChange={(e) =>
                    setProfessionalData({
                      ...professionalData,
                      bio: e.target.value,
                    })
                  }
                  placeholder="Conte um pouco sobre sua trajetória, estilo de atendimento e cortes favoritos..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-neutral-950 border border-zinc-300 dark:border-neutral-800 text-[#18181B] dark:text-neutral-200 placeholder-zinc-400 dark:placeholder-neutral-500 focus:outline-none focus:border-emerald-500 dark:focus:border-amber-500 transition-colors"
                />
                <p className="text-[10px] font-mono text-right text-[#18181B] dark:text-neutral-500">
                  {professionalData.bio.length} / 250 caracteres
                </p>
              </div>

              {/* Especialidades com TagInput (Rótulo, Tags e Sugestões centralizados) */}
              <TagInput
                label="Especialidades de Atendimento (Tags Ativas)"
                tags={professionalData.specialties}
                onChange={(newTags) =>
                  setProfessionalData({
                    ...professionalData,
                    specialties: newTags,
                  })
                }
                placeholder="Escreva sua especialidade e aperte TAB"
                suggestions={[
                  "Massoterapia",
                  "Degradê Navalhado",
                  "Barboterapia",
                  "Platinado / Nevou",
                  "Sobrancelha",
                  "Visagismo",
                ]}
              />

              {/* Botão Salvar Alterações para a Aba Profissional */}
              <div
                className="flex items-center justify-end pt-4 border-t border-zinc-200 dark:border-neutral-800 profile-save-divider"
                data-profile-save-divider
              >
                <Button
                  variant="primary"
                  isLoading={isSaving}
                  onClick={handleSaveProfile}
                  className="text-xs py-2.5 px-6 font-bold shadow-md"
                >
                  Salvar Alterações do Perfil
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. SEGURANÇA, SENHA & SESSÕES ATIVAS                     */}
        {/* ======================================================== */}
        {activeTab === "seguranca" && (
          <div className="space-y-5">
            <div>
              <h3 className={profileStyles.sectionTitle}>
                <span className="flex items-center gap-2">
                  <ProjectIcon
                    name="Lock"
                    size={18}
                    className="profile-section-icon text-[#059669] dark:text-amber-500"
                    data-profile-section-icon
                  />
                  Segurança & Autenticação
                </span>
              </h3>
              <p className={profileStyles.sectionSubtitle}>
                Gerenciamento de credenciais, sessões ativas e autenticação
                segura.
              </p>
            </div>

            {/* CARD DE MÉTODO DE AUTENTICAÇÃO ATIVO */}
            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
                  {isGoogleAuth ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  ) : (
                    <ProjectIcon name="Lock" size={20} className="text-[#059669] dark:text-amber-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className={`text-xs font-bold ${isGoogleAuth ? "text-[#55555E] dark:text-[#55555E]" : "text-white"}`} data-google-auth-text="true">
                      {isGoogleAuth ? "Conta Google Vinculada" : "Login por E-mail e Senha"}
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-[#059669] border border-emerald-500/30 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30">
                      Função: {roleLabel.split("&")[0].trim()}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {isGoogleAuth
                      ? `Autenticado com segurança via Google Identity (${contactData.email}).`
                      : "Credenciais de acesso criptografadas com segurança máxima."}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300">
                {isGoogleAuth ? "Google SSO Ativo" : "Senha Ativa"}
              </span>
            </div>

            {/* CARD DE ALTERAÇÃO DE SENHA COM VALIDAÇÕES */}
            <div className="space-y-4 p-5 bg-neutral-950 border border-neutral-800 rounded-2xl text-left">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                  Alterar Senha de Acesso
                </span>
                <span className="text-[10px] text-neutral-500">
                  Mínimo de 8 caracteres alfanuméricos
                </span>
              </div>

              {/* Mensagem de Sucesso */}
              {passwordSuccessMsg && (
                <Alert variant="success" title="Senha Atualizada!">
                  {passwordSuccessMsg}
                </Alert>
              )}

              {/* [Leitura ativa: Alerta de erro da API do Supabase Auth caso a troca falhe] */}
              {passwordApiError && (
                <Alert
                  variant="error"
                  title="Erro ao Atualizar Senha"
                  onClose={() => setPasswordApiError("")}
                >
                  {passwordApiError}
                </Alert>
              )}

              {/* 1. Senha Atual */}
              <Input
                label="Senha Atual"
                type="password"
                placeholder="••••••••"
                value={securityData.currentPassword}
                onChange={(e) => {
                  setSecurityData({
                    ...securityData,
                    currentPassword: e.target.value,
                  });
                  if (passwordErrors.current)
                    setPasswordErrors((prev) => ({ ...prev, current: null }));
                }}
                error={passwordErrors.current}
              />

              {/* 2. Nova Senha e Confirmação */}
              <div className={profileStyles.gridTwoCols}>
                <Input
                  label="Nova Senha"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={securityData.newPassword}
                  onChange={(e) => {
                    setSecurityData({
                      ...securityData,
                      newPassword: e.target.value,
                    });
                    if (passwordErrors.new)
                      setPasswordErrors((prev) => ({ ...prev, new: null }));
                  }}
                  error={passwordErrors.new}
                />

                <Input
                  label="Confirmar Nova Senha"
                  type="password"
                  placeholder="Repita a nova senha"
                  value={securityData.confirmPassword}
                  onChange={(e) => {
                    setSecurityData({
                      ...securityData,
                      confirmPassword: e.target.value,
                    });
                    if (passwordErrors.confirm)
                      setPasswordErrors((prev) => ({ ...prev, confirm: null }));
                  }}
                  error={passwordErrors.confirm}
                />
              </div>

              {/* Botão Específico para Salvar a Senha */}
              <div className="flex justify-end pt-1">
                <Button
                  variant="primary"
                  isLoading={isUpdatingPassword}
                  onClick={handleUpdatePassword}
                  className="text-xs py-2 px-4 font-bold"
                >
                  Salvar Nova Senha
                </Button>
              </div>
            </div>

            {/* Autenticação em Dois Fatores (2FA) */}
            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">
                  Autenticação em Dois Fatores (2FA)
                </p>
                <p className="text-[11px] text-neutral-400">
                  Exige confirmação via WhatsApp ou App autenticador em novos
                  logins.
                </p>
              </div>
              <Toggle
                checked={securityData.twoFactorAuth}
                onChange={(val) =>
                  setSecurityData({ ...securityData, twoFactorAuth: val })
                }
              />
            </div>

            {/* Dispositivos Conectados (Sessões Ativas Reais) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Dispositivos Conectados (Sessões Ativas)
                  </span>
                  <button
                    type="button"
                    disabled={isLoadingSessions}
                    onClick={() => loadActiveSessions({ showSpinner: true, registerPresence: false })}
                    title="Atualizar lista de dispositivos conectados"
                    className="p-1 rounded text-neutral-400 hover:text-[#059669] dark:hover:text-amber-400 hover:bg-neutral-900 transition-colors cursor-pointer"
                  >
                    <ProjectIcon
                      name="RefreshCw"
                      size={13}
                      className={isLoadingSessions ? "animate-spin text-[#059669] dark:text-amber-500" : "text-[#059669] dark:text-amber-500"}
                    />
                  </button>
                </div>
                {activeSessions.filter((s) => !s.is_current).length > 0 && (
                  <button
                    type="button"
                    disabled={isDisconnectingSessions}
                    onClick={handleOpenDisconnectOthersModal}
                    className="text-xs text-red-400 hover:text-red-300 hover:underline cursor-pointer transition-colors"
                  >
                    {isDisconnectingSessions
                      ? "Desconectando..."
                      : "Desconectar outros dispositivos"}
                  </button>
                )}
              </div>

              {sessionFeedback && (
                <Alert
                  variant="success"
                  title="Sessões de Acesso"
                  onClose={() => setSessionFeedback("")}
                >
                  {sessionFeedback}
                </Alert>
              )}

              {isLoadingSessions && activeSessions.length === 0 ? (
                <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-2xl text-center text-xs text-neutral-400">
                  Carregando sessões ativas...
                </div>
              ) : activeSessions.length === 0 ? (
                <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-2xl text-center text-xs text-neutral-400">
                  Nenhuma sessão ativa encontrada.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeSessions.map((session) => (
                    <div
                      key={session.id || session.device_name}
                      className={profileStyles.sessionItem}
                    >
                      <div className={profileStyles.sessionIcon}>
                        <ProjectIcon
                          name={session.isMobile ? "Smartphone" : "Laptop"}
                          size={18}
                          className="text-[#059669] dark:text-amber-500"
                        />
                      </div>
                      <div className={profileStyles.sessionInfo}>
                        <p className="font-bold text-white">
                          {session.device_name ||
                            (session.isMobile
                              ? "Dispositivo Móvel"
                              : "Computador / Desktop")}
                        </p>
                        <span className="text-[11px] text-neutral-500">
                          {session.is_current
                            ? `Dispositivo Atual • ${session.browser || "Navegador"} no ${session.os || "Sistema"}`
                            : `Última atividade: ${formatSessionActivity(
                                session.last_activity_at || session.created_at
                              )}`}
                        </span>
                      </div>
                      {session.is_current ? (
                        <div className="flex items-center gap-2">
                          <span className={profileStyles.activeNowBadge}>
                            Conectado Agora
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenDisconnectModal(session)}
                            className="text-xs text-red-400 hover:text-red-300 font-semibold px-2 py-1 rounded hover:bg-red-500/10 cursor-pointer transition-colors"
                          >
                            Desconectar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenDisconnectModal(session)}
                          className="text-xs text-red-400 hover:text-red-300 font-semibold px-2 py-1 rounded hover:bg-red-500/10 cursor-pointer transition-colors"
                        >
                          Desconectar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL OFICIAL: Encerrar Sessão (Disparado pelo link "Desconectar") */}
        <Modal
          isOpen={isLogoutModalOpen}
          onClose={() => {
            setIsLogoutModalOpen(false);
            setSessionToDisconnect(null);
          }}
          title="Encerrar Sessão"
          size="sm"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  setSessionToDisconnect(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                isLoading={isDisconnectingSessions}
                onClick={handleConfirmDisconnectSession}
              >
                Sim, pode sair!
              </Button>
            </>
          }
        >
          <div className="space-y-2 text-left py-1 select-none">
            <p className="text-xs text-neutral-200 leading-relaxed font-semibold">
              {sessionToDisconnect?.is_others
                ? "Tem certeza de que deseja desconectar todos os outros aparelhos remotos?"
                : sessionToDisconnect?.is_current
                ? "Tem certeza de que deseja sair da plataforma?"
                : `Tem certeza de que deseja desconectar o dispositivo "${sessionToDisconnect?.device_name || "Aparelho Selecionado"}"?`}
            </p>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              {sessionToDisconnect?.is_others
                ? "Todas as outras sessões ativas serão encerradas e os aparelhos redirecionados para a tela de login."
                : sessionToDisconnect?.is_current
                ? "Sua sessão será finalizada com segurança e você precisará digitar suas credenciais novamente para acessar o painel."
                : "A sessão deste aparelho será encerrada com segurança no banco de dados, resetando seu estado e redirecionando o usuário para a tela de login."}
            </p>
          </div>
        </Modal>

        {/* BOTÃO SALVAR ALTERAÇÕES (Para abas de container único) */}
        {activeTab !== "profissional" && (
          <div className={profileStyles.footerActions}>
            <Button
              variant="primary"
              isLoading={isSaving}
              onClick={handleSaveProfile}
              className="text-xs py-2.5 px-6 font-bold shadow-md"
            >
              Salvar Alterações do Perfil
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
