import fetch from 'node-fetch'
import { createParser } from "eventsource-parser";

const OPENAI_API_KEY = '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'

export const config = {
  runtime: 'edge',
};

export default async function handler(request, response) {
	console.log('request: ', request.body.messages);

	const encoder = new TextEncoder();
  const decoder = new TextDecoder();


	const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${OPENAI_API_KEY ?? ""}`,
		},
		method: "POST",
		body: request.body,
	}).catch(err => {
		console.log('err: ', err);
	})

	console.log('gptRes:======== ', gptRes);
	if (!gptRes.ok) {
		return
	}

	const stream = new ReadableStream({
		async start(controller) {
			function onParse(event) {
				if (event.type === "event") {
					const data = event.data;
					if (data === "[DONE]") {
						controller.close();
						return;
					}
					const json = JSON.parse(data);
					const text = json.choices[0].delta.content;
					const queue = encoder.encode(text);
					controller.enqueue(queue);
				}
			}

			const parser = createParser(onParse);
			for await (const chunk of gptRes.body) {
				parser.feed(decoder.decode(chunk, {
					stream: true
				}));
			}
		},
	});

	const headers = new Headers({
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, GET, PUT, DELETE, OPTIONS",
		"Access-Control-Allow-Headers": "token",
		"Content-Type": "text/html; charset=utf-8"
	});

	return new Response(stream, {
		headers
	})
}

