import { Elysia } from "elysia";
import log from "./log";

const BANNED_SET = new Set(["dependabot[bot]"]);

const app = new Elysia();

app.onError(({ code, error }) => {
	log.error(error.toString(), { code, error });
});

app.get("/", () => "ok");

app.post("/api/webhooks/*", async ({ request, path }) => {
	const payload = await request.json();

	if (BANNED_SET.has(payload?.pull_request?.user?.login) || BANNED_SET.has(payload?.head_commit?.author?.name)) {
		log.info("Blocked request", { payload });
		return "";
	}

	const method = request.method;

	const headers = new Headers(request.headers);
	headers.delete("host");

	const body = JSON.stringify(payload);

	const newRequest = new Request(`https://discord.com${path}`, { method, headers, body });

	log.info("Forwarded request", { payload, request: newRequest });

	return fetch(newRequest);
});

app.listen(Bun.env.PORT || 8080);

log.debug(`Server is running on port ${app.server?.port}`);
