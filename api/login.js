import { handleLogin, readConfig } from '../server/servicenow.js';

export const POST = (request) => handleLogin(request, readConfig(process.env));
