/**
 * Safe Query Builder & Database Parameterization Engine
 * 
 * Atende à Solicitação #03:
 * 1. Localização e documentação de pontos de vulnerabilidade (interpolação e chamadas raw).
 * 2. Diferenciação formal entre Parâmetros de Valores ($1, $2) e Identificadores Dinâmicos ("tabela", "coluna").
 * 3. Banco de teste para validação de nomes com apóstrofo (ex: D'Angelo, Sant'Anna) sem alteração do filtro de proprietário.
 * 4. Substituição de concatenação por consultas parametrizadas seguras.
 */

// ========================================================
// 1. WHITELIST DE IDENTIFICADORES DINÂMICOS
// ========================================================
export const ALLOWED_TABLES = [
  "appointments",
  "clients",
  "barbers",
  "services",
  "tenants",
];

export const ALLOWED_COLUMNS = [
  "id",
  "tenant_id",
  "client_name",
  "client_phone",
  "barber_id",
  "barber_name",
  "service_name",
  "price",
  "start_time",
  "end_time",
  "status",
  "created_at",
];

export const ALLOWED_SORT_DIRECTIONS = ["ASC", "DESC"];

/**
 * Diferenciação Arquitetural: IDENTIFICADORES DINÂMICOS
 * Identificadores (tabelas, colunas) não aceitam bind de parâmetros ($1) no SQL padrão.
 * Devem ser rigorosamente validados contra uma whitelist segura e citados com aspas duplas ("ident").
 */
export function quoteIdentifier(identifier, allowedList = ALLOWED_COLUMNS) {
  if (!identifier || typeof identifier !== "string") {
    throw new Error("Identificador inválido: deve ser uma string não vazia.");
  }

  const cleanIdent = identifier.trim().toLowerCase();

  if (!allowedList.includes(cleanIdent)) {
    throw new Error(
      `VIOLAÇÃO DE SEGURANÇA: Identificador '${identifier}' não é permitido. Lista autorizada: [${allowedList.join(
        ", "
      )}]`
    );
  }

  // Citação segura de identificador PostgreSQL (aspas duplas)
  return `"${cleanIdent}"`;
}

// ========================================================
// 2. CONSULTA VULNERÁVEL (EVIDÊNCIA DE VULNERABILIDADE)
// ========================================================
/**
 * PONTO VULNERÁVEL (Antes da correção):
 * Interpolação manual de strings em consultas SQL.
 * 
 * Falhas demonstradas:
 * a) Apóstrofos legítimos (D'Angelo, Sant'Anna) quebram a sintaxe SQL com aspas desemparelhadas.
 * b) Apóstrofos maliciosos (D'Angelo' OR tenant_id = 'alvo') alteram o predicado de filtro
 *    e vazam dados de outros proprietários (bypass de isolamento multi-tenant).
 */
export function vulnerableRawQuery(ownerId, clientName, options = {}) {
  const table = options.table || "appointments";
  const orderBy = options.orderBy || "start_time";

  // VULNERABILIDADE: Interpolação direta de valores e identificadores
  return `SELECT * FROM ${table} WHERE tenant_id = '${ownerId}' AND client_name = '${clientName}' ORDER BY ${orderBy} ASC`;
}

// ========================================================
// 3. CONSULTA PARAMETRIZADA SEGURA (DEPOIS DA CORREÇÃO)
// ========================================================
/**
 * SOLUÇÃO SEGURA:
 * - Identificadores validados por whitelist e citados ("table", "column").
 * - Valores fornecidos via marcadores parametrizados ($1, $2, ...), onde apóstrofos
 *   são tratados estritamente como dados e jamais como delimitadores de código SQL.
 */
export function buildSafeParameterizedQuery(ownerId, clientName, options = {}) {
  if (!ownerId || typeof ownerId !== "string") {
    throw new Error("O parâmetro ownerId (tenant_id) é obrigatório e deve ser uma string.");
  }

  // 1. Sanitização e Quoting de Identificadores Dinâmicos
  const safeTable = quoteIdentifier(options.table || "appointments", ALLOWED_TABLES);
  const safeOrderBy = quoteIdentifier(options.orderBy || "start_time", ALLOWED_COLUMNS);
  const dir = (options.direction || "ASC").toUpperCase();
  const sortDirection = ALLOWED_SORT_DIRECTIONS.includes(dir)
    ? dir
    : "ASC";

  const values = [ownerId];
  let whereClauses = [`"tenant_id" = $1`];

  // 2. Tratamento de Valores como Parâmetros Vinculados ($2, $3...)
  if (clientName !== undefined && clientName !== null) {
    if (options.partialMatch) {
      // Para LIKE/ILIKE, os curingas % são incluídos no VALOR DO PARÂMETRO, não na query
      values.push(`%${clientName}%`);
      whereClauses.push(`"client_name" ILIKE $${values.length}`);
    } else {
      values.push(clientName);
      whereClauses.push(`"client_name" = $${values.length}`);
    }
  }

  const text = `SELECT * FROM ${safeTable} WHERE ${whereClauses.join(" AND ")} ORDER BY ${safeOrderBy} ${sortDirection}`;

  return {
    text,
    values,
  };
}

/**
 * Construtor de Query Parametrizada orientado a Objeto de Configuração
 */
export function buildParametricQuery(config = {}) {
  const { table = "appointments", filters = {}, allowedColumns = ALLOWED_COLUMNS } = config || {};
  const safeTable = quoteIdentifier(table, ALLOWED_TABLES);
  const keys = Object.keys(filters);
  const params = [];
  const whereClauses = [];

  keys.forEach((key) => {
    if (allowedColumns.includes(key)) {
      params.push(filters[key]);
      whereClauses.push(`"${key}" = $${params.length}`);
    }
  });

  const sql = `SELECT * FROM ${safeTable}${whereClauses.length > 0 ? " WHERE " + whereClauses.join(" AND ") : ""};`;
  return {
    sql,
    params,
    text: sql,
    values: params,
  };
}

// ========================================================
// 4. BANCO DE TESTE EM MEMÓRIA (SIMULADOR DE ISOLAMENTO)
// ========================================================
/**
 * Cria uma base de dados isolada para testes locais de isolamento multi-tenant
 * e integridade contra apóstrofos.
 */
export function createTestDatabase() {
  return [
    {
      id: "apt-101",
      tenant_id: "barbearia_alpha",
      client_name: "D'Angelo",
      price: 55.0,
      start_time: "10:00",
      status: "confirmed",
    },
    {
      id: "apt-102",
      tenant_id: "barbearia_alpha",
      client_name: "Sant'Anna",
      price: 45.0,
      start_time: "11:00",
      status: "confirmed",
    },
    {
      id: "apt-103",
      tenant_id: "barbearia_alpha",
      client_name: "Carlos Eduardo",
      price: 60.0,
      start_time: "14:00",
      status: "confirmed",
    },
    // Registros confidenciais da barbearia concorrente (barbearia_beta):
    {
      id: "apt-201",
      tenant_id: "barbearia_beta",
      client_name: "D'Angelo",
      price: 150.0, // Preço vip confidencial
      start_time: "09:00",
      status: "confirmed",
    },
    {
      id: "apt-202",
      tenant_id: "barbearia_beta",
      client_name: "Roberto Concorrente",
      price: 200.0,
      start_time: "15:00",
      status: "confirmed",
    },
  ];
}

/**
 * Executor da Consulta Vulnerável no Banco de Teste
 * Demonstra a falha de sintaxe por apóstrofo e o vazamento do proprietário.
 */
export function executeVulnerableQuery(database, rawSql) {
  // Simulação de injeção SQL onde "OR tenant_id =" quebra o predicado do proprietário
  const orInjectionMatch = rawSql.match(
    /WHERE\s+tenant_id\s*=\s*'([^']+)'\s+AND\s+client_name\s*=\s*'(.*?)'\s+OR\s+tenant_id\s*=\s*'([^']+)'/i
  );

  if (orInjectionMatch) {
    const [, originalOwner, injectedName, exploitedOwner] = orInjectionMatch;
    // O SQL manual permitiu que o predicado OR executasse no escopo do atacante!
    return database.filter(
      (row) =>
        (row.tenant_id === originalOwner && row.client_name === injectedName) ||
        row.tenant_id === exploitedOwner
    );
  }

  // Verificação de erro de sintaxe SQL causado por apóstrofo desemparelhado
  // Conta a quantidade de aspas simples não escapadas
  const singleQuotesCount = (rawSql.match(/'/g) || []).length;
  if (singleQuotesCount % 2 !== 0) {
    throw new Error(
      `SyntaxError: unterminated quoted string at near position in SQL: ${rawSql}`
    );
  }

  // Consulta regular concatenada
  const match = rawSql.match(
    /WHERE\s+tenant_id\s*=\s*'([^']+)'\s+AND\s+client_name\s*=\s*'([^']+)'/i
  );

  if (!match) return [];
  const [, ownerId, clientName] = match;

  return database.filter(
    (row) => row.tenant_id === ownerId && row.client_name === clientName
  );
}

/**
 * Executor da Consulta Parametrizada Segura no Banco de Teste
 * Garante que parâmetros são avaliados estritamente como dados literais.
 */
export function executeSafeParameterizedQuery(database, parameterizedQuery) {
  const { text, values } = parameterizedQuery;

  if (!text || !Array.isArray(values)) {
    throw new Error("A consulta parametrizada deve conter { text, values }.");
  }

  const [ownerId, clientNameParam] = values;

  // Filtro estrito de proprietário: JAMAIS alterável por valores de entrada
  return database.filter((row) => {
    // 1. Isolamento estrito de proprietário (tenant_id)
    if (row.tenant_id !== ownerId) return false;

    // 2. Se houver filtro de nome do cliente, avalia como dado literal
    if (clientNameParam !== undefined) {
      if (typeof clientNameParam === "string" && clientNameParam.startsWith("%")) {
        const cleanPattern = clientNameParam.replace(/%/g, "").toLowerCase();
        return row.client_name.toLowerCase().includes(cleanPattern);
      }
      return row.client_name === clientNameParam;
    }

    return true;
  });
}
