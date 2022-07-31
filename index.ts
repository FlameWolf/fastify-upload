"use strict";

import { FormDataParserPlugin, File, Dictionary } from "./lib/types";
import { Readable } from "stream";
import { StreamStorage } from "./StreamStorage";
import * as busboy from "busboy";

const formDataParser: FormDataParserPlugin = async (instance, options) => {
	instance.addContentTypeParser("multipart/form-data", (request, message, done) => {
		const files: Array<File> = [];
		const body: Dictionary = {};
		const props = (request.context as Dictionary).schema?.body?.properties;
		const bus = busboy({ headers: message.headers, limits: options?.limits });
		bus.on("file", (name: string, stream: Readable, info: busboy.FileInfo) => {
			files.push((options.storage || new StreamStorage()).process(name, stream, info));
			body[name] = JSON.stringify(info);
		});
		bus.on("field", (name, value) => {
			if (props && props[name]?.type !== "string") {
				try {
					body[name] = JSON.parse(value);
					return;
				} catch (err) {}
			}
			body[name] = value;
		});
		bus.on("close", () => {
			request.__files__ = files;
			done(null, body);
		});
		bus.on("error", (error: Error) => {
			done(error);
		});
		message.pipe(bus);
	});
	instance.addHook("preHandler", async (request, reply) => {
		const body = request.body as Dictionary;
		const files = request.__files__ as Array<File>;
		if (files?.length) {
			for (const fileObject of files) {
				const field = fileObject.field as string;
				delete fileObject.field;
				body[field] = fileObject;
			}
		}
		delete request.__files__;
	});
};
formDataParser[Symbol.for("skip-override")] = true;

export default formDataParser;