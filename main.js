const cp = require('child_process'),
	timers = require('timers');
	
var last = '';

var invoke = () => {
	var check = cp.fork('./check.js', [], [ 'pipe', 'pipe', 'pipe', 'ipc' ]);
	check.send({type: 'last', data: last});
	check.on('message', m => {
		if(m.type === 'seq'){
			last = m.data.seq;
		}
		if(m.type === 'killme')
			check.kill('SIGINT')
	})
}

invoke();
timers.setInterval(invoke, 60000)

