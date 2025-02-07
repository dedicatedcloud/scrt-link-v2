/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = self as unknown as ServiceWorkerGlobalScope;

import type { SecretFile } from './lib/file-transfer';
import { handleFileChunksDownload } from './lib/file-transfer';

// Request URL we intercept to initiate stream
const DOWNLOAD_URL = /\/api\/v1\/service-worker-file-download\/([\w-]{1,128})/;
const map = new Map();

sw.addEventListener('install', (event) => {
	event.waitUntil(sw.skipWaiting());
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(sw.clients.claim()); // Become available to all pages
});

async function decryptStream(uuid: string) {
	const file: SecretFile = map.get(uuid);

	if (!file) {
		return new Response(null, { status: 400 });
	}

	try {
		const responseHeaders = {
			'Content-Disposition': `attachment; filename="${
				encodeURIComponent(file.name) ?? 'secret-file.bin'
			}"`,
			'Content-Type': file.mimeType ?? 'application/octet-stream'
		};

		const responseStream = handleFileChunksDownload(file);

		return new Response(responseStream, { headers: responseHeaders });
	} catch (e) {
		const errorResponse = new Response(
			`<html>
        <title>Download error</title>
        <body>
          <h1>We're sorry, but something went terribly wrong.</h1>
          <h2>Error</h2>
          <pre>${encodeHTML(e)}</pre>
          <h2>Stack trace</h2>
          <pre>${encodeHTML((e as Error).stack)}</pre>
        </body>
      </html>`,
			{ status: 400 }
		);

		errorResponse.headers.append('Content-Type', 'text/html; charset=UTF-8');

		errorResponse.headers.append(
			'Content-Security-Policy',
			"default-src 'none'; " +
				"base-uri 'none'; " +
				"form-action 'none'; " +
				"frame-ancestors 'none'; " +
				"navigate-to 'none'"
		);

		return errorResponse;
	}
}

function encodeHTML(input: unknown): string {
	if (!input || typeof input.toString !== 'function') {
		return '';
	}

	return input
		.toString()
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/'/g, '&#39;')
		.replace(/"/g, '&quot;');
}

sw.onfetch = (event: FetchEvent) => {
	const req = event.request;

	if (req.method !== 'GET') {
		return;
	}

	const url = new URL(req.url);
	const fileNameMatch = DOWNLOAD_URL.exec(url.pathname);

	if (fileNameMatch) {
		event.respondWith(decryptStream(fileNameMatch[1]));
	}
	return;
};

type MessageData = SecretFile;

sw.onmessage = async (event: ExtendableMessageEvent) => {
	const request = event.data.request;
	const data = event.data.data as MessageData;

	switch (request) {
		case 'file_info': {
			map.set(data.secretIdHash, data);
			event.ports[0].postMessage('File info received.');
			break;
		}
		case 'progress': {
			const file = map.get(data?.secretIdHash);

			if (!file?.progress) {
				event.ports[0].postMessage(0);
				return;
			}

			event.ports[0].postMessage(file.progress);
			break;
		}

		default:
			break;
	}
};
