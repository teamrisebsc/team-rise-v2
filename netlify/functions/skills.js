const skillsData = require('./skills-data.json')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

exports.handler = async () => {
  const skills = Object.entries(skillsData).map(([id, val]) => ({
    id,
    name: val.name,
    file: id + '.md',
  }))
  return { statusCode: 200, headers: CORS, body: JSON.stringify({ skills }) }
}
