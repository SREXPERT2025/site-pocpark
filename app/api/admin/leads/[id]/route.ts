import { NextRequest } from 'next/server';
import { leadAdminJson, requireLeadAdmin } from '@/app/lib/lead-admin-api';
import {
  deleteLeadForAdmin,
  transitionLeadForAdmin,
} from '@/app/lib/lead-admin-core';
import {
  LEAD_CLOSE_OUTCOMES,
  LeadRegistryError,
  type LeadCloseOutcome,
} from '@/app/lib/lead-registry-core';
import { getLeadRegistryDatabase } from '@/app/lib/lead-registry-database';

function validLeadId(value: string) {
  return /^[a-f0-9]{32}$/.test(value);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = requireLeadAdmin(
    request,
    'process',
    { requireSameOrigin: true },
  );
  if ('response' in auth) return auth.response;
  if (!validLeadId(params.id)) {
    return leadAdminJson(
      { error: 'Лид не найден.', code: 'LEAD_NOT_FOUND' },
      { status: 404 },
    );
  }

  const payload = (await request.json().catch(() => null)) as {
    action?: unknown;
    assignedTo?: unknown;
    closeOutcome?: unknown;
  } | null;
  const action = typeof payload?.action === 'string' ? payload.action : '';
  const assignedTo = typeof payload?.assignedTo === 'string'
    ? payload.assignedTo
    : undefined;
  const closeOutcome = typeof payload?.closeOutcome === 'string'
    ? payload.closeOutcome as LeadCloseOutcome
    : undefined;

  if (
    !['assign', 'contact', 'close'].includes(action) ||
    (
      action === 'close' &&
      (!closeOutcome || !LEAD_CLOSE_OUTCOMES.includes(closeOutcome))
    )
  ) {
    return leadAdminJson(
      { error: 'Некорректное действие.', code: 'INVALID_ACTION' },
      { status: 400 },
    );
  }

  try {
    const updated = transitionLeadForAdmin(getLeadRegistryDatabase(), {
      actor: {
        userId: auth.session.userId,
        role: auth.session.role,
      },
      leadId: params.id,
      toStatus: action === 'assign'
        ? 'assigned'
        : action === 'contact'
          ? 'contacted'
          : 'closed',
      assignedTo: action === 'assign' ? assignedTo : undefined,
      closeOutcome: action === 'close' ? closeOutcome : undefined,
    });
    return leadAdminJson({ ok: true, status: updated.status });
  } catch (error) {
    if (error instanceof LeadRegistryError) {
      const status = error.code === 'LEAD_NOT_FOUND' ? 404 : 409;
      return leadAdminJson(
        { error: error.message, code: error.code },
        { status },
      );
    }
    return leadAdminJson(
      { error: 'Не удалось обновить лид.', code: 'INVALID_ACTION' },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = requireLeadAdmin(
    request,
    'delete',
    { requireSameOrigin: true },
  );
  if ('response' in auth) return auth.response;
  if (!validLeadId(params.id)) {
    return leadAdminJson(
      { error: 'Лид не найден.', code: 'LEAD_NOT_FOUND' },
      { status: 404 },
    );
  }

  const payload = (await request.json().catch(() => null)) as {
    confirmation?: unknown;
    reason?: unknown;
  } | null;
  const expectedConfirmation = `RSP-${params.id.slice(0, 8).toUpperCase()}`;
  const reason = payload?.reason;
  if (
    payload?.confirmation !== expectedConfirmation ||
    !['privacy_request', 'test', 'director_decision'].includes(
      typeof reason === 'string' ? reason : '',
    )
  ) {
    return leadAdminJson(
      { error: 'Удаление не подтверждено.', code: 'CONFIRMATION_REQUIRED' },
      { status: 400 },
    );
  }

  const deleted = deleteLeadForAdmin(getLeadRegistryDatabase(), {
    actor: {
      userId: auth.session.userId,
      role: auth.session.role,
    },
    leadId: params.id,
    reason: reason as 'privacy_request' | 'test' | 'director_decision',
  });
  return deleted
    ? leadAdminJson({ ok: true })
    : leadAdminJson(
      { error: 'Лид не найден.', code: 'LEAD_NOT_FOUND' },
      { status: 404 },
    );
}
