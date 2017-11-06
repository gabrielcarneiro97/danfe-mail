const fs = require('fs'),
	fullDir = process.env.fullDir || './';

var log = '';

process.on('message', m => {
	if(m.type === 'log'){
		let date = new Date().toLocaleString();
		let string = `[${date}] #(${m.data.seq}):${m.data.name} -> NOVA NOTA ADICIONADA\n`;
		log += string;
		fs.write(fullDir + 'log.txt', string);
		console.log(string);
	}
})