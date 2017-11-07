const fs = require('fs'),
	fullDir = process.env.fullDir || './notas/',
	file = fullDir + 'log.txt';

var exports = module.exports = {};


exports.add = (data, seq) => {

	seq = seq || 00000;

	let date = new Date().toLocaleString();

	let string = `(#${seq})[${date}]:${data}\r\n`;

	fs.appendFileSync(file, string);

	console.log(string);
}
