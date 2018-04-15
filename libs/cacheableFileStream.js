const { createReadStream } = require('fs')
const { Transform, Readable } = require('stream')
const cacheStore = new Map()

module.exports = function createCacheableStream(options = {}) {
  const store = options.store || cacheStore

  return (path, onError) => {
    const cached = getCache(store, path)
    const handleErrorWrapper = handleError(onError)

    if (cached) {
      return handleErrorWrapper(createCachedStream(cached))
    }

    let _buffers = []

    let transform = new Transform({
      transform(chunk, encoding, callback) {
        _buffers.push(Buffer.isBuffer(chunk) ? chunk : new Buffer(chunk, encoding))
        callback(null, chunk)
      },
      flush(callback) {
        store.set(path, _buffers)
        _buffers = null
        callback()
        transform = null
      }
    })

    const rs = handleErrorWrapper(createReadStream(path))

    return handleErrorWrapper(rs.pipe(transform))
  }
}

function getCache(store, path) {
  return store.get(path)
}

function handleError(onError) {
  return stream => stream.on('error', onError || console.error)
}

function createCachedStream(cached) {
  let current = 0
  let rs = new Readable({
    read() {
      if (current === cached.length) {
        this.push(null)
        rs = null
        return
      }
      this.push(cached[current])
      current++
    }
  })
  return rs
}
