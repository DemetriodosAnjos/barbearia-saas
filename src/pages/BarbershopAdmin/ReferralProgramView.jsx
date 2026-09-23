import { useState, useEffect } from "react";
// [Import: cliente Supabase para buscar indicações reais associadas à barbearia]
import { supabase } from "../../lib/supabase";
import { referralStyles } from "./ReferralProgramView.styles";
import Button from "../../components/ui/Button";

// [Função componente: consome o tenant real sem dados fictícios de fallback]
export default function ReferralProgramView({ tenant, onBack }) {
  const [copied, setCopied] = useState(false);
  // [Estado real: inicia vazio aguardando dados da tabela referrals do Supabase]
  const [referrals, setReferrals] = useState([]);
  const [isLoadingReferrals, setIsLoadingReferrals] = useState(false);

  // [Link dinâmico: resolve a URL oficial usando o origin atual e o slug real do tenant]
  const tenantSlug = tenant?.slug || tenant?.id || "barbearia";
  const referralLink = `${window.location.origin}/?convite=${tenantSlug}`;

  // [Efeito de ciclo de vida: busca indicações reais registradas para este tenant]
  useEffect(() => {
    let isMounted = true;
    async function loadReferrals() {
      if (!tenant?.id) return;
      setIsLoadingReferrals(true);
      try {
        const { data, error } = await supabase
          .from("referrals")
          .select("*")
          .eq("referrer_tenant_id", tenant.id)
          .order("created_at", { ascending: false });

        if (!error && data && isMounted) {
          setReferrals(
            data.map((r) => ({
              id: r.id,
              barbershopName: r.referred_name || "Nova Barbearia",
              ownerName: r.referred_owner || "Responsável",
              dateJoined: new Date(r.created_at).toLocaleDateString("pt-BR"),
              plan: r.plan || "Em Avaliação",
              monthsPaid: Number(r.months_paid || 0),
              rewardClaimed: Boolean(r.reward_claimed),
            })),
          );
        }
      } catch (err) {
        console.error("Erro ao carregar indicações do Supabase:", err);
      } finally {
        if (isMounted) setIsLoadingReferrals(false);
      }
    }
    loadReferrals();
    return () => {
      isMounted = false;
    };
  }, [tenant?.id]);

  // KPIs
  const totalReferred = referrals.length;
  const trialCount = referrals.filter((r) => r.monthsPaid === 0).length;
  const activePaying = referrals.filter((r) => r.monthsPaid > 0).length;
  const availableCoupons = referrals.filter(
    (r) => r.monthsPaid >= 3 && !r.rewardClaimed,
  ).length;

  // 1. Copiar Link para a Área de Transferência
  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // [Função: compartilha convite no WhatsApp utilizando o nome real do estabelecimento]
  const handleShareWhatsApp = () => {
    const barbershopTitle = tenant?.name || "minha barbearia";
    const text = encodeURIComponent(
      `Fala meu amigo! 💈\n\n` +
        `Estou usando o BarberSaaS aqui na ${barbershopTitle} e o sistema é sensacional (agenda, lembretes automáticos no WhatsApp e comissões calculadas na hora).\n\n` +
        `Consegui um presente pra você: acessando pelo meu link exclusivo, você ganha 14 DIAS GRÁTIS de teste (o dobro do padrão):\n\n` +
        `👉 ${referralLink}\n\n` +
        `Testa aí no seu salão, você vai curtir demais!`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  // [Função assíncrona: resgata o prêmio de 50% e persiste o status no Supabase]
  const handleClaimReward = async (referralId, barbershopName) => {
    setReferrals((prev) =>
      prev.map((r) =>
        r.id === referralId ? { ...r, rewardClaimed: true } : r,
      ),
    );

    try {
      // Método Supabase: atualiza a flag reward_claimed no banco
      await supabase
        .from("referrals")
        .update({ reward_claimed: true })
        .eq("id", referralId);
    } catch (err) {
      console.error("Erro ao registrar resgate da recompensa:", err);
    }

    alert(
      `🎉 CUPOM DE 50% DE DESCONTO RESGATADO!\n\n` +
        `• Indicação Premiada: ${barbershopName}\n` +
        `• Benefício: 50% de abatimento aplicado na sua próxima fatura da BarberSaaS!\n\n` +
        `Obrigado por fortalecer nossa comunidade de barbearias!`,
    );
  };

  return (
    <div className={referralStyles.container}>
      {/* 1. HERO BANNER DE GAMIFICAÇÃO */}
      <div className={referralStyles.heroCard}>
        <div className={referralStyles.heroInfo}>
          <span className={referralStyles.heroBadge}>
            🎁 Programa Indique & Ganhe
          </span>
          <h1 className={referralStyles.heroTitle}>
            Indique uma Barbearia Amiga e Ganhe 50% de Desconto!
          </h1>
          <p className={referralStyles.heroSubtitle}>
            Seu amigo ganha <strong>14 dias de teste grátis</strong> (o dobro do
            normal) pelo seu link. Quando ele completar a{" "}
            <strong>3ª mensalidade paga</strong>, você ganha{" "}
            <strong>50% de desconto na sua próxima fatura</strong>!
          </p>
        </div>

        {onBack && (
          <Button
            variant="secondary"
            onClick={onBack}
            className="text-xs py-1.5 px-3 self-center md:self-auto shrink-0 z-10"
          >
            ← Voltar ao Painel
          </Button>
        )}
      </div>

      {/* 2. CARD DE COMPARTILHAMENTO DO LINK */}
      <div className={referralStyles.shareCard}>
        <span className={referralStyles.shareTitle}>
          <span>🔗</span> Seu Link Exclusivo de Indicação:
        </span>

        <div className={referralStyles.linkBox}>
          <input
            type="text"
            readOnly
            value={referralLink}
            className={referralStyles.linkInput}
          />

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Button
              variant={copied ? "primary" : "secondary"}
              onClick={handleCopyLink}
              className="text-xs py-2 px-3.5 flex-1 sm:flex-initial"
            >
              {copied ? "✓ Copiado!" : "📋 Copiar Link"}
            </Button>

            <Button
              variant="primary"
              onClick={handleShareWhatsApp}
              className="text-xs py-2 px-4 bg-emerald-600 hover:bg-emerald-500 font-extrabold flex-1 sm:flex-initial flex items-center justify-center gap-1.5 shadow-md"
            >
              <span>📲</span>
              <span>Enviar no WhatsApp</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 3. KPIS DE INDICAÇÃO */}
      <div className={referralStyles.metricsGrid}>
        <div className={referralStyles.metricCard}>
          <span className={referralStyles.metricLabel}>Total Indicados</span>
          <span className={referralStyles.metricValue}>{totalReferred}</span>
        </div>

        <div className={referralStyles.metricCard}>
          <span className={referralStyles.metricLabel}>Em Teste (14d)</span>
          <span className={referralStyles.metricValue}>{trialCount}</span>
        </div>

        <div className={referralStyles.metricCard}>
          <span className={referralStyles.metricLabel}>Planos Ativos</span>
          <span className={referralStyles.metricValue}>{activePaying}</span>
        </div>

        <div className={referralStyles.metricCard}>
          <span className={referralStyles.metricLabel}>Cupons Liberados</span>
          <span className={referralStyles.metricValueGold}>
            {availableCoupons} {availableCoupons === 1 ? "prêmio" : "prêmios"}
          </span>
        </div>
      </div>

      {/* 4. ACOMPANHAMENTO DA JORNADA DOS AMIGOS INDICADOS */}
      <div className={referralStyles.referredSection}>
        <div className={referralStyles.sectionHeader}>
          <div className="space-y-0.5">
            <h3 className={referralStyles.sectionTitle}>
              <span>💈</span> Suas Indicações & Progresso da Recompensa
            </h3>
            <p className="text-xs text-neutral-400">
              Acompanhe cada mensalidade paga pelo seu amigo. A recompensa é
              liberada no 3º mês!
            </p>
          </div>

          <span className="text-xs font-bold text-amber-500">
            Regra: 3 Mensalidades = 50% OFF
          </span>
        </div>

        {/* Lista das Barbearias Indicadas ou Estado Vazio */}
        <div className="space-y-4">
          {referrals.length === 0 ? (
            <div className="p-8 text-center bg-neutral-950 border border-neutral-800 rounded-3xl space-y-3">
              <div className="text-3xl">🎁</div>
              <h4 className="text-sm font-bold text-white">
                Você ainda não tem barbearias indicadas
              </h4>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Copie o seu link acima ou compartilhe diretamente no WhatsApp
                com donos de barbearias amigos. Quando eles completarem 3
                mensalidades, você ganha 50% de desconto na sua assinatura!
              </p>
              <Button
                variant="primary"
                onClick={handleShareWhatsApp}
                className="text-xs py-2 px-4 bg-emerald-600 hover:bg-emerald-500 font-bold inline-flex items-center gap-2"
              >
                <span>📲</span>
                <span>Convidar Primeira Barbearia</span>
              </Button>
            </div>
          ) : (
            referrals.map((item) => {
              const isRewardReady = item.monthsPaid >= 3 && !item.rewardClaimed;

              return (
                <div key={item.id} className={referralStyles.referredCard}>
                  {/* Topo do Card */}
                  <div className={referralStyles.referredHeader}>
                    <div className={referralStyles.barberMeta}>
                      <div className={referralStyles.barberIcon}>💈</div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{item.barbershopName}</span>
                          <span className="text-xs text-neutral-400 font-normal">
                            (Dono: {item.ownerName})
                          </span>
                        </h4>
                        <p className="text-[11px] text-neutral-500 font-mono">
                          Cadastrou em {item.dateJoined} • {item.plan}
                        </p>
                      </div>
                    </div>

                    {/* Selo de Status */}
                    {item.rewardClaimed ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
                        ✓ Desconto Já Utilizado
                      </span>
                    ) : isRewardReady ? (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-neutral-950 animate-pulse">
                        🎁 50% OFF Disponível!
                      </span>
                    ) : item.monthsPaid === 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        Testando (14 Dias Grátis)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Falta {3 - item.monthsPaid} mensalidade
                        {3 - item.monthsPaid === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>

                  {/* A ESTEIRA VISUAL DOS 4 PASSOS */}
                  <div className={referralStyles.stepperGrid}>
                    <div
                      className={`${referralStyles.stepBox} ${referralStyles.stepCompleted}`}
                    >
                      <span>✓ Cadastrou</span>
                      <span className="text-[9px] font-normal opacity-80">
                        14 dias grátis
                      </span>
                    </div>

                    <div
                      className={`
                        ${referralStyles.stepBox}
                        ${item.monthsPaid >= 1 ? referralStyles.stepCompleted : item.monthsPaid === 0 ? referralStyles.stepActive : referralStyles.stepPending}
                      `}
                    >
                      <span>
                        {item.monthsPaid >= 1
                          ? "✓ Mês 1 Pago"
                          : "1ª Mensalidade"}
                      </span>
                      <span className="text-[9px] font-normal opacity-80">
                        {item.monthsPaid >= 1 ? "Confirmado" : "Aguardando"}
                      </span>
                    </div>

                    <div
                      className={`
                        ${referralStyles.stepBox}
                        ${item.monthsPaid >= 2 ? referralStyles.stepCompleted : item.monthsPaid === 1 ? referralStyles.stepActive : referralStyles.stepPending}
                      `}
                    >
                      <span>
                        {item.monthsPaid >= 2
                          ? "✓ Mês 2 Pago"
                          : "2ª Mensalidade"}
                      </span>
                      <span className="text-[9px] font-normal opacity-80">
                        {item.monthsPaid >= 2 ? "Confirmado" : "Pendente"}
                      </span>
                    </div>

                    <div
                      className={`
                        ${referralStyles.stepBox}
                        ${item.monthsPaid >= 3 ? "bg-amber-500 text-neutral-950 font-black" : item.monthsPaid === 2 ? referralStyles.stepActive : referralStyles.stepPending}
                      `}
                    >
                      <span>
                        {item.monthsPaid >= 3
                          ? "🎉 50% OFF!"
                          : "3ª Mensalidade"}
                      </span>
                      <span className="text-[9px] font-normal opacity-80">
                        {item.monthsPaid >= 3
                          ? "Meta Batida!"
                          : "Libera o Prêmio"}
                      </span>
                    </div>
                  </div>

                  {/* Box de Resgate */}
                  {isRewardReady && (
                    <div className={referralStyles.rewardReadyBox}>
                      <div>
                        <p className="font-bold text-amber-300">
                          Parabéns! A {item.barbershopName} pagou a 3ª
                          mensalidade!
                        </p>
                        <p className="text-[11px] text-neutral-400">
                          Você ganhou 50% de desconto na sua próxima renovação
                          da plataforma.
                        </p>
                      </div>

                      <Button
                        variant="primary"
                        onClick={() =>
                          handleClaimReward(item.id, item.barbershopName)
                        }
                        className="text-xs py-2 px-4 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black shadow-lg"
                      >
                        Resgatar 50% de Desconto Agora 🎁
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
