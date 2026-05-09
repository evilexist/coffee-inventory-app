import sql from '../db';

const AUTH_SCHEMA: Record<string, string[]> = {
  users: ['id', 'username', 'password_hash', 'display_name', 'is_active', 'created_at', 'last_login']
};

const BUSINESS_SCHEMA: Record<string, string[]> = {
  coffee_beans: [
    'id', 'user_id', 'name', 'origin_country', 'origin_region', 'origin', 'brand_roaster',
    'producer', 'altitude', 'variety', 'flavor_notes', 'roast_level', 'agtron', 'process',
    'roast_date', 'reference_price', 'stock', 'description', 'deleted_at', 'created_at', 'updated_at'
  ],
  inventory_logs: ['id', 'user_id', 'bean_id', 'name', 'type', 'amount', 'date', 'roast_date', 'note', 'created_at'],
  tasting_records: [
    'id', 'user_id', 'bean_id', 'date', 'dose', 'brew_method', 'dripper', 'filter_paper',
    'grinder', 'grind_size', 'water_temp', 'water_quality', 'ratio', 'rating', 'notes',
    'improvement', 'created_at'
  ]
};

const schemaValidationState = {
  auth: false,
  business: false,
  application: false
};

async function getTableColumns(tableName: string): Promise<Set<string>> {
  const columns = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${tableName}
  `;
  return new Set(columns.map((column: any) => column.column_name));
}

async function ensureSchemaReady(
  requiredSchema: Record<string, string[]>,
  cacheKey: keyof typeof schemaValidationState
): Promise<void> {
  if (schemaValidationState[cacheKey]) {
    return;
  }

  const missingByTable: string[] = [];

  for (const [tableName, requiredColumns] of Object.entries(requiredSchema)) {
    const existingColumns = await getTableColumns(tableName);
    const missingColumns = requiredColumns.filter(column => !existingColumns.has(column));
    if (missingColumns.length > 0) {
      missingByTable.push(`${tableName}: ${missingColumns.join(', ')}`);
    }
  }

  if (missingByTable.length > 0) {
    throw new Error(
      `数据库结构不完整，请先执行 db/migrations/007_reconcile_current_schema.sql。缺失项: ${missingByTable.join(' | ')}`
    );
  }

  schemaValidationState[cacheKey] = true;
}

export async function ensureAuthSchemaReady(): Promise<void> {
  await ensureSchemaReady(AUTH_SCHEMA, 'auth');
}

export async function ensureBusinessSchemaReady(): Promise<void> {
  await ensureSchemaReady(BUSINESS_SCHEMA, 'business');
}

export async function ensureApplicationSchemaReady(): Promise<void> {
  await ensureSchemaReady({ ...AUTH_SCHEMA, ...BUSINESS_SCHEMA }, 'application');
}
