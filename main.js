const cp = require('child_process'),
	timers = require('timers'),
	time = 60; //Define o intervalo como 60 segundos.
	
var invoke = () => {
	//Inicializa o processo filho onde acontecerá o check da caixa direcionada.
	var check = cp.fork('./check.js', [], [ 'pipe', 'pipe', 'pipe', 'ipc' ]);
	check.send({type: 'last', data: last});
	check.on('message', m => {
		//Recebe mensagem para matar o processo filho.
		if(m.type === 'killme')
			check.kill('SIGINT')
	})
}

//Invoca o metodo de check uma vez.
invoke();
//Chama a função a cada minuto.
timers.setInterval(invoke, time * 1000);

