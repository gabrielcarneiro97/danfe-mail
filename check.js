const Buffer = require('buffer').Buffer
const fs = require('fs')
const base64 = require('base64-stream')
const Imap = require('imap')
const log = require('./log')
const consts = require('./config').consts
const fullDir = consts.fullDir
const checkNum = consts.checkNum
const imap = new Imap(consts.imap)
const boxName = 'Notas'

let removeZeroBuffer = dataIn => {
  let arr = []

  dataIn.forEach((val, index) => {
    if (val !== 0) {
      arr.push(val)
    }
  })

  return Buffer.from(arr)
}

function findAttachmentParts (struct, attachments) {
  attachments = attachments || []
  for (let i = 0, len = struct.length; i < len; ++i) {
    if (Array.isArray(struct[i])) {
      findAttachmentParts(struct[i], attachments)
    } else {
      if (struct[i].disposition && ['INLINE', 'ATTACHMENT'].indexOf(struct[i].disposition.type) > -1) {
        attachments.push(struct[i])
      }
    }
  }
  return attachments
}

imap.once('ready', function () {
  //  Trocar para 'INBOX' caso queira que o check seja feito na caixa de entrada.
  imap.openBox(boxName, true, function (err, box) {
    let total = box.messages.total

    let checkUntil = total - checkNum <= 0 ? 1 : total - checkNum

    if (err) throw err
    //  Para verificar toda a caixa trocar `${total}:${checkUntil}` para `${total}:*` 527
    var f = imap.seq.fetch(`${total}:${checkUntil}`, {
      bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
      struct: true
    })

    f.on('message', (msg, seqno) => {
        //  Inicializa o diretório, caso o diretório não seja passado, fica sendo uma pasta chamada notas no diretório raiz.
      let dir = './notas'
        //  Inicializa o array de anexos.
      let attachments = []
        //  Inicializa alguns atributos básicos, como número da nota e nome da empresa.
      let num
      let name
      let attrs

      msg.on('body', function (stream, info) {
        let buffer = ''
        stream.on('data', function (chunk) {
          buffer += chunk.toString('utf8')
        })

        stream.once('end', function () {
          //  Pega o nome da empresa que está no assunto do e-mail.
          name = Imap.parseHeader(buffer).subject[0].split(' - ')[2]
          //  Pega o número da nota que está no assunto do e-mail.
          num = Imap.parseHeader(buffer).subject[0].split(' - ')[1]
          //  Concatena o diretório.
          dir = fullDir + name
          log.add(JSON.stringify(Imap.parseHeader(buffer)), seqno)
        })
      })

      msg.once('attributes', a => {
        attrs = a
        //  Encontra os anexos na mensagem.
        attachments = findAttachmentParts(attrs.struct)
      })

      msg.once('end', () => {
        for (let i = 0, len = attachments.length; i < len; ++i) {
          let attachment = attachments[i]
          /*  This is how each attachment looks like {
              partID: '2',
              type: 'application',
              subtype: 'octet-stream',
              params: { name: 'file-name.ext' },
              id: null,
              description: null,
              encoding: 'BASE64',
              size: 44952,
              md5: null,
              disposition: { type: 'ATTACHMENT', params: { filename: 'file-name.ext' } },
              language: null
            }
          */
          var f = imap.fetch(attrs.uid, {
            bodies: [attachment.partID],
            struct: true
          })

          let filename = attachment.params.name
          let encoding = attachment.encoding
          //  Processa os anexos da mensagem.
          f.on('message', (msg, seqno) => {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir)

            msg.on('body', (stream, info) => {
              //  Create a write stream so that we can stream the attachment to file;
              var writeStream = fs.createWriteStream(dir + '/' + filename)
              writeStream.on('finish', () => {
                //  Confere se o nome contém a série da nota, se sim, ele pega o número da nota da série.
                if (fs.statSync(dir + '/' + filename).size > 0) {
                  if (filename.length > 8) {
                    num = filename.slice(25, 34)
                  }
                  //  Troca o nome do arquivo da série para o número.
                  if (filename.endsWith('.pdf')) {
                    fs.renameSync(dir + '/' + filename, dir + '/' + num + '.pdf')
                    log.add(`Renamed ${filename} to ${num}.pdf`, seqno)
                  }
                  if (filename.endsWith('.xml')) {
                    let buffer = fs.readFileSync(dir + '/' + filename)
                    buffer = removeZeroBuffer(buffer)

                    fs.writeFile(dir + '/' + num + '.xml', buffer, () => {
                      fs.unlink(dir + '/' + filename, () => {
                        log.add(`Copied from ${filename} to ${num}.xml`, seqno)
                      })
                    })
                  }
                  log.add('Done writing to file ' + filename, seqno)
                }
              })

              //  stream.pipe(writeStream); this would write base64 data to the file.
              //  so we decode during streaming using
              if (encoding === 'BASE64') {
                //  the stream is base64 encoded, so here the stream is decode on the fly and piped to the write stream (file)
                stream.pipe(base64.decode()).pipe(writeStream)
              } else {
                //  here we have none or some other decoding streamed directly to the file which renders it useless probably
                stream.pipe(writeStream)
              }
            })

            msg.once('end', () => {
              log.add('Finished attachment ' + filename, seqno)
            })
          })
        }
        log.add('Finished email', seqno)
      })
    })

    f.once('error', function (err) {
      log.add('Fetch error: ' + err)
    })
    f.once('end', function () {
      log.add('Done fetching all messages!')
      imap.end()
    })
  })
})

imap.once('error', function (err) {
  console.log(err)
})

imap.once('end', function () {
  console.log('Connection ended')
  process.send({ type: 'killme' })
})

imap.connect()
