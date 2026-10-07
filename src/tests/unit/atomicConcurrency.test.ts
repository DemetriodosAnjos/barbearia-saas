import { describe, it, expect, beforeEach } from "vitest";
import {
  bookAppointmentAtomic,
  resetMemoryLockRegistry,
  runConcurrencyRaceBenchmark,
} from "../../api/atomicBookingService";

describe("Atomicidade, RPC e Prevenção de Race Conditions", () => {
  beforeEach(() => {
    resetMemoryLockRegistry();
  });

  it("1. deve realizar agendamento atômico isolado com status 201 quando horário estiver livre", async () => {
    const result = await bookAppointmentAtomic({
      tenantId: "tenant_barbearia_01",
      barberId: "barber_thiago",
      clientId: "client_carlos",
      clientName: "Carlos Eduardo",
      clientPhone: "(11) 98765-4321",
      serviceId: "srv_corte",
      serviceName: "Corte Tradicional",
      bookingDate: "2026-10-20",
      startTime: "10:00",
      endTime: "10:45",
      price: 50.0,
    });

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(201);
    expect(result.data).toBeDefined();
    expect(result.data?.client_name).toBe("Carlos Eduardo");
    expect(result.data?.status).toBe("confirmed");
  });

  it("2. deve prevenir Race Condition quando 10 clientes tentam agendar simultaneamente no mesmo milissegundo", async () => {
    const benchmark = await runConcurrencyRaceBenchmark(10, {
      date: "2026-10-20",
      start: "14:00",
      end: "14:45",
      barberId: "barber_thiago",
      tenantId: "tenant_barbearia_01",
    });

    expect(benchmark.totalRequests).toBe(10);
    // Exatamente 1 deve ser aprovado
    expect(benchmark.approvedCount).toBe(1);
    // Exatamente 9 devem receber HTTP 409 Conflict
    expect(benchmark.rejectedConflictCount).toBe(9);
    expect(benchmark.winnerId).toBeDefined();
  });

  it("3. deve permitir agendamento contíguo imediatamente após o término do horário anterior sem conflito falso", async () => {
    // Primeiro agendamento: 14:00 - 14:45
    const first = await bookAppointmentAtomic({
      tenantId: "tenant_barbearia_01",
      barberId: "barber_thiago",
      clientId: "client_1",
      clientName: "Cliente Primeiro",
      serviceId: "srv_corte",
      serviceName: "Corte",
      bookingDate: "2026-10-20",
      startTime: "14:00",
      endTime: "14:45",
      price: 50.0,
    });
    expect(first.success).toBe(true);

    // Segundo agendamento contíguo: 14:45 - 15:30 (deve passar porque não há sobreposição de intervalo)
    const second = await bookAppointmentAtomic({
      tenantId: "tenant_barbearia_01",
      barberId: "barber_thiago",
      clientId: "client_2",
      clientName: "Cliente Segundo",
      serviceId: "srv_barba",
      serviceName: "Barba Terapia",
      bookingDate: "2026-10-20",
      startTime: "14:45",
      endTime: "15:30",
      price: 45.0,
    });
    expect(second.success).toBe(true);
    expect(second.statusCode).toBe(201);
  });

  it("4. deve rejeitar agendamentos com sobreposição parcial interna no horário de outro cliente", async () => {
    // Horário já reservado: 16:00 - 17:00
    await bookAppointmentAtomic({
      tenantId: "tenant_barbearia_01",
      barberId: "barber_diego",
      clientId: "client_existente",
      clientName: "Cliente Anterior",
      serviceId: "srv_combo",
      serviceName: "Cabelo e Barba",
      bookingDate: "2026-10-20",
      startTime: "16:00",
      endTime: "17:00",
      price: 90.0,
    });

    // Tentativa conflitante no meio do slot: 16:15 - 16:45
    const conflictAttempt = await bookAppointmentAtomic({
      tenantId: "tenant_barbearia_01",
      barberId: "barber_diego",
      clientId: "client_atrasado",
      clientName: "Cliente Conflitante",
      serviceId: "srv_corte",
      serviceName: "Corte",
      bookingDate: "2026-10-20",
      startTime: "16:15",
      endTime: "16:45",
      price: 50.0,
    });

    expect(conflictAttempt.success).toBe(false);
    expect(conflictAttempt.statusCode).toBe(409);
    expect(conflictAttempt.isConcurrencyConflict).toBe(true);
    expect(conflictAttempt.errorCode).toBe("SLOT_OCCUPIED_CONCURRENCY_CONFLICT");
  });
});
