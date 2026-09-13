import { useState } from "react";
import { referralStyles } from "./ReferralProgramView.styles";
import Button from "../../components/ui/Button";
import Alert from "../../components/ui/Alert";

export default function ReferralProgramView({
  tenant = {
    name: "Barbearia Vintage Club",
    slug: "vintage-club",
    ownerName: "Carlos Silva",
  },
  onBack,
}) {
  const [copied, setCopied] = useState(false);

  // Link exclusivo de indicação da barbearia
  const referralLink = `https://barbersaas.com.br/convite/${tenant.slug}`;

  // Mock de barbearias indicadas por este cliente
  const [referrals, setReferrals] = useState([
    {
      id: "ref-1",
      barbershopName: "Barbearia do Julio",
      ownerName: "Julio Cesar",
      dateJoined: "10/06/2026",
      plan: "Plano Pro",
      // Status da Jornada: 3 de 3 mensalidades pagas -> RECOMPENSA LIBERADA!
      monthsPaid: 3,
      rewardClaimed: false,
    },
    {
      id: "ref-2",
      barbershopName: "Navalha de Ouro",
      ownerName: "Marcos Vinicius",
      dateJoined: "15/07/2026",
      plan: "Plano Solo",
      monthsPaid: 2, // Falta 1 mensalidade para o prêmio
      rewardClaimed: false,
    },
    {
      id: "ref-3",
      barbershopName: "Studio Classic Hair",
      ownerName: "Lucas Almeida",
      dateJoined: "01/09/2026",
      plan: "Em Período de Testes",
      monthsPaid: 0, // Está em Trial de 14 dias
      rewardClaimed: false,
    },
  ]);

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

  // 2. Compartilhar no WhatsApp com Mensagem Pronta de Incentivo Duplo
  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Fala meu amigo! 💈\n\n` +
        `Estou usando o BarberSaaS aqui na ${tenant.name} e o sistema é sensacional (agenda, lembretes automáticos no WhatsApp e comissões calculadas na hora).\n\n` +
        `Consegui um presente pra você: acessando pelo meu link exclusivo, você ganha 14 DIAS GRÁTIS de teste (o dobro do padrão):\n\n` +
        `👉 ${referralLink}\n\n` +
        `Testa aí no seu salão, você vai curtir demais!`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  // 3. Resgatar Cupom de 50% de Desconto
  const handleClaimReward = (referralId, barbershopName) => {
    setReferrals((prev) =>
      prev.map((r) =>
        r.id === referralId ? { ...r, rewardClaimed: true } : r,
      ),
    );

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

        {/* Lista das Barbearias Indicadas */}
        <div className="space-y-4">
          {referrals.map((item) => {
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
                  {/* Passo 1: Cadastro */}
                  <div
                    className={`${referralStyles.stepBox} ${referralStyles.stepCompleted}`}
                  >
                    <span>✓ Cadastrou</span>
                    <span className="text-[9px] font-normal opacity-80">
                      14 dias grátis
                    </span>
                  </div>

                  {/* Passo 2: Mês 1 */}
                  <div
                    className={`
                      ${referralStyles.stepBox}
                      ${item.monthsPaid >= 1 ? referralStyles.stepCompleted : item.monthsPaid === 0 ? referralStyles.stepActive : referralStyles.stepPending}
                    `}
                  >
                    <span>
                      {item.monthsPaid >= 1 ? "✓ Mês 1 Pago" : "1ª Mensalidade"}
                    </span>
                    <span className="text-[9px] font-normal opacity-80">
                      {item.monthsPaid >= 1 ? "Confirmado" : "Aguardando"}
                    </span>
                  </div>

                  {/* Passo 3: Mês 2 */}
                  <div
                    className={`
                      ${referralStyles.stepBox}
                      ${item.monthsPaid >= 2 ? referralStyles.stepCompleted : item.monthsPaid === 1 ? referralStyles.stepActive : referralStyles.stepPending}
                    `}
                  >
                    <span>
                      {item.monthsPaid >= 2 ? "✓ Mês 2 Pago" : "2ª Mensalidade"}
                    </span>
                    <span className="text-[9px] font-normal opacity-80">
                      {item.monthsPaid >= 2 ? "Confirmado" : "Pendente"}
                    </span>
                  </div>

                  {/* Passo 4: Mês 3 (Meta!) */}
                  <div
                    className={`
                      ${referralStyles.stepBox}
                      ${item.monthsPaid >= 3 ? "bg-amber-500 text-neutral-950 font-black" : item.monthsPaid === 2 ? referralStyles.stepActive : referralStyles.stepPending}
                    `}
                  >
                    <span>
                      {item.monthsPaid >= 3 ? "🎉 50% OFF!" : "3ª Mensalidade"}
                    </span>
                    <span className="text-[9px] font-normal opacity-80">
                      {item.monthsPaid >= 3
                        ? "Meta Batida!"
                        : "Libera o Prêmio"}
                    </span>
                  </div>
                </div>

                {/* Box de Resgate (quando o amigo atinge a 3ª mensalidade) */}
                {isRewardReady && (
                  <div className={referralStyles.rewardReadyBox}>
                    <div>
                      <p className="font-bold text-amber-300">
                        Parabéns! A {item.barbershopName} pagou a 3ª
                        mensalidade!
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        Você ganhou 50% de desconto na sua próxima renovação da
                        plataforma.
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
          })}
        </div>
      </div>
    </div>
  );
}
