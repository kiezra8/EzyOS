/**
 * EzyOS Sync Engine
 * Implements the Outbox Pattern for offline-first synchronization.
 *
 * Architecture:
 * 1. All writes go to Dexie first (local-first).
 * 2. A SyncQueueItem is created for every mutation.
 * 3. A background worker processes pending queue items when online.
 * 4. Supabase Realtime listens for remote changes and updates Dexie.
 * 5. Conflict resolution: Server-Wins (remote timestamp > local = use remote).
 */

import { v4 as uuidv4 } from 'uuid'; // We'll use crypto.randomUUID instead
import { db, type SyncQueueItem } from './db';
import { supabase, isSupabaseConfigured } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type SyncableTable =
  | 'profiles'
  | 'categories'
  | 'products'
  | 'batches'
  | 'sales'
  | 'sale_items'
  | 'purchases'
  | 'purchase_items'
  | 'expenses';

type Operation = 'INSERT' | 'UPDATE' | 'DELETE';

interface SyncEngineConfig {
  userId: string;
  /** How often the worker polls the queue (ms) */
  pollIntervalMs?: number;
  /** Max retry attempts before marking failed */
  maxAttempts?: number;
}

// ─── SyncEngine Class ─────────────────────────────────────────────────────────

class SyncEngine {
  private userId: string = '';
  private pollIntervalMs: number;
  private maxAttempts: number;
  private workerTimer: ReturnType<typeof setInterval> | null = null;
  private realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;

  constructor() {
    this.pollIntervalMs = 5000; // 5 seconds
    this.maxAttempts = 5;

    // Listen to network status changes
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('[SyncEngine] Back online. Triggering sync...');
      this.processSyncQueue();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('[SyncEngine] Gone offline.');
    });
  }

  /** Initialize the sync engine for a specific authenticated user */
  async init(config: SyncEngineConfig) {
    this.userId = config.userId;
    if (config.pollIntervalMs) this.pollIntervalMs = config.pollIntervalMs;
    if (config.maxAttempts) this.maxAttempts = config.maxAttempts;

    if (!isSupabaseConfigured) {
      console.warn('[SyncEngine] Supabase not configured. Running offline-only.');
      return;
    }

    // Start the background outbox worker
    this.startWorker();

    // Start Realtime subscriptions for all syncable tables
    this.subscribeToRealtime();

    // Do an initial sync pull on startup
    await this.pullFromSupabase();

    console.log(`[SyncEngine] Initialized for user: ${this.userId}`);
  }

  /** Stop the sync engine (call on logout) */
  stop() {
    if (this.workerTimer) {
      clearInterval(this.workerTimer);
      this.workerTimer = null;
    }
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.userId = '';
    console.log('[SyncEngine] Stopped.');
  }

  // ─── Outbox: Enqueue mutations ──────────────────────────────────────────────

  /**
   * Call this after every local Dexie write.
   * It adds the mutation to the sync_queue for later upload.
   */
  async enqueue(
    tableName: SyncableTable,
    operation: Operation,
    recordId: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    if (!this.userId) return;

    const item: SyncQueueItem = {
      id: crypto.randomUUID(),
      user_id: this.userId,
      table_name: tableName,
      operation,
      record_id: recordId,
      payload,
      status: 'pending',
      attempts: 0,
      created_at: new Date().toISOString(),
    };

    await db.sync_queue.add(item);

    // If we're online, trigger an immediate sync attempt
    if (this.isOnline && !this.isSyncing) {
      this.processSyncQueue();
    }
  }

  // ─── Worker: Process the outbox ─────────────────────────────────────────────

  private startWorker() {
    if (this.workerTimer) clearInterval(this.workerTimer);
    this.workerTimer = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.processSyncQueue();
      }
    }, this.pollIntervalMs);
  }

  private async processSyncQueue(): Promise<void> {
    if (this.isSyncing || !this.userId || !isSupabaseConfigured) return;
    this.isSyncing = true;

    try {
      // Fetch pending items, ordered oldest first
      const pendingItems = await db.sync_queue
        .where('[user_id+status]')
        .equals([this.userId, 'pending'])
        .limit(50)
        .sortBy('created_at');

      if (pendingItems.length === 0) {
        this.isSyncing = false;
        return;
      }

      console.log(`[SyncEngine] Processing ${pendingItems.length} queue items...`);

      for (const item of pendingItems) {
        await this.processQueueItem(item);
      }
    } catch (error) {
      console.error('[SyncEngine] Worker error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async processQueueItem(item: SyncQueueItem): Promise<void> {
    // Mark as processing
    await db.sync_queue.update(item.id, { status: 'processing' });

    try {
      if (item.operation === 'INSERT' || item.operation === 'UPDATE') {
        // Use upsert for both INSERT and UPDATE (idempotent)
        const { error } = await supabase
          .from(item.table_name)
          .upsert(item.payload as Record<string, unknown>, {
            onConflict: 'id',
          });

        if (error) throw error;
      } else if (item.operation === 'DELETE') {
        const { error } = await supabase
          .from(item.table_name)
          .delete()
          .eq('id', item.record_id)
          .eq('user_id', this.userId);

        if (error) throw error;
      }

      // Mark as done and remove from queue
      await db.sync_queue.update(item.id, {
        status: 'done',
        processed_at: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const newAttempts = item.attempts + 1;
      const newStatus = newAttempts >= this.maxAttempts ? 'failed' : 'pending';

      console.error(`[SyncEngine] Failed to sync item ${item.id}:`, errMsg);

      await db.sync_queue.update(item.id, {
        status: newStatus,
        attempts: newAttempts,
        last_error: errMsg,
      });
    }
  }

  // ─── Realtime: Pull remote changes ──────────────────────────────────────────

  private subscribeToRealtime() {
    if (!isSupabaseConfigured || !this.userId) return;

    const tables: SyncableTable[] = [
      'products', 'batches', 'categories',
      'sales', 'sale_items', 'expenses',
      'purchases', 'purchase_items',
    ];

    this.realtimeChannel = supabase.channel(`ezyos-user-${this.userId}`);

    for (const tableName of tables) {
      this.realtimeChannel.on(
        'postgres_changes' as Parameters<typeof this.realtimeChannel.on>[0],
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `user_id=eq.${this.userId}`,
        },
        (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          this.handleRealtimeChange(tableName, payload);
        }
      );
    }

    this.realtimeChannel.subscribe((status: string) => {
      console.log(`[SyncEngine] Realtime status: ${status}`);
    });
  }

  /**
   * Handle incoming Realtime changes from Supabase.
   * Strategy: Server-Wins conflict resolution.
   * If remote updated_at > local updated_at, use remote data.
   */
  private async handleRealtimeChange(
    tableName: SyncableTable,
    payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }
  ) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    const dexieTable = db[tableName] as Dexie.Table;

    try {
      if (eventType === 'DELETE') {
        const id = oldRecord?.id as string;
        if (id) {
          await dexieTable.delete(id);
          console.log(`[Realtime] Deleted ${tableName}:${id}`);
        }
        return;
      }

      if (!newRecord?.id) return;

      const remoteUpdatedAt = new Date(newRecord.updated_at as string ?? newRecord.created_at as string);
      const localRecord = await dexieTable.get(newRecord.id as string);

      if (localRecord) {
        const localUpdatedAt = new Date(localRecord.updated_at ?? localRecord.created_at);

        // Server-Wins: only apply remote change if it's newer
        if (remoteUpdatedAt > localUpdatedAt) {
          await dexieTable.put(newRecord as never);
          console.log(`[Realtime] Updated ${tableName}:${newRecord.id}`);
        } else {
          console.log(`[Realtime] Skipped ${tableName}:${newRecord.id} (local is newer)`);
        }
      } else {
        // Record doesn't exist locally — always insert
        await dexieTable.put(newRecord as never);
        console.log(`[Realtime] Inserted ${tableName}:${newRecord.id}`);
      }
    } catch (error) {
      console.error(`[Realtime] Error handling change for ${tableName}:`, error);
    }
  }

  // ─── Initial Pull: Fetch all data from Supabase on first login ──────────────

  async pullFromSupabase(): Promise<void> {
    if (!isSupabaseConfigured || !this.userId) return;

    const tables: SyncableTable[] = [
      'categories', 'products', 'batches',
      'sales', 'sale_items', 'expenses',
      'purchases', 'purchase_items',
    ];

    console.log('[SyncEngine] Pulling data from Supabase...');

    for (const tableName of tables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('user_id', this.userId)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error(`[SyncEngine] Pull failed for ${tableName}:`, error);
          continue;
        }

        if (!data || data.length === 0) continue;

        const dexieTable = db[tableName] as Dexie.Table;

        // Bulk put with server-wins conflict resolution
        await db.transaction('rw', dexieTable, async () => {
          for (const record of data) {
            const local = await dexieTable.get(record.id);
            if (!local) {
              await dexieTable.put(record);
            } else {
              const remoteTs = new Date(record.updated_at ?? record.created_at);
              const localTs = new Date(local.updated_at ?? local.created_at);
              if (remoteTs > localTs) {
                await dexieTable.put(record);
              }
            }
          }
        });

        console.log(`[SyncEngine] Pulled ${data.length} records for ${tableName}`);
      } catch (error) {
        console.error(`[SyncEngine] Error pulling ${tableName}:`, error);
      }
    }
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const syncEngine = new SyncEngine();

// ─── Mutation Helpers (wrap Dexie writes + enqueue) ──────────────────────────

/** Wraps a local Dexie write and enqueues it for sync */
export async function localInsert<T extends { id: string }>(
  table: SyncableTable,
  record: T
): Promise<void> {
  await (db[table] as Dexie.Table).put(record);
  await syncEngine.enqueue(table, 'INSERT', record.id, record as unknown as Record<string, unknown>);
}

export async function localUpdate<T extends { id: string }>(
  table: SyncableTable,
  id: string,
  changes: Partial<T>,
  fullRecord: T
): Promise<void> {
  await (db[table] as Dexie.Table).update(id, changes);
  await syncEngine.enqueue(table, 'UPDATE', id, fullRecord as unknown as Record<string, unknown>);
}

export async function localDelete(
  table: SyncableTable,
  id: string
): Promise<void> {
  await (db[table] as Dexie.Table).delete(id);
  await syncEngine.enqueue(table, 'DELETE', id, { id });
}
