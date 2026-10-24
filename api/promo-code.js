import { errorResponse, HttpError } from "./_shared.js";
import { quotePromo } from "./_promos.js";

export default async function handler(request, response) {
    response.setHeader("Cache-Control", "no-store");
    try {
        if (request.method !== "POST") throw new HttpError(405, "Метод не поддерживается");
        const { code, items } = request.body || {};
        const result = await quotePromo(request, code, items);
        return response.status(200).json({ ok: true, ...result });
    } catch (error) {
        return errorResponse(response, error);
    }
}
