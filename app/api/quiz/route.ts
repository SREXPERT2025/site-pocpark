import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: 'Этот endpoint больше не используется. Отправьте заявку через актуальную форму.',
    },
    { status: 410 }
  );
}
