/// <reference types="@vitest/browser/providers/playwright" />
import { describe, expect, test } from 'vitest';

import { decryptString, encryptString, generateRandomUrlSafeString } from './client/web-crypto';

describe('Create secret', () => {
	test('Simple encryption', async () => {
		const secret = 'Very secret message! 🤫';
		const password = generateRandomUrlSafeString();

		const encryptedSecret = await encryptString(secret, password);

		expect(encryptedSecret).toBeTypeOf('string');

		const decryptedString = await decryptString(encryptedSecret, password);

		expect(decryptedString).toEqual(secret);
	});

	test('Double encryption with user password', async () => {
		const secret = 'Very secret message! 🤫';
		const userPassword = 'superpass';

		const encryptedSecretWithUserPassword = await encryptString(secret, userPassword);

		expect(encryptedSecretWithUserPassword).toBeTypeOf('string');

		// const decryptedString = await decryptString(encryptedSecret, masterKey);
		// const decryptedStringWithUserPassword = await decryptString(decryptedString, userPassword);

		// expect(decryptedStringWithUserPassword).toEqual(secret);
	});
});
