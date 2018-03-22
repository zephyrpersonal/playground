const { createServer } = require('http')
const { createReadStream } = require('fs')
const { parse } = require('url')

const server = createServer((req, res) => {
  const { path } = parse(req.url)
  switch (true) {
    case path.startsWith('/example'):
      const rs = createReadStream(
        `assets/${path.replace('/example/', '')}.html`
      )
      rs.on('error', () => {
        res.writeHead(404)
        res.end('no html')
      })
      rs.pipe(res)
      break
    case path === '/':
      createReadStream('assets/index.html').pipe(res)
      break
    case path === '/testsse':
      res.writeHead(200, { 'Content-Type': 'text/event-stream' })
      res.write('retry: 1000\n')
      res.write(`data: ${Date.now()}\n\n`)
      setInterval(() => {
        res.write(`data: ${Date.now()}\n\n`)
      }, 1000)
      break
    default:
      res.writeHead(404)
      res.end('not found 1')
  }
})

server.listen(8002)

console.log('server listen on 8002')
