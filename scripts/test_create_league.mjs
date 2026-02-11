import { createLeague } from '../src/lib/actions.ts';

async function test() {
    console.log('Testing createLeague with Postgres...');
    try {
        const res = await createLeague(`BugTest ${Date.now()}`, 'admin', 'join');
        console.log('Result:', res);
    } catch (err) {
        console.error('Test Failed:', err);
    }
}

test();
