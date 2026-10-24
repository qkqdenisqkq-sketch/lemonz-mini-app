import { adminOnly, canonical, clean, configured, db, errorResponse, HttpError, similar, telegramUser, validMedia } from "./_shared.js";

async function getActiveSeason() {
    const rows = await db("seasons?status=eq.active&select=*&order=number.desc&limit=1");
    return rows[0] || null;
}

async function getWinners() {
    return db("season_winners?select=id,season_number,name,universe,category,author_username,created_at&order=created_at.desc&limit=50");
}

function assertOpenSeason(season) {
    if (!season) throw new HttpError(409, "Нет активного сезона");
    if (new Date(season.starts_at).getTime() > Date.now()) throw new HttpError(409, "Голосование ещё не началось");
    if (new Date(season.ends_at).getTime() <= Date.now()) throw new HttpError(409, "Сезон уже завершён");
}

async function validateEditedName(seasonId, name, excludeId = null) {
    const key = canonical(name);
    if (key.length < 2) throw new HttpError(400, "Некорректное имя персонажа");
    const [candidates, winners] = await Promise.all([
        db(`candidates?season_id=eq.${seasonId}&select=id,normalized_key,name`),
        db("season_winners?select=normalized_key,name"),
    ]);
    const duplicate = [...candidates.filter((item) => item.id !== excludeId), ...winners]
        .find((item) => similar(key, item.normalized_key));
    if (duplicate) throw new HttpError(409, `Персонаж «${duplicate.name}» уже участвует или побеждал ранее`);
    return key;
}

async function getState(user) {
    const active = await getActiveSeason();
    const winners = await getWinners();
    const discounts = user ? await db(`season_winners?author_id=eq.${user.id}&category=eq.community&select=id,name,discount_code,discount_redeemed`) : [];
    if (!active) return { ok: true, configured: true, season: { candidates: [], myVotes: {}, winners, discounts } };
    const [candidates, votes, comments] = await Promise.all([
        db(`candidates?season_id=eq.${active.id}&removed=eq.false&select=id,category,name,universe,image_url,description,author_username,created_at&order=created_at.asc`),
        db(`votes?season_id=eq.${active.id}&select=candidate_id,category,user_id`),
        db(`comments?season_id=eq.${active.id}&select=candidate_id`),
    ]);
    const tally = new Map(); const commentCounts = new Map(); const myVotes = {};
    for (const vote of votes) {
        tally.set(vote.candidate_id, (tally.get(vote.candidate_id) || 0) + 1);
        if (user && String(vote.user_id) === String(user.id)) myVotes[vote.category] = vote.candidate_id;
    }
    for (const comment of comments) commentCounts.set(comment.candidate_id, (commentCounts.get(comment.candidate_id) || 0) + 1);
    return { ok: true, configured: true, season: { ...active, candidates: candidates.map((candidate) => ({ ...candidate, votes: tally.get(candidate.id) || 0, comments: commentCounts.get(candidate.id) || 0 })), myVotes, winners, discounts } };
}

async function suggest(body, user) {
    const season = await getActiveSeason();
    assertOpenSeason(season);
    const name = clean(body.name, 80); const universe = clean(body.universe, 80);
    if (name.length < 2 || universe.length < 2) throw new HttpError(400, "Укажи персонажа и вселенную");
    const normalized_key = canonical(name);
    if (normalized_key.length < 2) throw new HttpError(400, "Некорректное имя персонажа");
    const [existing, pastWinners] = await Promise.all([
        db(`candidates?season_id=eq.${season.id}&select=normalized_key,name`),
        db("season_winners?select=normalized_key,name"),
    ]);
    const duplicate = [...existing, ...pastWinners].find((item) => similar(normalized_key, item.normalized_key));
    if (duplicate) throw new HttpError(409, `Персонаж «${duplicate.name}» уже предложен или побеждал ранее`);
    await db("rpc/suggest_candidate", { method: "POST", body: { p_user: user.id, p_username: user.username, p_name: name, p_universe: universe, p_image: validMedia(body.image_url), p_description: clean(body.description, 600), p_key: normalized_key } });
}

export default async function handler(request, response) {
    response.setHeader("Cache-Control", "no-store");
    try {
        if (request.method === "GET") {
            if (!configured()) return response.status(200).json({ ok: true, configured: false });
            const user = telegramUser(request, false);
            if (request.query.comments) {
                const id = Number(request.query.comments);
                if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, "Некорректный персонаж");
                const comments = await db(`comments?candidate_id=eq.${id}&select=id,username,text,media_url,created_at&order=created_at.asc&limit=300`);
                return response.status(200).json({ ok: true, comments });
            }
            return response.status(200).json(await getState(user));
        }
        if (request.method !== "POST") throw new HttpError(405, "Метод не поддерживается");
        const user = telegramUser(request); const body = request.body || {};
        const season = await getActiveSeason();
        switch (body.operation) {
            case "vote": {
                assertOpenSeason(season);
                const category = clean(body.category, 20);
                if (!["lemonz", "community"].includes(category)) throw new HttpError(400, "Некорректная категория");
                const candidateId = body.candidateId === null ? null : Number(body.candidateId);
                if (candidateId !== null && !Number.isSafeInteger(candidateId)) throw new HttpError(400, "Некорректный кандидат");
                await db("rpc/cast_season_vote", { method: "POST", body: { p_user: user.id, p_category: category, p_candidate: candidateId } });
                break;
            }
            case "suggest": await suggest(body, user); break;
            case "comment": {
                assertOpenSeason(season);
                const candidateId = Number(body.candidateId);
                const candidate = await db(`candidates?id=eq.${candidateId}&season_id=eq.${season.id}&removed=eq.false&select=id`);
                if (!candidate.length) throw new HttpError(404, "Персонаж не найден");
                const text = clean(body.text, 1500); const media_url = validMedia(body.media_url);
                if (!text && !media_url) throw new HttpError(400, "Добавь текст, фото или GIF");
                await db("comments", { method: "POST", body: { season_id: season.id, candidate_id: candidateId, user_id: user.id, username: user.username, text, media_url }, prefer: "return=minimal" });
                break;
            }
            case "admin_delete_candidate": {
                adminOnly(user);
                if (!season) throw new HttpError(409, "Нет активного сезона");
                const candidateId = Number(body.candidateId);
                if (!Number.isSafeInteger(candidateId) || candidateId < 1) throw new HttpError(400, "Некорректный персонаж");
                // Both votes and comments are removed atomically by ON DELETE CASCADE.
                const deleted = await db(`candidates?id=eq.${candidateId}&season_id=eq.${season.id}`, { method: "DELETE", prefer: "return=representation" });
                if (!deleted.length) throw new HttpError(404, "Персонаж уже удалён или не относится к этому сезону");
                break;
            }
            case "admin_update_candidate": {
                adminOnly(user);
                if (!season) throw new HttpError(409, "Нет активного сезона");
                const candidateId = Number(body.candidateId);
                if (!Number.isSafeInteger(candidateId) || candidateId < 1) throw new HttpError(400, "Некорректный персонаж");
                const current = await db(`candidates?id=eq.${candidateId}&season_id=eq.${season.id}&removed=eq.false&select=id,name,normalized_key`);
                if (!current.length) throw new HttpError(404, "Персонаж не найден в этом сезоне");
                const name = clean(body.name, 80); const universe = clean(body.universe, 80);
                if (name.length < 2 || universe.length < 2) throw new HttpError(400, "Заполни имя персонажа и вселенную");
                const key = canonical(name);
                if (key !== current[0].normalized_key) await validateEditedName(season.id, name, candidateId);
                const updated = await db(`candidates?id=eq.${candidateId}&season_id=eq.${season.id}&removed=eq.false`, {
                    method: "PATCH",
                    body: { name, universe, image_url: validMedia(body.image_url), description: clean(body.description, 600), normalized_key: key },
                    prefer: "return=representation",
                });
                if (!updated.length) throw new HttpError(404, "Не удалось обновить персонажа");
                break;
            }
            case "admin_add_candidate": {
                adminOnly(user);
                if (!season) throw new HttpError(409, "Нет активного сезона");
                const category = clean(body.category, 20);
                if (category !== "lemonz") throw new HttpError(400, "Администратор может добавить только вариант LEMONZ");
                const existing = await db(`candidates?season_id=eq.${season.id}&category=eq.lemonz&removed=eq.false&select=id`);
                if (existing.length >= 3) throw new HttpError(409, "В категории LEMONZ уже три персонажа");
                const name = clean(body.name, 80); const universe = clean(body.universe, 80);
                if (name.length < 2 || universe.length < 2) throw new HttpError(400, "Заполни имя персонажа и вселенную");
                const key = await validateEditedName(season.id, name);
                await db("candidates", {
                    method: "POST",
                    body: { season_id: season.id, category, name, universe, image_url: validMedia(body.image_url), description: clean(body.description, 600), normalized_key: key },
                    prefer: "return=minimal",
                });
                break;
            }
            case "admin_set_season_dates": {
                adminOnly(user);
                if (!season) throw new HttpError(409, "Нет активного сезона");
                const start = new Date(body.startsAt).getTime();
                const end = new Date(body.endsAt).getTime();
                if (!Number.isFinite(start) || !Number.isFinite(end)) throw new HttpError(400, "Укажи начало и окончание голосования");
                if (end <= Date.now() + 60000) throw new HttpError(400, "Окончание должно быть минимум через минуту");
                const duration = end - start;
                if (duration < 15 * 60000 || duration > 90 * 86400000) throw new HttpError(400, "Выбери период от 15 минут до 90 дней");
                const updated = await db(`seasons?id=eq.${season.id}&status=eq.active`, {
                    method: "PATCH",
                    body: { starts_at: new Date(start).toISOString(), ends_at: new Date(end).toISOString() },
                    prefer: "return=representation",
                });
                if (!updated.length) throw new HttpError(409, "Сезон уже изменён. Обнови страницу");
                break;
            }
            case "admin_delete_comment": {
                adminOnly(user);
                await db(`comments?id=eq.${Number(body.commentId)}`, { method: "DELETE", prefer: "return=minimal" });
                break;
            }
            case "admin_choices": {
                adminOnly(user);
                const choices = body.choices;
                if (!season || !Array.isArray(choices) || choices.length !== 3) throw new HttpError(400, "Укажите ровно три персонажа");
                const prepared = choices.map((choice) => ({ name: clean(choice.name, 80), universe: clean(choice.universe, 80), image_url: validMedia(choice.image_url), normalized_key: canonical(choice.name) }));
                if (prepared.some((choice) => !choice.name || !choice.universe || !choice.normalized_key)) throw new HttpError(400, "Заполни имена и вселенные");
                await db("rpc/set_lemonz_choices", { method: "POST", body: { p_choices: prepared } });
                break;
            }
            case "admin_next_season": {
                adminOnly(user);
                await db("rpc/advance_season", { method: "POST", body: { p_force: true } });
                break;
            }
            case "admin_block_user": {
                adminOnly(user);
                const userId = Number(body.userId);
                if (!Number.isSafeInteger(userId) || userId < 1) throw new HttpError(400, "Некорректный Telegram ID");
                await db("community_bans", { method: "POST", body: { user_id: userId, reason: "Ручная блокировка администратора" }, prefer: "resolution=merge-duplicates,return=minimal" });
                if (season) await db(`votes?season_id=eq.${season.id}&user_id=eq.${userId}`, { method: "DELETE", prefer: "return=minimal" });
                break;
            }
            case "admin_unblock_user": {
                adminOnly(user);
                const userId = Number(body.userId);
                if (!Number.isSafeInteger(userId) || userId < 1) throw new HttpError(400, "Некорректный Telegram ID");
                await db(`community_bans?user_id=eq.${userId}`, { method: "DELETE", prefer: "return=minimal" });
                break;
            }
            case "admin_redeem_discount": {
                adminOnly(user);
                const userId = Number(body.userId);
                const code = clean(body.code, 40).toUpperCase();
                if (!Number.isSafeInteger(userId) || userId < 1 || !code) throw new HttpError(400, "Укажи Telegram ID и код скидки");
                await db("rpc/redeem_winner_discount", { method: "POST", body: { p_user: userId, p_code: code } });
                break;
            }
            default: throw new HttpError(400, "Неизвестная операция");
        }
        return response.status(200).json({ ok: true });
    } catch (error) { errorResponse(response, error); }
}
