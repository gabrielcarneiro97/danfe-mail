const cp = require('child_process')
const timers = require('timers')
const consts = require('./config').consts
const interval = consts.interval // Define o intervalo como 60 segundos.

var invoke = () => {
  // Inicializa o processo filho onde acontecerá o check da caixa direcionada.
  var check = cp.fork('./check.js', [], [ 'pipe', 'pipe', 'pipe', 'ipc' ])
  check.on('message', m => {
    // Recebe mensagem para matar o processo filho.
    if (m.type === 'killme') {
      check.kill('SIGINT')
    }
  })
  var check2 = cp.fork('./check2.js', [], [ 'pipe', 'pipe', 'pipe', 'ipc' ])
  check2.on('message', m => {
    // Recebe mensagem para matar o processo filho.
    if (m.type === 'killme') {
      check2.kill('SIGINT')
    }
  })
}

// Invoca o metodo de check uma vez.
invoke()
// Chama a função a cada minuto.
timers.setInterval(invoke, interval * 1000)
