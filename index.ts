"use strict";

import fastify, { FastifyInstance, FastifyRequest, FastifyReply, RouteOptions, FastifyPluginOptions, HookHandlerDoneFunction } from "fastify";
import { FastifySchema } from "fastify";
import multer, { memoryStorage } from "fastify-multer";
import { File } from "fastify-multer/lib/interfaces";

const isProdEnv = process.env.NODE_ENV === "production";
if (!isProdEnv) {
	require("dotenv").config();
}
const uploadMediaFile = multer({
	limits: {
		fileSize: 1024 * 1024 * 5
	},
	storage: memoryStorage()
}).single("media");
const server: FastifyInstance = fastify();
server.register(multer.contentParser).after(() => {
	if (!isProdEnv) {
		server.register(require("@fastify/swagger"), {
			routePrefix: "/swagger",
			exposeRoute: true,
			openapi: {
				info: {
					title: "Fastify Upload",
					version: "1.0.0"
				}
			}
		});
	}
	server.register(
		(instance: FastifyInstance, options: FastifyPluginOptions, next: HookHandlerDoneFunction) => {
			instance.post(
				"/create",
				{
					schema: {
						consumes: ["multipart/form-data"],
						body: {
							content: {
								type: "string"
							},
							media: {
								type: "string",
								format: "binary"
							}
						}
					} as unknown as FastifySchema,
					preHandler: uploadMediaFile
				},
				(request: FastifyRequest, reply: FastifyReply) => {
					const content = (request.body as any).content as string;
					const file = (request as any).file as File;
					if (file) {
						delete file.buffer;
					}
					reply.send({
						content,
						file: JSON.stringify(file) || "No file selected"
					});
				}
			);
			next();
		},
		{ prefix: "/posts" }
	);
});
server.setErrorHandler((err: any, request: FastifyRequest, reply: FastifyReply) => {
	request.log.error(err.toString());
	reply.status(reply.statusCode || 500).send(err);
});
server.listen(
	{
		port: +(process.env.PORT || "3072"),
		host: process.env.HOST || "127.0.0.1"
	},
	(err, address) => {
		if (err) {
			console.log(err.message);
			process.exit(1);
		}
		console.log(`Listening on ${address}`);
	}
);