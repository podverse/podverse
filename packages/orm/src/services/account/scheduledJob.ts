import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db/index.js';
import { ScheduledJob } from '@orm/entities/account/scheduledJob.js';
import type { FindOptionsWhere, Repository } from 'typeorm';
import { In, LessThan, LessThanOrEqual } from 'typeorm';

import { ScheduledJobStatusEnum } from '@podverse/helpers';

type UpsertScheduledJobDto = {
  dedupe_key: string;
  job_type: string;
  max_attempts?: number;
  payload: Record<string, unknown>;
  run_after: Date;
};

type ClaimDueBatchParams = {
  limit: number;
  now?: Date;
  worker_id: string;
};

type ListDuePendingBatchParams = {
  limit: number;
  now?: Date;
};

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_CLAIM_BATCH_LIMIT = 100;
const TERMINAL_JOB_STATUSES = [
  ScheduledJobStatusEnum.Completed,
  ScheduledJobStatusEnum.Cancelled,
  ScheduledJobStatusEnum.Failed,
] as const;

export class ScheduledJobService {
  protected repositoryRead: Repository<ScheduledJob>;
  protected repositoryReadWrite: Repository<ScheduledJob>;

  constructor() {
    this.repositoryRead = AppDataSourceRead.getRepository(ScheduledJob);
    this.repositoryReadWrite = AppDataSourceReadWrite.getRepository(ScheduledJob);
  }

  async getByDedupeKey(dedupe_key: string): Promise<ScheduledJob | null> {
    return this.repositoryRead.findOne({
      where: { dedupe_key },
    });
  }

  async upsertByDedupeKey(dto: UpsertScheduledJobDto): Promise<ScheduledJob> {
    const existing = await this.repositoryReadWrite.findOne({
      where: { dedupe_key: dto.dedupe_key },
    });

    if (!existing) {
      const row = this.repositoryReadWrite.create({
        attempts: 0,
        dedupe_key: dto.dedupe_key,
        job_type: dto.job_type,
        max_attempts: dto.max_attempts ?? DEFAULT_MAX_ATTEMPTS,
        payload: dto.payload,
        run_after: dto.run_after,
        status: ScheduledJobStatusEnum.Pending,
      });
      return this.repositoryReadWrite.save(row);
    }

    existing.job_type = dto.job_type;
    existing.last_error = null;
    existing.locked_at = null;
    existing.locked_by = null;
    existing.max_attempts = dto.max_attempts ?? existing.max_attempts;
    existing.payload = dto.payload;
    existing.run_after = dto.run_after;
    existing.status = ScheduledJobStatusEnum.Pending;
    return this.repositoryReadWrite.save(existing);
  }

  async cancelByDedupeKey(dedupe_key: string): Promise<ScheduledJob | null> {
    const existing = await this.repositoryReadWrite.findOne({
      where: { dedupe_key },
    });
    if (!existing) {
      return null;
    }

    existing.status = ScheduledJobStatusEnum.Cancelled;
    existing.locked_at = null;
    existing.locked_by = null;
    return this.repositoryReadWrite.save(existing);
  }

  async listDuePendingBatch(params: ListDuePendingBatchParams): Promise<ScheduledJob[]> {
    const now = params.now ?? new Date();
    const limit = Math.max(1, Math.min(params.limit, DEFAULT_CLAIM_BATCH_LIMIT));

    return this.repositoryRead.find({
      order: {
        id: 'ASC',
        run_after: 'ASC',
      },
      take: limit,
      where: {
        run_after: LessThanOrEqual(now),
        status: ScheduledJobStatusEnum.Pending,
      },
    });
  }

  async claimDueBatch(params: ClaimDueBatchParams): Promise<ScheduledJob[]> {
    const now = params.now ?? new Date();
    const limit = Math.max(1, Math.min(params.limit, DEFAULT_CLAIM_BATCH_LIMIT));
    const where: FindOptionsWhere<ScheduledJob> = {
      run_after: LessThanOrEqual(now),
      status: ScheduledJobStatusEnum.Pending,
    };

    const dueJobs = await this.repositoryReadWrite.find({
      order: {
        id: 'ASC',
        run_after: 'ASC',
      },
      take: limit,
      where,
    });

    if (dueJobs.length === 0) {
      return [];
    }

    const claimedJobs = dueJobs.map((job) => {
      const claimedJob = job;
      claimedJob.attempts = job.attempts + 1;
      claimedJob.locked_at = now;
      claimedJob.locked_by = params.worker_id;
      claimedJob.status = ScheduledJobStatusEnum.Running;
      return claimedJob;
    });

    return this.repositoryReadWrite.save(claimedJobs);
  }

  async markCompleted(job_id: number): Promise<ScheduledJob | null> {
    const job = await this.repositoryReadWrite.findOne({ where: { id: job_id } });
    if (!job) {
      return null;
    }

    job.last_error = null;
    job.locked_at = null;
    job.locked_by = null;
    job.status = ScheduledJobStatusEnum.Completed;
    return this.repositoryReadWrite.save(job);
  }

  async markCancelled(job_id: number, reason?: string): Promise<ScheduledJob | null> {
    const job = await this.repositoryReadWrite.findOne({ where: { id: job_id } });
    if (!job) {
      return null;
    }

    job.last_error = reason ?? null;
    job.locked_at = null;
    job.locked_by = null;
    job.status = ScheduledJobStatusEnum.Cancelled;
    return this.repositoryReadWrite.save(job);
  }

  async markFailed(job_id: number, error_message: string): Promise<ScheduledJob | null> {
    const job = await this.repositoryReadWrite.findOne({ where: { id: job_id } });
    if (!job) {
      return null;
    }

    job.last_error = error_message;
    job.locked_at = null;
    job.locked_by = null;
    job.status = ScheduledJobStatusEnum.Failed;
    return this.repositoryReadWrite.save(job);
  }

  async requeueWithBackoff(
    job_id: number,
    error_message: string,
    backoff_ms: number
  ): Promise<ScheduledJob | null> {
    const job = await this.repositoryReadWrite.findOne({ where: { id: job_id } });
    if (!job) {
      return null;
    }

    const now = Date.now();
    const normalizedBackoffMs = Math.max(0, backoff_ms);

    job.last_error = error_message;
    job.locked_at = null;
    job.locked_by = null;
    job.run_after = new Date(now + normalizedBackoffMs);
    job.status = ScheduledJobStatusEnum.Pending;
    return this.repositoryReadWrite.save(job);
  }

  async releaseStaleRunningBefore(cutoff: Date): Promise<number> {
    const result = await this.repositoryReadWrite.update(
      {
        status: ScheduledJobStatusEnum.Running,
        locked_at: LessThan(cutoff),
      },
      {
        locked_at: null,
        locked_by: null,
        status: ScheduledJobStatusEnum.Pending,
      }
    );

    return result.affected ?? 0;
  }

  async deleteTerminalBefore(cutoff: Date): Promise<number> {
    const result = await this.repositoryReadWrite.delete({
      status: In([...TERMINAL_JOB_STATUSES]),
      updated_at: LessThan(cutoff),
    });

    return result.affected ?? 0;
  }
}
