import { describe, it, expect, vi } from "vitest";
import { supabase } from "../../lib/supabase";

describe("Integration / Service: Supabase client", () => {
  it("initializes client with auth configuration", () => {
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
    expect(supabase.from).toBeTypeOf("function");
  });

  it("builds query chains for tables properly", () => {
    const query = supabase.from("services").select("*").order("name");
    expect(query).toBeDefined();
    expect(query.select).toBeTypeOf("function");
    expect(query.order).toBeTypeOf("function");
  });

  it("handles mock responses safely", async () => {
    const mockServicesData = [
      { id: "1", name: "Corte Degradê", price: 45, duration_minutes: 30 },
      { id: "2", name: "Barba Terapia", price: 35, duration_minutes: 25 },
    ];

    vi.spyOn(supabase, "from").mockImplementation((table) => {
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockServicesData, error: null }),
      };
    });

    const res = await supabase.from("services").select("*").order("name");
    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(2);
    expect(res.data[0].name).toBe("Corte Degradê");
  });
});
