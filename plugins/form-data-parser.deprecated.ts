"use strict";

import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest, FastifySchema } from "fastify";
import busboy = require("busboy");
import { Busboy, Limits, FileInfo } from "busboy";

interface Dictionary extends Object {
	[key: string | symbol]: any;
}
interface RouteSchemaMap {
	[key: string]: FastifySchema | undefined;
}
interface FormDataParserPluginOptions extends Limits, FastifyPluginOptions {}
type FormDataParserPlugin = (instance: FastifyInstance, opts: FormDataParserPluginOptions, done: (err?: Error) => void) => void;
declare module "fastify" {
	interface FastifyRequest {
		__files__?: Array<Dictionary>;
	}
}

const formDataParser: FormDataParserPlugin & Dictionary = (instance: FastifyInstance, options: FormDataParserPluginOptions) => {
	const instanceSchemas: RouteSchemaMap = {};
	const parseFields = (schemaBody: Dictionary, requestBody: Dictionary) => {
		const schemaProps = schemaBody["properties"];
		for (const key of Object.keys(requestBody)) {
			const value = requestBody[key];
			const valueType = typeof value;
			const valueSchemaType = schemaProps[key]["type"];
			if (valueType !== valueSchemaType) {
				const isValueTypeString = valueType === "string";
				switch (valueSchemaType) {
					case "object":
						requestBody[key] = JSON.parse(value);
					case "array":
						if (isValueTypeString) {
							requestBody[key] = JSON.parse(value);
						}
						break;
					case "number":
						requestBody[key] = parseFloat(value);
						break;
					case "integer":
						if (isValueTypeString) {
							requestBody[key] = parseInt(value);
						}
						break;
					case "boolean":
						requestBody[key] = Boolean(value);
						break;
					case "string":
						requestBody[key] = JSON.stringify(value);
						break;
					case "null":
						requestBody[key] = null;
						break;
					default:
						break;
				}
			}
		}
		return requestBody;
	};
	instance.addContentTypeParser("multipart/form-data", (request, message, done) => {
		const bus = busboy({ headers: message.headers });
		const formData: Dictionary = {};
		bus.on("file", (fieldName: string, file: Busboy, fileInfo: FileInfo) => {
			const chunks: Array<Uint8Array> = [];
			const fileObject: Dictionary = {};
			fileObject.fieldName = fieldName;
			fileObject.fileName = fileInfo.filename;
			fileObject.encoding = fileInfo.encoding;
			fileObject.mimeType = fileInfo.mimeType;
			file.on("data", data => chunks.push(data));
			file.on("close", () => {
				fileObject.data = Buffer.concat(chunks);
			});
		});
		bus.on("field", (fieldName, fieldValue) => {
			formData[fieldName] = fieldValue;
		});
		bus.on("close", () => {
			done(null, formData);
		});
		message.pipe(bus);
	});
	instance.addHook("onRoute", async routeOptions => {
		instanceSchemas[routeOptions.url] = routeOptions.schema;
	});
	instance.addHook("preValidation", async (request: FastifyRequest, reply: FastifyReply) => {
		const schema = instanceSchemas[request.url] as FastifySchema;
		if (schema) {
			const schemaBody = schema.body as Dictionary;
			const bodyType = schemaBody?.type as string;
			if ((schema.consumes as Array<string>).some(x => x === "multipart/form-data") && bodyType === "object") {
				request.body = parseFields(schemaBody, request.body as Dictionary);
			}
		}
	});
};
formDataParser[Symbol.for("skip-override")] = true;

export default formDataParser;