import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import type {
  AuditEventView,
  BatchSummaryView,
  CompletionResult,
  ConfirmResult,
  SessionView,
  WeighingRecordView,
} from '../../shared/contracts/weighing';
import { AuditEventRepository } from './audit-event.repository';
import { WeighingRecordRepository } from './weighing-record.repository';
import { WeighingSessionService } from './weighing-session.service';

export class StartSessionDto {
  @IsString()
  batchId!: string;
}

export class IdentityDto {
  @IsString()
  code!: string;
}

export class OverrideDto {
  @IsString()
  pin!: string;

  @IsString()
  reason!: string;
}

/** WeighingMS application API for the guided weighing session (Screen 2). */
@Controller('sessions')
export class WeighingController {
  constructor(
    private readonly sessions: WeighingSessionService,
    private readonly records: WeighingRecordRepository,
    private readonly audit: AuditEventRepository,
  ) {}

  @Post()
  start(@Body() dto: StartSessionDto): Promise<SessionView> {
    return this.sessions.start(dto.batchId);
  }

  @Get(':sessionId')
  get(@Param('sessionId') sessionId: string): SessionView {
    return this.sessions.get(sessionId);
  }

  @Post(':sessionId/components/:componentId/activate')
  @HttpCode(200)
  activate(
    @Param('sessionId') sessionId: string,
    @Param('componentId') componentId: string,
  ): Promise<SessionView> {
    return this.sessions.activateComponent(sessionId, componentId);
  }

  @Post(':sessionId/retare')
  @HttpCode(200)
  retare(@Param('sessionId') sessionId: string): Promise<SessionView> {
    return this.sessions.retare(sessionId);
  }

  @Post(':sessionId/confirm')
  @HttpCode(200)
  confirm(@Param('sessionId') sessionId: string): Promise<ConfirmResult> {
    return this.sessions.confirm(sessionId);
  }

  @Post(':sessionId/identity')
  @HttpCode(200)
  identity(@Param('sessionId') sessionId: string, @Body() dto: IdentityDto): SessionView {
    return this.sessions.verifyIdentity(sessionId, dto.code);
  }

  @Post(':sessionId/override')
  @HttpCode(200)
  override(
    @Param('sessionId') sessionId: string,
    @Body() dto: OverrideDto,
  ): Promise<ConfirmResult> {
    return this.sessions.authoriseOverride(sessionId, dto.pin, dto.reason);
  }

  @Post(':sessionId/quit')
  @HttpCode(200)
  quit(@Param('sessionId') sessionId: string): Promise<SessionView> {
    return this.sessions.quit(sessionId);
  }

  @Get(':sessionId/weighings')
  weighings(@Param('sessionId') sessionId: string): WeighingRecordView[] {
    return this.records.listBySession(sessionId);
  }

  @Get(':sessionId/audit')
  audits(@Param('sessionId') sessionId: string): AuditEventView[] {
    return this.audit.listBySession(sessionId);
  }

  @Post(':sessionId/complete')
  @HttpCode(200)
  complete(@Param('sessionId') sessionId: string): Promise<CompletionResult> {
    return this.sessions.complete(sessionId);
  }

  @Get(':sessionId/summary')
  summary(@Param('sessionId') sessionId: string): BatchSummaryView {
    return this.sessions.getSummary(sessionId);
  }
}
