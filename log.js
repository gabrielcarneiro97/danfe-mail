const fs = require('fs')
const fullDir = process.env.fullDir || './notas/'
const file = fullDir + 'log.txt'

var exports = module.exports = {}

exports.add = (data, seq) => {
  seq = seq || '00000'

  let date = new Date().toLocaleString()

  let string = `(#${seq})[${date}]:${data}\r\n`

  fs.appendFileSync(file, string)
  
  console.log(string)
}
