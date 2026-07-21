const https = require('https');
const http = require('http');

const urls = [
    'https://dwisma.faruqadvmikhmon.my.id',
    'https://proxmox.dwisma.id',
    'https://idrac.dwisma.id',
    'https://n8n.dwisma.id',
    'https://npm.dwisma.id',
    'https://rdp.dwisma.id',
    'https://lulus.dwisma.id',
    'https://spmb.dwisma.id',
    'https://dapodik.dwisma.id',
    'https://simatik.dwisma.id',
    'https://cbt.dwisma.id',
    'https://rapor.dwisma.id',
    'https://snpmb.dwisma.id',
    'https://galeri.dwisma.id',
    'https://elearning.dwisma.id',
    'https://pdf.dwisma.id',
    'https://simapel.dwisma.id',
    'https://gamesosiologi.dwisma.id',
    'https://sosiologi.dwisma.id',
    'https://websejarah.dwisma.id',
    'https://sispala.dwisma.id',
    'https://informatika.dwisma.id',
    'https://guru.kemendikdasmen.go.id/',
    'https://simpeg.baliprov.go.id',
    'https://sikepo.baliprov.go.id',
    'https://kelasvirtual.baliprov.go.id/',
    'https://myasn.bkn.go.id',
    'https://info.gtk.kemendikdasmen.go.id/',
    'https://paspor-gtk.simpkb.id/',
    'https://ptk.datadik.kemendikdasmen.go.id/',
    'https://sman2mengwi.sch.id'
];

function checkUrl(url) {
    return new Promise((resolve) => {
        const client = url.startsWith('https') ? https : http;
        const options = {
            timeout: 6000,
            rejectUnauthorized: false, // Don't fail on self-signed certs (e.g. Proxmox/iDRAC)
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        };

        const req = client.get(url, options, (res) => {
            resolve({
                url,
                status: 'ONLINE',
                statusCode: res.statusCode,
                headers: res.headers
            });
        });

        req.on('error', (err) => {
            resolve({
                url,
                status: 'OFFLINE',
                error: err.message
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                url,
                status: 'OFFLINE',
                error: 'TIMEOUT'
            });
        });
    });
}

async function run() {
    console.log('Starting URL ping test...');
    const results = [];
    for (const url of urls) {
        const result = await checkUrl(url);
        results.push(result);
        console.log(`${result.url}: ${result.status} ${result.statusCode ? `(HTTP ${result.statusCode})` : `(${result.error})`}`);
    }
    console.log('Test completed.');
}

run();
