// Adapts Netlify handler format → Vercel req/res format
module.exports = function adapt(netlifyHandler) {
  return async (req, res) => {
    const event = {
      httpMethod: req.method,
      queryStringParameters: req.query || {},
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}),
    }
    const result = await netlifyHandler(event)
    Object.entries(result.headers || {}).forEach(([k, v]) => res.setHeader(k, v))
    res.status(result.statusCode || 200).end(result.body || '')
  }
}
