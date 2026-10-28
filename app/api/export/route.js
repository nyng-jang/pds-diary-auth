import { exportAll } from '@/lib/export';

export const dynamic = 'force-dynamic';

// GET /api/export : 내 자료 전체를 JSON 파일 하나로 내려받는다.
export async function GET() {
  try {
    const body = await exportAll();
    const stamp = body.exported_at.slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
    return new Response(JSON.stringify(body, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="pds-export-${stamp}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    // DB 주소·비밀번호가 담길 수 있는 오류 원문은 내보내지 않는다.
    console.error('export failed', e?.code ?? e?.name);
    return Response.json({ ok: false, error: '내보내기에 실패했어요. 잠시 뒤 다시 시도해 주세요.' }, { status: 500 });
  }
}
