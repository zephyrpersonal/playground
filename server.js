const { createServer } = require('http')
const { createReadStream } = require('fs')
const { parse } = require('url')
const cluster = require('cluster')
const cpuCount = require('os').cpus().length
const createCacheableStream = require('./libs/cacheableFileStream')

const logger = require('./libs/logger')
const getCacheableFileStream = createCacheableStream()

const server = createServer((req, res) => {
  const { path } = parse(req.url)
  logger(`Worker ${process.pid} hit`)
  switch (true) {
    case path === '/':
      console.time(`start`)
      res.setHeader('Cache-Control', 'max-age=999999')
      res.setHeader('Content-Type', 'text/html')
      getCacheableFileStream(`views/index.html`).pipe(res)
      console.timeEnd(`start`)
      break
    case path.startsWith('/example'):
      getCacheableFileStream(`views/${path.replace('/example/', '')}.html`, () => {
        res.writeHead(404)
        res.end('no html')
      }).pipe(res)
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
      res
        .on('error', e => {
          res.end(e)
        })
        .on('close', () => {
          logger(`closed at ${new Date().toLocaleTimeString()}`)
          clearInterval(interval)
        })
      break
    case path.startsWith('/message'):
      const cmd = path.replace('/message/', '')
      process.send({ cmd })
      res.end(`${cmd}`)
      break
    default:
      res.writeHead(404)
      res.end('not found')
  }
})

if (cluster.isMaster && process.argv[2] > 0) {
  logger(`master ${process.pid} is running`)
  for (let i = 0; i < cpuCount; i++) {
    cluster.fork()
  }

  cluster.on('message', (worker, msg) => {
    logger(`worker ${worker.process.pid} send message: ${JSON.stringify(msg)}`)
  })

  cluster.on('exit', (worker, code, signal) => {
    logger(`worker ${worker.process.pid} died`)
  })
} else {
  server.listen(8002)
  logger(`Worker started at ${process.pid} listen on 8002`)
}
