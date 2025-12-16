import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    // Симуляция серверной логики (заменяется на интеграции с CRM/Telegram/Email)
    console.log('[QUIZ_LEAD]', JSON.stringify(data));

    return NextResponse.json({
      success: true,
      message: 'Заявка принята',
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, message: 'Некорректное тело запроса' },
      { status: 400 }
    );
  }
}
