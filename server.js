const { createServer } = require('http')
const { createReadStream } = require('fs')
const { parse } = require('url')
const cluster = require('cluster')
const cpuCount = require('os').cpus().length

const server = createServer((req, res) => {
  const { path } = parse(req.url)
  console.log(`Worker ${process.pid} hit`)
  switch (true) {
    case path === '/':
      createReadStream('assets/index.html').pipe(res)
      break
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
    case path === '/testsse':
      res.writeHead(200, { 'Content-Type': 'text/event-stream' })
      res.write('retry: 1000\n')
      res.write(`data: ${Date.now()}\n\n`)
      let n = 0
      const interval = setInterval(() => {
        res.write(`data: ${Date.now()}\n\n`)
        n++
        if (n >= 10) throw new Error(123)
      }, 1000)
      res.on('error', e => {
        res.end(e)
      })
      res.on('close', () => {
        console.log(`closed at ${new Date().toLocaleTimeString()}`)
        clearInterval(interval)
      })
      break
    case path === '/terminate':
      process.exit(1)
      break
    case path.startsWith('/message'):
      const cmd = path.replace('/message/', '')
      process.send({ cmd })
      res.end(`${cmd}`)
      break
    default:
      res.writeHead(404)
      res.end('not found 1')
  }
})

if (cluster.isMaster) {
  console.log(`master ${process.pid} is running`)
  for (let i = 0; i < cpuCount; i++) {
    cluster.fork()
  }

  cluster.on('message', (worker, msg) => {
    console.log(
      `worker ${worker.process.pid} send message: ${JSON.stringify(msg)}`
    )
  })

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`)
  })
} else {
  server.listen(8002)
  console.log(`Worker started at ${process.pid} listen on 8002`)
}
