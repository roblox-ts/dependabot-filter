import { Elysia } from "elysia";
import log from "./log";

const BANNED_SET = new Set(["dependabot[bot]"]);

const app = new Elysia();

app.get("/", () => "ok");

app.post("/api/webhooks/*", async ({ request, path }) => {
	const payload = await request.json();

	if (BANNED_SET.has(payload?.pull_request?.user?.login) || BANNED_SET.has(payload?.head_commit?.author?.name)) {
		log.info("Blocked request", { payload });
		return "";
	}

	log.info("Forwarded request", { payload });

	const { mode } = request;

	const body = await Bun.readableStreamToArrayBuffer(request.body ?? new ReadableStream());

	const headers = new Headers(request.headers);
	headers.delete("host");

	const newRequest = new Request(`https://discord.com${path}`, { mode, headers, body });

	log.info("Forwarding request", { request: newRequest });

	return fetch(newRequest);
});

app.listen(Bun.env.PORT || 8080);

log.debug(`Server is running on port ${app.server?.port}`);
