const inspect = require('util').inspect,
	fs      = require('fs'),
	base64  = require('base64-stream'),
  Imap    = require('imap'),
  quotedPrintable = require('quoted-printable'),
  log = require("./log"),
  consts = require("./config").consts,
  password = consts.password,
  fullDir = consts.fullDir,
  email = consts.email,
  checkNum = consts.checkNum,
  imap = new Imap(consts.imap);


function findAttachmentParts(struct, attachments) {
  attachments = attachments || [];
  for (let i = 0, len = struct.length, r; i < len; ++i) {
    if (Array.isArray(struct[i])) {
      findAttachmentParts(struct[i], attachments);
    } else {
      if (struct[i].disposition && ['INLINE', 'ATTACHMENT'].indexOf(struct[i].disposition.type) > -1) {
        attachments.push(struct[i]);
      }
    }
  }
  return attachments;
}

imap.once('ready', function() {
  //Trocar para 'INBOX' caso queira que o check seja feito na caixa de entrada.
  imap.openBox('Notas2', true, function(err, box) {
    let total = box.messages.total;
    
    let checkUntil = total - checkNum <= 0 ? 1 : total - checkNum;

    if (err) throw err;
    //Para verificar toda a caixa trocar `${total}:${checkUntil}` para "*"
    var f = imap.seq.fetch(`${total}:${checkUntil}` , {
      bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
      struct: true
    });

    f.on('message', function (msg, seqno) {

      let prefix = '(#' + seqno + ') ',
        //Inicializa o diretório, caso o diretório não seja passado, fica sendo uma pasta chamada notas no diretório raiz.
        dir = './notas',
        //Inicializa o array de anexos.
        attachments = [],
        //Inicializa alguns atributos básicos, como número da nota e nome da empresa.
        num = undefined,
        name = undefined,
        attrs = undefined;

      msg.on('body', function(stream, info) {
        let buffer = '';
        stream.on('data', function(chunk) {
          buffer += chunk.toString('utf8');
        });

        stream.once('end', function() {
          let str = Imap.parseHeader(buffer).subject[0];

          if(str.startsWith('Altimus -')) {
 			name = str.split('Altimus - Notas fiscais emitidas da empresa ')[1].split(' , referentes ao período de ')[0];
          	str = str.split('referentes ao período de ')[1].replace(/\//g, '-').replace(' à ', ' ');
          }
          else {
			str = Imap.parseHeader(buffer).subject[0].split('Nota Fiscal número ')[1].split('emitida por ');
			//Pega o nome da empresa que está no assunto do e-mail.
			name = str[1];
			//Pega o número da nota que está no assunto do e-mail.
			num = str[0];
			
          }

			//Concatena o diretório.
			dir = fullDir + name;
           
          log.add(JSON.stringify(Imap.parseHeader(buffer)), seqno);
        });
      });

      msg.once('attributes', function(a) {
        attrs = a;
        //Encontra os anexos na mensagem.
        attachments = findAttachmentParts(attrs.struct);
      });

      msg.once('end', function() {

        for (let i = 0, len=attachments.length ; i < len; ++i) {
          let attachment = attachments[i];
          /*This is how each attachment looks like {
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
          var f = imap.fetch(attrs.uid , {
            bodies: [attachment.partID],
            struct: true
          });

          let filename = attachment.params.name,
            encoding = attachment.encoding;

          //Processa os anexos da mensagem.
          f.on('message', function (msg, seqno) {

            if(!fs.existsSync(dir)) fs.mkdirSync(dir);

            msg.on('body', function(stream, info) {
              //Create a write stream so that we can stream the attachment to file;
              var writeStream = fs.createWriteStream(dir + "/" + filename);
              writeStream.on('finish', function() {
                log.add('Done writing to file ' + filename, seqno);
              });

              //stream.pipe(writeStream); this would write base64 data to the file.
              //so we decode during streaming using 
              if (encoding === 'BASE64') {
                //the stream is base64 encoded, so here the stream is decode on the fly and piped to the write stream (file)
                stream.pipe(base64.decode()).pipe(writeStream);
              } 
              else  {
                //here we have none or some other decoding streamed directly to the file which renders it useless probably
                stream.pipe(writeStream);
              }
            });

            msg.once('end', function() {

              //Confere se o nome contém a série da nota, se sim, ele pega o número da nota da série.
              if(filename.length > 8){
                num = filename.slice(28, 37);
              }
              
              //Troca o nome do arquivo da série para o número.
              if(filename.endsWith('.pdf') && fs.statSync(dir + "/" + filename).size > 0){                
                fs.renameSync(dir + "/" + filename, dir + "/" + num + ".pdf");
                log.add(`Renamed ${filename} to ${num}.pdf`, seqno);
              }

              if(filename.endsWith('.xml')){
                fs.writeFile(dir + '/' + num + '.xml', quotedPrintable.decode(fs.readFileSync(dir + "/" + filename, 'utf8')),
                  () => {
                    log.add(`Copied from ${filename} to ${num}.xml`, seqno);
                });
        
              }

              if(filename.endsWith('.zip')){

              }

              log.add('Finished attachment ' + filename, seqno);
            });
          });

        }
        log.add('Finished email', seqno);
      });
    });

    f.once('error', function(err) {
      log.add('Fetch error: ' + err);
    });
    f.once('end', function() {
      log.add('Done fetching all messages!');
      imap.end();
    });
  });
});

imap.once('error', function(err) {
  console.log(err);
});

imap.once('end', function() {
  console.log('Connection ended');
  process.send({type: 'killme'});
});


imap.connect();
