import type { SqlClient } from "../database/catalog-repository.ts";
export async function consumeLoginBucket(
  db: SqlClient,
  bucket: string,
  windowId: number,
) {
  const { rows } = await db.query<{ attempts: number }>(
    `INSERT INTO pitterpan_admin_login_limits(bucket,window_id,attempts) VALUES($1,$2,1)
 ON CONFLICT(bucket) DO UPDATE SET window_id=EXCLUDED.window_id,attempts=CASE WHEN pitterpan_admin_login_limits.window_id=EXCLUDED.window_id THEN pitterpan_admin_login_limits.attempts+1 ELSE 1 END RETURNING attempts`,
    [bucket, windowId],
  );
  return rows[0].attempts <= 8;
}
