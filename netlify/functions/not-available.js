const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

exports.handler = async () => ({
  statusCode: 200,
  headers: CORS,
  body: JSON.stringify({ error: 'This feature requires the local server (BSCpro access). Run npm run dev on the host machine.' }),
})
