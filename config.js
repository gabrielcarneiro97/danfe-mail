module.exports = {
  consts: {
    email: process.env.email,
    password: process.env.passEmail,
    fullDir: process.env.fullDir || './notas/',
    checkNum: 10,
    interval: parseInt(process.env.nftime) || 1000,
    imap: {
      user: process.env.email,
      password: process.env.passEmail,
      host: 'imap.gmail.com',
      port: 993,
      tls: true
    }
  }
}
