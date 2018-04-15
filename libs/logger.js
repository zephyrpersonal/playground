module.exports = (...args) => {
  if (process.env.DEBUG === 'verbose') {
    return log.apply(console, args)
  }
  return
}
