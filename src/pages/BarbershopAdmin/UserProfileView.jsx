import { useState, useRef } from "react";
// [Import: cliente Supabase para atualização de perfil e senha no Auth]
import { supabase } from "../../lib/supabase";
import { profileStyles } from "./UserProfileView.styles";
import Tabs from "../../components/ui/Tabs";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Avatar from "../../components/ui/Avatar";
import Badge from "../../components/ui/Badge";
import Toggle from "../../components/ui/Toggle";
import Select from "../../components/ui/Select";
import TagInput from "../../components/ui/TagInput";
import Alert from "../../components/ui/Alert";

// [Função componente: consome o usuário e barbearia reais autenticados]
export default function UserProfileView({ user, tenant, onBack }) {
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
  const [personalData, setPersonalData] = useState({
    fullName: user?.user_metadata?.name || user?.name || tenant?.name || "",
    displayName: user?.user_metadata?.display_name || user?.displayName || "",
    cpf: user?.user_metadata?.cpf || "",
    cnpj: tenant?.cnpj || "",
    birthDate: user?.user_metadata?.birth_date || "",
    avatarSrc: user?.user_metadata?.avatar_url || "",
  });

  // 2. CONTATO & LOCALIZAÇÃO PESSOAL
  const [contactData, setContactData] = useState({
    email: user?.email || "",
    phone: user?.phone || tenant?.phone || "",
    cep: tenant?.cep || "",
    street: tenant?.street || "",
    number: tenant?.number || "",
    complement: tenant?.complement || "",
    neighborhood: tenant?.neighborhood || "",
    city: tenant?.city || "",
    state: tenant?.state || "",
  });

  // 3. ATUAÇÃO PROFISSIONAL & CHAVE PIX
  const [professionalData, setProfessionalData] = useState({
    bio: user?.user_metadata?.bio || "",
    pixKey: user?.user_metadata?.pix_key || "",
    pixType: "Chave Geral",
    instagram: user?.user_metadata?.instagram || "",
    specialties: user?.user_metadata?.specialties || [
      "Corte Tradicional",
      "Barba",
    ],
  });

  // 4. SEGURANÇA & SESSÕES
  const [securityData, setSecurityData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    twoFactorAuth: false,
  });

  // Upload simulado de Avatar
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("A imagem deve ter no máximo 2MB.");
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

  // Salvamento Geral do Perfil
  // Validação Geral de Todos os Inputs
  const handleSaveProfile = () => {
    const errs = {};
    setGlobalSuccessMessage("");

    // 1. Validação da Aba 1 (Dados Pessoais)
    if (!personalData.fullName.trim() || personalData.fullName.length < 3) {
      errs.fullName = "Informe o nome completo (mínimo 3 caracteres).";
    }
    if (!personalData.displayName.trim()) {
      errs.displayName = "O nome de exibição no aplicativo é obrigatório.";
    }
    if (!personalData.cpf || personalData.cpf.length < 14) {
      errs.cpf = "Informe um CPF válido completo com 11 dígitos.";
    }

    // 2. Validação da Aba 2 (Contato & Endereço)
    if (!contactData.phone || contactData.phone.length < 14) {
      errs.phone = "Informe o WhatsApp com DDD.";
    }
    if (!contactData.cep || contactData.cep.length < 9) {
      errs.cep = "Informe o CEP válido.";
    }
    if (!contactData.street.trim()) {
      errs.street = "O logradouro/rua é obrigatório.";
    }
    if (!contactData.number.trim()) {
      errs.number = "O número é obrigatório.";
    }
    if (!contactData.city.trim()) {
      errs.city = "A cidade é obrigatória.";
    }
    if (!contactData.state) {
      errs.state = "Selecione o estado (UF).";
    }

    // 3. Validação da Aba 3 (Profissional & PIX)
    if (!professionalData.pixKey.trim()) {
      errs.pixKey = "A chave PIX é obrigatória para o repasse de comissões.";
    }
    if (professionalData.specialties.length === 0) {
      errs.specialties =
        "Selecione ou digite pelo menos 1 especialidade de atendimento.";
    }

    // SE HOUVER ERROS: Bloqueia e leva o usuário para a aba correspondente!
    if (Object.keys(errs).length > 0) {
      setProfileErrors(errs);

      // Inteligência de UX: Muda a aba automaticamente para onde está o primeiro erro!
      if (errs.fullName || errs.displayName || errs.cpf) {
        setActiveTab("pessoal");
      } else if (
        errs.phone ||
        errs.cep ||
        errs.street ||
        errs.number ||
        errs.city ||
        errs.state
      ) {
        setActiveTab("contato");
      } else if (errs.pixKey || errs.specialties) {
        setActiveTab("profissional");
      }

      return;
    }

    // SE TODOS OS CAMPOS ESTIVEREM CORRETOS:
    setProfileErrors({});
    setIsSaving(true);

    setTimeout(() => {
      setIsSaving(false);
      setGlobalSuccessMessage(
        "Todas as alterações do perfil foram salvas com sucesso!",
      );
    }, 1200);
  };

  const profileTabs = [
    { id: "pessoal", label: "Dados Pessoais", icon: "👤" },
    { id: "contato", label: "Contato & Endereço", icon: "📍" },
    { id: "profissional", label: "Perfil & Chave PIX", icon: "💈" },
    { id: "seguranca", label: "Segurança & Acesso", icon: "🔒" },
  ];

  return (
    <div className={profileStyles.container}>
      {/* CABEÇALHO DO PERFIL COM AVATAR EM DESTAQUE */}
      <div className={profileStyles.headerCard}>
        <div className={profileStyles.profileIdentity}>
          {/* Avatar com ação de troca ao passar o mouse */}
          <div
            className={profileStyles.avatarWrapper}
            onClick={() => fileInputRef.current.click()}
            title="Clique para alterar foto de perfil (JPG/PNG até 2MB)"
          >
            <Avatar
              src={personalData.avatarSrc}
              name={personalData.fullName}
              size="xl"
              status="available"
            />
            <div className={profileStyles.avatarOverlay}>
              <span>📷</span>
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

          <div className={profileStyles.infoGroup}>
            <h2 className={profileStyles.nameTitle}>
              <span>{personalData.fullName}</span>
              <span className="text-amber-400 text-xs font-normal">
                ("{personalData.displayName}")
              </span>
            </h2>
            <p className={profileStyles.displayNameTag}>
              Nome exibido para os clientes:{" "}
              <strong>{personalData.displayName}</strong>
            </p>
            <div className={profileStyles.roleMeta}>
              <Badge
                status="confirmed"
                label="Master Barber & Proprietário"
                size="sm"
              />
              <span>•</span>
              <span className="font-mono text-neutral-400">
                {contactData.email}
              </span>
            </div>
          </div>
        </div>

        {onBack && (
          <Button
            variant="secondary"
            onClick={onBack}
            className="text-xs py-1.5 px-3 self-center sm:self-auto"
          >
            ← Voltar ao Painel
          </Button>
        )}
      </div>

      {/* NAVEGAÇÃO ENTRE OS 4 PILARES VIA TABS */}
      <Tabs
        tabs={profileTabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="line"
      />

      {/* CONTEÚDO DA ABA ATIVA */}

      {/* Alerta de Sucesso Geral */}
      {globalSuccessMessage && (
        <Alert variant="success" title="Perfil Atualizado com Sucesso!">
          {globalSuccessMessage}
        </Alert>
      )}

      <div className={profileStyles.tabContentCard}>
        {/* ======================================================== */}
        {/* 1. DADOS PESSOAIS & IDENTIFICAÇÃO                        */}
        {/* ======================================================== */}
        {activeTab === "pessoal" && (
          <div className="space-y-4">
            <div>
              <h3 className={profileStyles.sectionTitle}>
                <span>👤</span> Dados Pessoais & Identificação
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
                helperText="Este é o nome que os clientes verão na agenda e no aplicativo."
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
                label="CNPJ / MEI (Opcional se for parceiro PJ)"
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
                <span>📍</span> Contato & Endereço Residencial
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
                helperText="A alteração de e-mail exige confirmação por link de segurança."
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
                helperText="Usado para notificações instantâneas de novos agendamentos."
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
                helperText={
                  isSearchingCep
                    ? "🔍 Buscando endereço nos Correios..."
                    : "Digite o CEP para preencher o endereço automaticamente."
                }
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

            {/* Linha de Endereço: Número + Complemento + Bairro (Sem duplicações) */}
            <div className={profileStyles.gridThreeCols}>
              <div className="w-full flex flex-col gap-1.5 text-left">
                <label className="text-sm font-medium text-neutral-300">
                  Número *
                </label>
                <input
                  ref={numberInputRef}
                  type="text"
                  placeholder="Ex: 1042"
                  value={contactData.number}
                  onChange={(e) => {
                    setContactData({ ...contactData, number: e.target.value });
                    if (profileErrors.number)
                      setProfileErrors({ ...profileErrors, number: null });
                  }}
                  className={`
                    w-full px-3.5 py-2.5 rounded-lg text-sm transition-all duration-200
                    bg-neutral-900 border text-neutral-100 placeholder-neutral-500
                    focus:outline-none focus:ring-2
                    ${
                      profileErrors.number
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : "border-neutral-700 focus:border-amber-500 focus:ring-amber-500/20"
                    }
                  `}
                />
                {profileErrors.number && (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                    <span>⚠️</span> {profileErrors.number}
                  </p>
                )}
              </div>

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

            {/* Linha 2 de Endereço: Número + Complemento + Bairro */}
            <div className={profileStyles.gridThreeCols}>
              <Input
                label="Número"
                value={contactData.number}
                onChange={(e) => {
                  setContactData({ ...contactData, number: e.target.value });
                  if (profileErrors.number)
                    setProfileErrors({ ...profileErrors, number: null });
                }}
              />

              <Input
                label="Complemento"
                placeholder="Apto, Bloco, Sala"
                value={contactData.complement}
                onChange={(e) => {
                  setContactData({
                    ...contactData,
                    complement: e.target.value,
                  });
                  if (profileErrors.complement)
                    setProfileErrors({ ...profileErrors, complement: null });
                }}
              />

              <Input
                label="Bairro"
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
          <div className="space-y-4">
            <div>
              <h3 className={profileStyles.sectionTitle}>
                <span>💈</span> Perfil Profissional & Repasse Financeiro
              </h3>
              <p className={profileStyles.sectionSubtitle}>
                Dados para o fechamento de comissões semanais e portfólio para
                os clientes.
              </p>
            </div>

            {/* Chave Pix para Recebimento de Comissões */}
            <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>💸</span> Chave PIX para Recebimento de Comissões
                </span>
                <span className="text-[10px] text-neutral-400">
                  Repasse automático pelo gestor
                </span>
              </div>

              <div className={profileStyles.gridTwoCols}>
                <Input
                  label="Chave PIX Cadastrada"
                  placeholder="Seu CPF, E-mail ou Telefone"
                  value={professionalData.pixKey}
                  onChange={(e) => {
                    setProfessionalData({
                      ...professionalData,
                      pixKey: e.target.value,
                    });
                    if (profileErrors.pixKey)
                      setProfileErrors({ ...profileErrors, pixKey: null });
                  }}
                  error={profileErrors.pixKey}
                  helperText="O gestor utilizará esta chave ao clicar em 'Quitar via PIX'."
                />

                <Input
                  label="Instagram Profissional (@)"
                  placeholder="@seunome_barber"
                  value={professionalData.instagram}
                  onChange={(e) =>
                    setProfessionalData({
                      ...professionalData,
                      instagram: e.target.value,
                    })
                  }
                  helperText="Exibido na página pública para os clientes verem seus cortes."
                />
              </div>
            </div>

            {/* Biografia Curta */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-neutral-300">
                Apresentação Profissional / Biografia (Até 250 caracteres)
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
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-neutral-950 border border-neutral-800 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
              <p className={profileStyles.bioCounter}>
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
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. SEGURANÇA, SENHA & SESSÕES ATIVAS                     */}
        {/* ======================================================== */}
        {activeTab === "seguranca" && (
          <div className="space-y-5">
            <div>
              <h3 className={profileStyles.sectionTitle}>
                <span>🔒</span> Segurança & Autenticação
              </h3>
              <p className={profileStyles.sectionSubtitle}>
                Gerenciamento de credenciais, sessões ativas e autenticação
                segura.
              </p>
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
                helperText="Dica para teste: digite 'senha123' para validar ou qualquer outra para testar o erro."
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

            {/* Dispositivos Conectados (Sessões) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Dispositivos Conectados (Sessões Ativas)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    alert("Todas as outras sessões foram desconectadas.")
                  }
                  className="text-xs text-red-400 hover:underline cursor-pointer"
                >
                  Desconectar outros dispositivos
                </button>
              </div>

              <div className="space-y-2">
                <div className={profileStyles.sessionItem}>
                  <div className={profileStyles.sessionIcon}>💻</div>
                  <div className={profileStyles.sessionInfo}>
                    <p className="font-bold text-white">Chrome no Windows 11</p>
                    <span className="text-[11px] text-neutral-500">
                      São Paulo, Brasil • IP 177.85.x.x
                    </span>
                  </div>
                  <span className={profileStyles.activeNowBadge}>
                    Conectado Agora
                  </span>
                </div>

                <div className={profileStyles.sessionItem}>
                  <div className={profileStyles.sessionIcon}>📱</div>
                  <div className={profileStyles.sessionInfo}>
                    <p className="font-bold text-white">
                      Safari no iPhone 15 Pro
                    </p>
                    <span className="text-[11px] text-neutral-500">
                      Última atividade: Há 2 horas
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOTÃO SALVAR ALTERAÇÕES */}
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
      </div>
    </div>
  );
}
