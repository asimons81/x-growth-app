import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  connectionString: process.env.NEXT_PUBLIC_SUPABASE_URL!,
} satisfies Config;
