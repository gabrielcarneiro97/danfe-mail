const inspect = require('util').inspect,
	fs      = require('fs'),
	base64  = require('base64-stream'),
	Imap    = require('imap'),
	password = process.env.passEmail,
	fullDir = process.env.fullDir || './notas/',
	email = process.env.email;

function findAttachmentParts(struct, attachments) {
  attachments = attachments ||  [];
  for (var i = 0, len = struct.length, r; i < len; ++i) {
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

var imap = new Imap({
  user: email,
  password: password,
  host: 'imap.gmail.com',
  port: 993,
  tls: true
});

imap.once('ready', function() {
  imap.openBox('Notas', true, function(err, box) {
    let total = box.messages.total;
    
    if (err) throw err;

    var f = imap.seq.fetch(`*:1` , {
      bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
      struct: true
    });

    f.on('message', function (msg, seqno) {

      let prefix = '(#' + seqno + ') ';
      let dir = './notas';
      let attachments = [];
      let num = undefined;
      let name = undefined;
      let attrs = undefined;

      msg.on('body', function(stream, info) {
        var buffer = '';
        stream.on('data', function(chunk) {
          buffer += chunk.toString('utf8');
        });

        stream.once('end', function() {
          name = Imap.parseHeader(buffer).subject[0].split(" - ")[2];
          num = Imap.parseHeader(buffer).subject[0].split(" - ")[1];
          dir = fullDir + name;
          console.log(Imap.parseHeader(buffer))
        });
      });

      msg.once('attributes', function(a) {
        attrs = a;
        attachments = findAttachmentParts(attrs.struct);
      });

      msg.once('end', function() {

        for (var i = 0, len=attachments.length ; i < len; ++i) {
          var attachment = attachments[i];
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
          let filename = attachment.params.name;
          let encoding = attachment.encoding;
          //build function to process attachment message
          f.on('message', function (msg, seqno) {

            if(!fs.existsSync(dir)) fs.mkdirSync(dir);

            var prefix = '(#' + seqno + ') ';

            msg.on('body', function(stream, info) {
              //Create a write stream so that we can stream the attachment to file;
              console.log(prefix + 'Streaming this attachment to file', filename, info);
              var writeStream = fs.createWriteStream(dir + "/" + filename);
              writeStream.on('finish', function() {
                console.log(prefix + 'Done writing to file %s', filename);
              });

              //stream.pipe(writeStream); this would write base64 data to the file.
              //so we decode during streaming using 
              if (encoding === 'BASE64') {
                //the stream is base64 encoded, so here the stream is decode on the fly and piped to the write stream (file)
                stream.pipe(base64.decode()).pipe(writeStream);
              } else  {
                //here we have none or some other decoding streamed directly to the file which renders it useless probably
                stream.pipe(writeStream);
              }
            });

            msg.once('end', function() {
              console.log(dir + "/" + filename)
              console.log(dir + "/" + num + ".pdf")
              if(filename.endsWith('.pdf'))
                fs.renameSync(dir + "/" + filename, dir + "/" + num + ".pdf")
              if(filename.endsWith('.xml'))
                fs.renameSync(dir + "/" + filename, dir + "/" + num + ".xml")

              console.log(prefix + 'Finished attachment %s', filename);
            });
          });

        }
        console.log(prefix + 'Finished email');
      });
    });

    f.once('error', function(err) {
      console.log('Fetch error: ' + err);
    });
    f.once('end', function() {
      console.log('Done fetching all messages!');
      imap.end();
    });
  });
});

imap.once('error', function(err) {
  console.log(err);
});

imap.once('end', function() {
  console.log('Connection ended');
  process.send({type: 'killme'})
});


imap.connect();
