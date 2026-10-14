// vercel.json rewrites /api/now/* here as /api/proxy?path=*.
import { handleProxy, readConfig } from '../server/servicenow.js';

function handle(request) {
  const params = new URL(request.url).searchParams;
  const path = params.get('path') || '';
  params.delete('path');
  return handleProxy(request, readConfig(process.env), path, params);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
