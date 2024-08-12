import kleur from "kleur";

export interface LogAttributes {
	[index: string]: unknown;
}

export interface StructuredLog extends LogAttributes {
	// (required) The content of the log
	msg: string;

	// Severity of the log
	level: "debug" | "info" | "warn" | "error";
}

const logger = (level: StructuredLog["level"], color: kleur.Color) => (msg: string, attributes?: LogAttributes) => {
	if (Bun.env.NODE_ENV === "production") {
		console.log(JSON.stringify({ msg, level, ...attributes }));
	} else {
		const str = `[${color(level).padEnd(5, " ")}] ${msg}`;
		if (level === "error") {
			// for some reason, console.error is causing the first character to be red
			// kleur.reset seems to fix this
			console.error(kleur.reset(str));
		} else {
			console.log(str);
		}
	}
};

export default {
	debug: logger("debug", kleur.blue),
	info: logger("info", kleur.white),
	warn: logger("warn", kleur.yellow),
	error: logger("error", kleur.red),
};
