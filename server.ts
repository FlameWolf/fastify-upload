"use strict";

import fastify, { FastifyInstance, FastifyRequest, FastifyReply, FastifyPluginOptions } from "fastify";
import fastifySwagger from "@fastify/swagger";
import formDataParser from "./index";
import cloudinary = require("cloudinary");
import { FileInternal } from "./FileInternal";
import { BufferStorage } from "./BufferStorage";
import { StreamStorage } from "./StreamStorage";
import { DiscStorage } from "./DiscStorage";
import { CallbackStorage } from "./CallbackStorage";

const isProdEnv = process.env.NODE_ENV === "production";
if (!isProdEnv) {
	require("dotenv").config();
}
cloudinary.v2.config({
	cloud_name: process.env.CLOUD_BUCKET,
	api_key: process.env.CLOUD_API_KEY,
	api_secret: process.env.CLOUD_API_SECRET
});
const postCreateSchema = {
	consumes: ["multipart/form-data"],
	body: {
		type: "object",
		properties: {
			content: {
				type: "string"
			},
			media: {
				type: "string",
				format: "binary"
			},
			poll: {
				type: "object",
				properties: {
					first: { type: "string" },
					second: { type: "string" }
				},
				required: ["first", "second"]
			}
		}
	}
};
const server: FastifyInstance = fastify({ logger: true });
if (!isProdEnv) {
	server.register(fastifySwagger, {
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
server.get("/", async (request, reply) => {
	reply.redirect("/swagger");
});
server.register(formDataParser, {
	storage: new CallbackStorage((name, stream, info) => {
		return new Promise((resolve, reject) => {
			const file = new FileInternal(name, info);
			var uploader = cloudinary.v2.uploader.upload_stream((err, res) => {
				if (err) {
					reject(err);
				}
				file.path = res?.secure_url;
				resolve(file);
			});
			stream.pipe(uploader);
		});
	})
});
server.register(
	async (instance: FastifyInstance, options: FastifyPluginOptions) => {
		instance.post(
			"/create",
			{
				schema: postCreateSchema
			},
			(request: FastifyRequest, reply: FastifyReply) => {
				reply.status(200).send(request.body);
			}
		);
	},
	{ prefix: "/posts" }
);
server.setErrorHandler((err: Error, request: FastifyRequest, reply: FastifyReply) => {
	request.log.error(err.toString());
	console.error(err.stack);
	reply.status(reply.statusCode || 500).send(err);
});
server.listen(
	{
		port: +(process.env.PORT || "2048"),
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