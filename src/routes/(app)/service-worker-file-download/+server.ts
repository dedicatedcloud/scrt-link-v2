import { error } from '@sveltejs/kit';

export function GET() {
	throw error(404, 'This route does not exist');
}
